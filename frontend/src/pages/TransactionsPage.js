import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Search, X, Calendar as CalendarIcon,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  SlidersHorizontal, Filter, Pencil, Wallet,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { cn, getInitials } from "../lib/utils";
import { formatCurrency } from "../lib/currency";
import { useApp } from "../context/AppContext";
import { TransactionItem } from "../components/TransactionItem";
import { TransactionModal } from "../components/modals/TransactionModal";
import { AccountModal } from "../components/modals/AccountModal";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { getTransactionsPaginated, getTransactionsCount } from "../lib/db";
import { format } from "date-fns";
import { de, enUS, es, fr, it } from "date-fns/locale";
import { toast } from "sonner";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE = 350;
const READ_TIMEOUT = 6000;

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('read timed out')), ms)),
]);

const dateLocales = { de, en: enUS, es, fr, it };
function PaginationControls({ currentPage, totalPages, totalCount, onPageChange, isLoading, language, t }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col items-center gap-2 py-4 px-4" data-testid="pagination-controls">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          data-testid="pagination-first"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          data-testid="pagination-prev"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {getPageNumbers().map((page, i) =>
          page === '...' ? (
            <span key={`dot-${i}`} className="px-1 text-muted-foreground text-sm">...</span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 text-xs"
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              data-testid={`pagination-page-${page}`}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          data-testid="pagination-next"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading}
          data-testid="pagination-last"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>

      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {(t.showingResults || 'Zeige {start}-{end} von {total}')
            .replace('{start}', ((currentPage - 1) * PAGE_SIZE + 1))
            .replace('{end}', Math.min(currentPage * PAGE_SIZE, totalCount))
            .replace('{total}', totalCount)
          }
        </p>
      )}
    </div>
  );
}
export function TransactionsPage({ onBack, budgetId = null, onSelectBudget }) {
  const {
    t, settings, accounts, transactions: ctxTransactions,
    isDemo, user, budgets, totalBalance,
    getBudgetById, createTransaction, updateTransaction, deleteTransaction,
  } = useApp();

  const viewingBudget = budgetId ? getBudgetById(budgetId) : null;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterDate, setFilterDate] = useState(null);
  const [showUntagged, setShowUntagged] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [fbTransactions, setFbTransactions] = useState([]);
  const [fbCursors, setFbCursors] = useState({});
  const [fbTotal, setFbTotal] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const searchInputRef = useRef(null);
  const locale = dateLocales[settings.language] || de;
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
    setFbCursors({});
  }, [debouncedSearch, filterDate, showUntagged, budgetId]);
  const localFiltered = useMemo(() => {
    let txs = [...ctxTransactions];
    if (budgetId) txs = txs.filter(tx => tx.budget_id === budgetId);
    else if (showUntagged) txs = txs.filter(tx => !tx.budget_id);
    if (debouncedSearch.trim()) txs = txs.filter(tx => (tx.name || '').toLowerCase().includes(debouncedSearch.trim().toLowerCase()));
    if (filterDate) {
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setDate(startOfNextDay.getDate() + 1);
      txs = txs.filter(tx => {
        const d = new Date(tx.date);
        return d >= startOfDay && d < startOfNextDay;
      });
    }
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [ctxTransactions, budgetId, showUntagged, debouncedSearch, filterDate]);

  const demoTotalPages = Math.max(1, Math.ceil(localFiltered.length / PAGE_SIZE));
  const demoPageTxs = useMemo(() =>
    localFiltered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [localFiltered, currentPage]
  );
  const localFilteredRef = useRef(localFiltered);
  localFilteredRef.current = localFiltered;
  const fbCursorsRef = useRef(fbCursors);
  fbCursorsRef.current = fbCursors;
  const requestSeqRef = useRef(0);
  const loadFbPage = useCallback(async (page, cursors = null, silent = false) => {
    if (!user) return;
    const requestId = ++requestSeqRef.current;
    const isCurrent = () => requestId === requestSeqRef.current;
    const activeCursors = cursors || fbCursorsRef.current;
    if (!silent) setIsLoadingPage(true);
    try {
      const cursor = page > 1 ? activeCursors[page - 1] : null;
      const result = await withTimeout(getTransactionsPaginated(user.uid, {
        budgetId,
        showUntagged,
        filterDate,
        pageSize: PAGE_SIZE,
        page,
        cursor,
        searchQuery: debouncedSearch,
      }), READ_TIMEOUT);

      if (!isCurrent()) return;

      const mapped = result.transactions.map(tx => ({
        ...tx,
        transaction_type: tx.transactionType || tx.transaction_type || 'expense',
        account_id: tx.accountId || tx.account_id || '',
        budget_id: tx.budgetId !== undefined ? tx.budgetId : (tx.budget_id || null),
      }));

      setFbTransactions(mapped);
      if (result.lastCursor) {
        setFbCursors(prev => ({ ...prev, [page]: result.lastCursor }));
      }
      setCurrentPage(page);
      if (page === 1 && !debouncedSearch) {
        getTransactionsCount(user.uid, { budgetId, showUntagged, filterDate }).then(count => {
          if (count >= 0) setFbTotal(count);
        }).catch(() => {});
      }
      if (result.totalForSearch !== null) setFbTotal(result.totalForSearch);
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Error loading transactions page:', error);
      const fallback = localFilteredRef.current;
      setFbTransactions(fallback.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
      setFbTotal(fallback.length);
      setCurrentPage(page);
      if (!silent && fallback.length === 0) toast.error(t.errorOccurred);
    } finally {
      if (!silent && isCurrent()) setIsLoadingPage(false);
    }
  }, [user, budgetId, showUntagged, filterDate, debouncedSearch, t]);
  useEffect(() => {
    if (!isDemo && user) {
      const newCursors = {};
      setFbCursors(newCursors);
      loadFbPage(1, newCursors);
    }
  }, [isDemo, user, budgetId, showUntagged, filterDate, debouncedSearch, loadFbPage]);
  const displayTransactions = isDemo ? demoPageTxs : fbTransactions;
  const totalPages = isDemo ? demoTotalPages : (fbTotal > 0 ? Math.max(1, Math.ceil(fbTotal / PAGE_SIZE)) : (isLoadingPage ? 1 : currentPage + (fbTransactions.length === PAGE_SIZE ? 1 : 0)));
  const totalCount = isDemo ? localFiltered.length : fbTotal;
  const grouped = useMemo(() => {
    const groups = {};
    displayTransactions.forEach(tx => {
      const key = new Date(tx.date).toDateString();
      if (!groups[key]) groups[key] = { date: tx.date, txs: [] };
      groups[key].txs.push(tx);
    });
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [displayTransactions]);

  const formatDateHeader = (dateStr) => new Intl.DateTimeFormat(
    settings.language === 'en' ? 'en-US' : `${settings.language}-${settings.language.toUpperCase()}`,
    { weekday: 'long', day: 'numeric', month: 'long' }
  ).format(new Date(dateStr));

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    if (isDemo) {
      setCurrentPage(page);
    } else {
      if (page > currentPage) {
        loadFbPage(page);
      } else {
        const newCursors = {};
        setFbCursors(newCursors);
        if (page === 1) {
          loadFbPage(1, newCursors);
        } else {
          loadFbPage(1, newCursors);
          setCurrentPage(1);
        }
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTransactionClick = (tx) => {
    setEditingTx(tx);
    setShowModal(true);
  };

  const handleAddTransaction = () => {
    setEditingTx(null);
    setShowModal(true);
  };

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterDate(null);
    setShowUntagged(false);
    setIsSearchOpen(false);
  };

  const hasActiveFilters = searchQuery || filterDate || showUntagged;

  const pageTitle = viewingBudget ? viewingBudget.name : (showUntagged ? t.untaggedTransactions : t.transactions);

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="transactions-page">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="transactions-back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-heading font-semibold text-foreground truncate">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearAllFilters} data-testid="clear-filters-btn" className="text-destructive">
                <X className="w-4 h-4" />
              </Button>
            )}
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant={filterDate ? "default" : "ghost"}
                  size="icon"
                  data-testid="date-filter-btn"
                  className="relative"
                >
                  <CalendarIcon className="w-4 h-4" />
                  {filterDate && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="end">
                <div className="p-2">
                  <p className="text-xs text-muted-foreground px-2 pb-2">{t.filterByDate || 'Nach Datum filtern'}</p>
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={(date) => { setFilterDate(date || null); setIsDatePickerOpen(false); }}
                    disabled={(date) => date > new Date()}
                    locale={locale}
                    initialFocus
                  />
                  {filterDate && (
                    <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => { setFilterDate(null); setIsDatePickerOpen(false); }}>
                      <X className="w-3 h-3 mr-1" />
                      {t.clearFilters || 'Filter zurücksetzen'}
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant={isSearchOpen ? "default" : "ghost"}
              size="icon"
              onClick={handleSearchToggle}
              data-testid="search-toggle-btn"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="px-4 py-2 relative">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder || 'Suchen...'}
                  className="pl-9 h-9"
                  data-testid="search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-7 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!budgetId && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => { setShowUntagged(false); setCurrentPage(1); }}
              className={cn(
                "text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors",
                !showUntagged
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              data-testid="filter-all-btn"
            >
              {t.allTransactions || 'Alle'}
            </button>
            <button
              onClick={() => { setShowUntagged(true); setCurrentPage(1); }}
              className={cn(
                "text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors",
                showUntagged
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              data-testid="filter-untagged-btn"
            >
              {t.untaggedTransactions || 'Ohne Budget'}
            </button>
            {budgets.filter(b => ctxTransactions.some(tx => tx.budget_id === b.id)).slice(0, 5).map(b => (
              <button
                key={b.id}
                onClick={() => onSelectBudget?.(b.id)}
                className="text-xs px-3 py-1 rounded-full whitespace-nowrap bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1.5"
              >
                {b.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />}
                {b.name}
              </button>
            ))}
          </div>
        )}

        {(filterDate || searchQuery) && (
          <div className="flex gap-2 px-4 pb-2 flex-wrap">
            {filterDate && (
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                <CalendarIcon className="w-3 h-3" />
                {format(filterDate, 'dd.MM.yyyy')}
                <button onClick={() => setFilterDate(null)}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                <Search className="w-3 h-3" />
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {!budgetId && (
          <div className="p-4 border-b border-border">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {accounts.map((account) => (
                <motion.button
                  key={account.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setEditingAccount(account); setShowAccountModal(true); }}
                  className="flex-shrink-0 min-w-[140px] p-3 rounded-xl bg-card border border-border relative text-left active:scale-95 transition-transform"
                  data-testid={`account-card-${account.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: account.color || '#0f392b' }}
                    >
                      {getInitials(account.name)}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{account.name}</span>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {formatCurrency(account.balance, settings.currency)}
                  </p>
                </motion.button>
              ))}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => { setEditingAccount(null); setShowAccountModal(true); }}
                className="flex-shrink-0 min-w-[120px] p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2"
                data-testid="add-account-btn"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t.newAccount}</span>
              </motion.button>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-muted/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.totalBalance}</p>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {formatCurrency(totalBalance, settings.currency)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!budgetId && displayTransactions.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t.transactions} ({totalCount})
            </h2>
          </div>
        )}

        {isLoadingPage ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
          </div>
        ) : displayTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">
              {t.noTransactionsFound || 'Keine Transaktionen gefunden'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>
                {t.clearFilters || 'Filter zurücksetzen'}
              </Button>
            )}
          </div>
        ) : (
          <div className="px-4 pt-2">
            {grouped.map((group) => (
              <div key={group.date} className="mb-4">
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {formatDateHeader(group.date)}
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {group.txs.map(tx => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      onClick={() => handleTransactionClick(tx)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoadingPage && totalCount > PAGE_SIZE && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            isLoading={isLoadingPage}
            language={settings.language}
            t={t}
          />
        )}
      </main>

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleAddTransaction}
        className={cn(
          "glass-fab fixed bottom-6 right-6 z-30",
          "w-16 h-16 rounded-full",
          "text-foreground",
          "flex items-center justify-center"
        )}
        data-testid="add-transaction-fab"
      >
        <Plus className="w-8 h-8" strokeWidth={3} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.18))" }} />
      </motion.button>

      <TransactionModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            if (!isDemo && user) {
              const freshCursors = {};
              setFbCursors(freshCursors);
              loadFbPage(1, freshCursors, true);
            }
          }
        }}
        transaction={editingTx}
        defaultAccountId={accounts[0]?.id}
        lockedBudgetId={budgetId}
        oldTransactionOverride={editingTx}
      />

      <AccountModal
        open={showAccountModal}
        onOpenChange={setShowAccountModal}
        account={editingAccount}
      />
    </div>
  );
}

export default TransactionsPage;
