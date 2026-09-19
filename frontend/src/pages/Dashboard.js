import React, { useState, useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Settings,
  Pencil,
  ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { formatCurrency } from "../lib/currency";
import { useApp } from "../context/AppContext";
import { BudgetReorderList } from "../components/BudgetReorderList";
import { TransactionItem } from "../components/TransactionItem";
import { TransactionModal } from "../components/modals/TransactionModal";
import { AccountModal } from "../components/modals/AccountModal";
import { BudgetModal } from "../components/modals/BudgetModal";
import { RedistributionModal } from "../components/modals/RedistributionModal";
import { AnimatedNumber } from "../components/AnimatedNumber";

let savedScrollTop = 0;

export function Dashboard({ onNavigateToSettings, onNavigateToTransactions, onNavigateToBudgetTransactions }) {
  const {
    t,
    settings,
    accounts,
    totalBalance,
    expenseBudgets,
    accumulatingBudgets,
    expenseBudgetsTotal,
    accumulatingBudgetsTotal,
    transactions,
    reorderBudgets,
    isDemo,
  } = useApp();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [budgetModalType, setBudgetModalType] = useState("expense");
  const [isEditMode, setIsEditMode] = useState(false);
  const [redistributingBudgetId, setRedistributingBudgetId] = useState(null);
  const DEMO_TRANSACTION_LIMIT = 10;
  const DASHBOARD_RECENT_LIMIT = 5;
  
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, DASHBOARD_RECENT_LIMIT);
  
  const handleAccountClick = () => {
    if (accounts.length === 0) {
      setEditingAccount(null);
      setShowAccountModal(true);
    } else {
      onNavigateToTransactions?.();
    }
  };
  
  const handleAddBudget = (type) => {
    if (accounts.length === 0) {
      setEditingAccount(null);
      setShowAccountModal(true);
      return;
    }
    setBudgetModalType(type);
    setEditingBudget(null);
    setShowBudgetModal(true);
  };
  
  const handleBudgetClick = (budget) => {
    if (isEditMode) {
      setEditingBudget(budget);
      setBudgetModalType(budget.budget_type);
      setShowBudgetModal(true);
    } else {
      onNavigateToBudgetTransactions?.(budget.id);
    }
  };
  
  const redistributingBudget = expenseBudgets.find((b) => b.id === redistributingBudgetId) || null;

  const handleRedistribute = (budget) => {
    setRedistributingBudgetId(budget.id);
  };

  const handleTransactionClick = (tx) => {
    setEditingTransaction(tx);
    setShowTransactionModal(true);
  };

  const scrollRef = useRef(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = savedScrollTop;
    const retry = requestAnimationFrame(() => { el.scrollTop = savedScrollTop; });
    const onScroll = () => { savedScrollTop = el.scrollTop; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(retry);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      <main ref={scrollRef} className="h-[100dvh] overflow-y-auto">
        <header className="glass glass-header sticky top-0 z-20 border-b" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm text-muted-foreground">{t.welcome}</p>
              <h1 className="text-xl font-heading font-semibold text-foreground">
                {settings.displayName}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn(isEditMode && "bg-primary text-primary-foreground")}
                data-testid="edit-mode-btn"
              >
                <Pencil className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigateToSettings}
                data-testid="settings-btn"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[22px] p-5 bg-gradient-to-br from-[#0d5c43] to-[#0f7a58] text-white cursor-pointer"
            style={{
              boxShadow:
                '0 18px 34px -12px rgba(13, 92, 67, 0.60), 0 6px 14px -6px rgba(13, 92, 67, 0.40)',
            }}
            onClick={handleAccountClick}
            data-testid="total-balance-card"
          >
            <p className="text-sm font-medium text-white/70">
              {t.totalBalance}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              <AnimatedNumber
                value={totalBalance}
                from={0}
                format={(v) => formatCurrency(v, settings.currency)}
                duration={500}
              />
            </p>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/70">
              {accounts.length === 0 ? (
                <span>{t.noAccounts}</span>
              ) : (
                <span className="flex items-center">
                  {accounts.length} {accounts.length === 1 ? t.account : t.accounts}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </span>
              )}
              <span className="flex items-baseline gap-1.5">
                <span>{t.budgets}</span>
                <span className="tabular-nums font-medium text-white">
                  <AnimatedNumber
                    value={(expenseBudgetsTotal || 0) + (accumulatingBudgetsTotal || 0)}
                    from={0}
                    format={(v) => formatCurrency(v, settings.currency)}
                    duration={500}
                  />
                </span>
              </span>
            </div>
          </motion.div>
          
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-heading font-semibold text-foreground">
                {t.expenseBudgets}
              </h2>
              <div className="flex items-center gap-1.5">
                {expenseBudgets.length > 0 && (
                  <span className="text-sm text-muted-foreground tabular-nums text-right w-20" data-testid="expense-budgets-total">
                    <AnimatedNumber
                      value={expenseBudgetsTotal}
                      from={0}
                      format={(v) => formatCurrency(v, settings.currency)}
                      duration={500}
                    />
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleAddBudget("expense")}
                  data-testid="add-expense-budget-btn"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {expenseBudgets.length === 0 ? (
              <div className="p-6 rounded-2xl border-2 border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">{t.noBudgets}</p>
              </div>
            ) : (
              <BudgetReorderList
                budgets={expenseBudgets}
                isEditMode={isEditMode}
                onOpen={handleBudgetClick}
                onRedistribute={handleRedistribute}
                onReorderCommit={reorderBudgets}
              />
            )}
          </section>
          
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-heading font-semibold text-foreground">
                {t.accumulatingBudgets}
              </h2>
              <div className="flex items-center gap-1.5">
                {accumulatingBudgets.length > 0 && (
                  <span className="text-sm text-muted-foreground tabular-nums text-right w-20" data-testid="accumulating-budgets-total">
                    <AnimatedNumber
                      value={accumulatingBudgetsTotal}
                      from={0}
                      format={(v) => formatCurrency(v, settings.currency)}
                      duration={500}
                    />
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleAddBudget("accumulating")}
                  data-testid="add-accumulating-budget-btn"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {accumulatingBudgets.length === 0 ? (
              <div className="p-6 rounded-2xl border-2 border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">{t.noBudgets}</p>
              </div>
            ) : (
              <BudgetReorderList
                budgets={accumulatingBudgets}
                isEditMode={isEditMode}
                onOpen={handleBudgetClick}
                onRedistribute={handleRedistribute}
                onReorderCommit={reorderBudgets}
              />
            )}
          </section>
          
          {recentTransactions.length > 0 && (
            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-heading font-semibold text-foreground">
                  {t.recentTransactions}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={onNavigateToTransactions}
                  data-testid="view-all-transactions-btn"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
                {recentTransactions.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onClick={() => handleTransactionClick(tx)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (accounts.length === 0) {
            setEditingAccount(null);
            setShowAccountModal(true);
          } else {
            setEditingTransaction(null);
            setShowTransactionModal(true);
          }
        }}
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
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
        transaction={editingTransaction}
        defaultAccountId={accounts[0]?.id}
      />
      
      <AccountModal
        open={showAccountModal}
        onOpenChange={setShowAccountModal}
        account={editingAccount}
      />
      
      <BudgetModal
        open={showBudgetModal}
        onOpenChange={setShowBudgetModal}
        budget={editingBudget}
        defaultType={budgetModalType}
        defaultAccountId={accounts[0]?.id}
      />

      <RedistributionModal
        open={Boolean(redistributingBudget)}
        onOpenChange={(open) => { if (!open) setRedistributingBudgetId(null); }}
        budget={redistributingBudget}
      />
    </div>
  );
}

export default Dashboard;
