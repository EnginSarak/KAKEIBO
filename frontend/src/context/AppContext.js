import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getTranslations } from '../lib/i18n';
import { onAuthChange, getUserSettings, updateUserSettings, logOut, resendVerificationEmail, reloadUser, defaultDisplayName, completeGoogleRedirect } from '../lib/auth';
import {
  subscribeToAccounts,
  subscribeToBudgets,
  subscribeToTransactions,
  createAccount as dbCreateAccount,
  updateAccount as dbUpdateAccount,
  deleteAccount as dbDeleteAccount,
  reorderAccounts as dbReorderAccounts,
  createBudget as dbCreateBudget,
  updateBudget as dbUpdateBudget,
  deleteBudget as dbDeleteBudget,
  reorderBudgets as dbReorderBudgets,
  resetBudget as dbResetBudget,
  createTransaction as dbCreateTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
  transactionUpdateDeltas,
  transactionCreateDeltas,
  transactionDeleteDeltas,
  redistributeRemainder as dbRedistributeRemainder,
  persistBudgetReset as dbPersistBudgetReset,
  updateBudgetCarryover as dbUpdateBudgetCarryover,
  subscribeToBankConnection,
  saveBankConnection as dbSaveBankConnection,
  clearBankConnection as dbClearBankConnection,
  getTransactionsSince,
  dismissBankRef,
  importBankTransactions,
} from '../lib/db';
import {
  AUTO_SYNC_INTERVAL_MS,
  dayOf,
  fetchBankTransactions,
  isBankSyncUser,
  pickBalance,
  readBankSession,
  selectNewTransactions,
  shiftDay,
  startBankConnect,
} from '../lib/bank';
import { generateId } from '../lib/utils';
import { isFirebaseConfigured } from '../lib/firebase';

const DEMO_TRANSACTION_LIMIT = 10;
const BANK_LOOKBACK_DAYS = 90;
const BANK_STARTUP_FLOOR_MS = 60 * 60 * 1000;
const BANK_RATE_LIMIT_PAUSE_MS = 6 * 60 * 60 * 1000;
const BANK_AUTO_SYNC_CHECK_MS = 15 * 60 * 1000;

const AppContext = createContext(null);

const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
const STORAGE_KEY = 'kakeibo_demo_data';
const SETTINGS_KEY = 'kakeibo_settings';

const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch { return defaultValue; }
};

const saveToStorage = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error('Failed to save to localStorage:', e); }
};
const toIsoDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') {
    try { return value.toDate().toISOString(); } catch { return ''; }
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  return '';
};

const mapBudget = (b) => ({
  ...b,
  budget_type: b.budgetType || b.budget_type || 'expense',
  account_id: b.accountId || b.account_id || '',
  start_date: toIsoDate(b.startDate || b.start_date),
  carried_over: b.carriedOver !== undefined ? b.carriedOver : (b.carried_over || 0),
  last_reset: toIsoDate(b.lastReset || b.last_reset),
  color: b.color || null,
  spent: b.spent !== undefined ? b.spent : 0,
});

const mapTransaction = (tx) => ({
  ...tx,
  transaction_type: tx.transactionType || tx.transaction_type || 'expense',
  account_id: tx.accountId || tx.account_id || '',
  budget_id: tx.budgetId !== undefined ? tx.budgetId : (tx.budget_id || null),
});

const ensureSnakeCaseTransaction = (tx) => ({
  ...tx,
  transaction_type: tx.transaction_type !== undefined ? tx.transaction_type : (tx.transactionType || 'expense'),
  account_id: tx.account_id !== undefined ? tx.account_id : (tx.accountId || ''),
  budget_id: tx.budget_id !== undefined ? tx.budget_id : (tx.budgetId || null),
});

const ensureSnakeCaseBudget = (b) => ({
  ...b,
  budget_type: b.budget_type !== undefined ? b.budget_type : (b.budgetType || 'expense'),
  account_id: b.account_id !== undefined ? b.account_id : (b.accountId || ''),
  start_date: b.start_date !== undefined ? b.start_date : (b.startDate || ''),
  carried_over: b.carried_over !== undefined ? b.carried_over : (b.carriedOver || 0),
  last_reset: b.last_reset !== undefined ? b.last_reset : (b.lastReset || ''),
  color: b.color || null,
  spent: b.spent !== undefined ? b.spent : 0,
});

const toFirestoreBudget = (data) => ({
  name: data.name,
  amount: data.amount,
  color: data.color || null,
  budgetType: data.budget_type || data.budgetType || 'expense',
  interval: data.interval,
  startDate: data.start_date || data.startDate || '',
  accountId: data.account_id || data.accountId || '',
});

const toFirestoreTransaction = (data) => ({
  amount: data.amount,
  transactionType: data.transaction_type || data.transactionType || 'expense',
  name: data.name || '...',
  budgetId: data.budget_id !== undefined ? data.budget_id : (data.budgetId || null),
  accountId: data.account_id || data.accountId || '',
  date: data.date || new Date().toISOString(),
  ...(data.needsReview !== undefined ? { needsReview: Boolean(data.needsReview) } : {}),
});

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [settings, setSettings] = useState(() => {
    const stored = loadFromStorage(SETTINGS_KEY, {});
    return {
      displayName: 'Demo User',
      email: '',
      language: stored.language || 'de',
      currency: stored.currency || 'EUR',
      theme: stored.theme || 'system',
    };
  });
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    saveToStorage(SETTINGS_KEY, {
      language: settings.language,
      currency: settings.currency,
      theme: settings.theme,
    });
  }, [settings.language, settings.currency, settings.theme]);

  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bankConnection, setBankConnection] = useState(null);
  const [bankSyncing, setBankSyncing] = useState(false);
  const [bankConnecting, setBankConnecting] = useState(false);
  const autoSyncRunning = useRef(false);
  const startupSyncDone = useRef(false);
  const bankReturnHandled = useRef(false);

  const t = getTranslations(settings.language);

  const bankSyncAvailable = !isDemo && !!user && isBankSyncUser(user);

  const resolvedTheme = settings.theme === 'system' ? systemTheme : settings.theme;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    const add = (content, media) => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'theme-color');
      if (media) m.setAttribute('media', media);
      m.setAttribute('content', content);
      document.head.appendChild(m);
    };
    if (settings.theme === 'system') {
      add('#f7f9fb', '(prefers-color-scheme: light)');
      add('#05060b', '(prefers-color-scheme: dark)');
    } else {
      add(resolvedTheme === 'dark' ? '#05060b' : '#f7f9fb');
    }
  }, [resolvedTheme, settings.theme]);

  const applyFirebaseUser = useCallback(async (firebaseUser) => {
    if (firebaseUser && firebaseUser.emailVerified) {
      setPendingVerificationEmail(null);
      const storedName = (stored) => (stored && stored !== 'Demo User') ? stored : '';
      const authName = storedName(firebaseUser.displayName);
      try {
        const userSettings = await getUserSettings(firebaseUser.uid);
        if (userSettings) {
          setSettings({
            displayName: defaultDisplayName(firebaseUser.email, storedName(userSettings.displayName) || authName),
            email: firebaseUser.email,
            language: userSettings.language || 'de',
            currency: userSettings.currency || 'EUR',
            theme: userSettings.theme || 'system',
          });
        } else {
          setSettings({
            displayName: defaultDisplayName(firebaseUser.email, authName),
            email: firebaseUser.email,
            language: 'de',
            currency: 'EUR',
            theme: 'system',
          });
        }
      } catch (error) {
        setSettings({
          displayName: defaultDisplayName(firebaseUser.email, authName),
          email: firebaseUser.email,
          language: 'de',
          currency: 'EUR',
          theme: 'system',
        });
      }
      setSettingsLoaded(true);
      setIsDemo(false);
      setUser(firebaseUser);
    } else if (firebaseUser && !firebaseUser.emailVerified) {
      setSettingsLoaded(false);
      setUser(null);
      setIsDemo(false);
      setPendingVerificationEmail(firebaseUser.email);
    } else {
      setSettingsLoaded(false);
      setUser(null);
      setPendingVerificationEmail(null);
      setIsDemo(true);
      const demoData = loadFromStorage(STORAGE_KEY, { accounts: [], budgets: [], transactions: [] });
      setAccounts(demoData.accounts || []);
      setBudgets((demoData.budgets || []).map(ensureSnakeCaseBudget));
      setTransactions((demoData.transactions || []).map(ensureSnakeCaseTransaction));
      setSettings(prev => ({
        ...prev,
        displayName: 'Demo User',
        email: '',
      }));
    }
    setAuthLoading(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      applyFirebaseUser(null);
      return;
    }
    completeGoogleRedirect().catch(() => {});
    const unsubscribe = onAuthChange((firebaseUser) => { applyFirebaseUser(firebaseUser); });
    return () => unsubscribe();
  }, [applyFirebaseUser]);

  useEffect(() => {
    if (!pendingVerificationEmail) return;
    const intervalId = setInterval(async () => {
      try {
        const refreshed = await reloadUser();
        if (refreshed && refreshed.emailVerified) applyFirebaseUser(refreshed);
      } catch {}
    }, 4000);
    return () => clearInterval(intervalId);
  }, [pendingVerificationEmail, applyFirebaseUser]);
  useEffect(() => {
    if (!user || isDemo) return;
    const unsubAccounts = subscribeToAccounts(user.uid, (data) => setAccounts(data));
    const unsubBudgets = subscribeToBudgets(user.uid, (data) => setBudgets(data.map(mapBudget)));
    const unsubTransactions = subscribeToTransactions(user.uid, (data) => setTransactions(data.map(mapTransaction)));
    return () => { unsubAccounts(); unsubBudgets(); unsubTransactions(); };
  }, [user, isDemo]);
  useEffect(() => {
    if (!bankSyncAvailable) { setBankConnection(null); return; }
    return subscribeToBankConnection(user.uid, (data) => setBankConnection(data));
  }, [bankSyncAvailable, user]);
  useEffect(() => {
    if (isDemo && !loading && !authLoading) {
      saveToStorage(STORAGE_KEY, { accounts, budgets, transactions });
    }
  }, [accounts, budgets, transactions, isDemo, loading, authLoading]);
  useEffect(() => {
    if (user && !isDemo && !authLoading && settingsLoaded) {
      updateUserSettings(user.uid, {
        language: settings.language,
        currency: settings.currency,
        theme: settings.theme,
        displayName: settings.displayName,
      }).catch(console.error);
    }
  }, [settings.language, settings.currency, settings.theme, settings.displayName, user, isDemo, authLoading, settingsLoaded]);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logOut();
      setAccounts([]);
      setBudgets([]);
      setTransactions([]);
    } catch (error) { console.error('Logout error:', error); }
  }, []);

  const checkVerificationNow = useCallback(async () => {
    const refreshed = await reloadUser();
    if (refreshed && refreshed.emailVerified) {
      await applyFirebaseUser(refreshed);
      return true;
    }
    return false;
  }, [applyFirebaseUser]);

  const resendVerification = useCallback(async () => {
    await resendVerificationEmail(settings.language);
  }, []);

  const createAccount = useCallback(async (data) => {
    if (isDemo) {
      const newAccount = {
        id: generateId(),
        user_id: 'demo',
        name: data.name,
        balance: data.balance || 0,
        color: data.color || '#0f392b',
        order: accounts.length,
        created_at: new Date().toISOString(),
      };
      setAccounts((prev) => [...prev, newAccount]);
      return newAccount;
    } else {
      return await dbCreateAccount(user.uid, { ...data, order: accounts.length });
    }
  }, [isDemo, user, accounts.length]);

  const updateAccount = useCallback(async (id, data) => {
    if (isDemo) {
      setAccounts((prev) => prev.map((acc) => acc.id === id ? { ...acc, ...data } : acc));
    } else {
      await dbUpdateAccount(user.uid, id, data);
    }
  }, [isDemo, user]);

  const deleteAccount = useCallback(async (id) => {
    if (isDemo) {
      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
      setBudgets((prev) => prev.filter((b) => b.account_id !== id));
      setTransactions((prev) => prev.filter((tx) => tx.account_id !== id));
    } else {
      await dbDeleteAccount(user.uid, id);
    }
  }, [isDemo, user]);

  const reorderAccounts = useCallback(async (accountIds) => {
    if (isDemo) {
      setAccounts((prev) =>
        accountIds.map((id, index) => {
          const account = prev.find((a) => a.id === id);
          return account ? { ...account, order: index } : null;
        }).filter(Boolean)
      );
    } else {
      await dbReorderAccounts(user.uid, accountIds);
    }
  }, [isDemo, user]);

  const createBudget = useCallback(async (data) => {
    if (isDemo) {
      const sameBudgets = budgets.filter((b) => b.budget_type === data.budget_type);
      const newBudget = {
        id: generateId(),
        user_id: 'demo',
        name: data.name,
        amount: data.amount,
        color: data.color || null,
        budget_type: data.budget_type || 'expense',
        interval: data.interval || 'monthly',
        start_date: data.start_date,
        account_id: data.account_id,
        spent: 0,
        carried_over: 0,
        order: sameBudgets.length,
        last_reset: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setBudgets((prev) => [...prev, newBudget]);
      return newBudget;
    } else {
      return await dbCreateBudget(user.uid, { ...toFirestoreBudget(data), order: budgets.length });
    }
  }, [isDemo, user, budgets]);

  const updateBudget = useCallback(async (id, data) => {
    if (isDemo) {
      setBudgets((prev) => prev.map((b) => b.id === id ? { ...b, ...data } : b));
    } else {
      await dbUpdateBudget(user.uid, id, toFirestoreBudget(data));
    }
  }, [isDemo, user]);

  const setBudgetCarryover = useCallback(async (id, carriedOver) => {
    const value = Number(carriedOver) || 0;
    if (isDemo) {
      setBudgets((prev) => prev.map((b) => b.id === id ? { ...b, carried_over: value } : b));
    } else {
      await dbUpdateBudgetCarryover(user.uid, id, value);
    }
  }, [isDemo, user]);

  const deleteBudget = useCallback(async (id) => {
    if (isDemo) {
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      setTransactions((prev) => prev.map((tx) => tx.budget_id === id ? { ...tx, budget_id: null } : tx));
    } else {
      await dbDeleteBudget(user.uid, id);
    }
  }, [isDemo, user]);

  const reorderBudgets = useCallback(async (budgetIds) => {
    if (isDemo) {
      setBudgets((prev) => prev.map((budget) => {
        const newOrder = budgetIds.indexOf(budget.id);
        return newOrder >= 0 ? { ...budget, order: newOrder } : budget;
      }));
    } else {
      await dbReorderBudgets(user.uid, budgetIds);
    }
  }, [isDemo, user]);

  const resetBudget = useCallback(async (id) => {
    const budget = budgets.find((b) => b.id === id);
    if (!budget) return;
    if (isDemo) {
      setBudgets((prev) => prev.map((b) => {
        if (b.id !== id) return b;
        const now = new Date().toISOString();
        if (b.budget_type === 'accumulating') {
          const remaining = b.amount - (b.spent || 0) + (b.carried_over || 0);
          return { ...b, spent: 0, carried_over: remaining, last_reset: now };
        }
        return { ...b, spent: 0, carried_over: 0, last_reset: now };
      }));
    } else {
      await dbResetBudget(user.uid, id, budget);
    }
  }, [isDemo, user, budgets]);

  const applyLedgerDeltas = useCallback(({ accounts: accountDeltas, budgets: budgetDeltas }) => {
    if (accountDeltas.size) {
      setAccounts((prev) => prev.map((acc) => (
        accountDeltas.has(acc.id)
          ? { ...acc, balance: (acc.balance || 0) + accountDeltas.get(acc.id) }
          : acc
      )));
    }
    if (budgetDeltas.size) {
      setBudgets((prev) => prev.map((b) => (
        budgetDeltas.has(b.id)
          ? { ...b, spent: (b.spent || 0) + budgetDeltas.get(b.id) }
          : b
      )));
    }
  }, []);

  const createTransaction = useCallback(async (data) => {
    const now = new Date().toISOString();
    if (isDemo) {
      if (transactions.length >= DEMO_TRANSACTION_LIMIT) {
        const t_current = getTranslations(settings.language);
        const { toast } = await import('sonner');
        toast.error(t_current.demoLimitReached, {
          action: { label: 'Registrieren', onClick: () => { window.location.href = '/signup'; } }
        });
        return null;
      }
      const newTransaction = {
        id: generateId(),
        user_id: 'demo',
        amount: data.amount,
        name: data.name || '...',
        created_at: now,
        transaction_type: data.transaction_type || data.transactionType || 'expense',
        account_id: data.account_id || data.accountId || '',
        budget_id: data.budget_id !== undefined ? data.budget_id : (data.budgetId || null),
        date: data.date || now,
      };

      setTransactions((prev) => [newTransaction, ...prev]);

      setAccounts((prev) => prev.map((acc) => {
        if (acc.id !== newTransaction.account_id) return acc;
        const change = newTransaction.transaction_type === 'expense' ? -newTransaction.amount : newTransaction.amount;
        return { ...acc, balance: acc.balance + change };
      }));

      if (newTransaction.budget_id) {
        setBudgets((prev) => prev.map((b) => {
          if (b.id !== newTransaction.budget_id) return b;
          const change = newTransaction.transaction_type === 'expense' ? newTransaction.amount : -newTransaction.amount;
          return { ...b, spent: (b.spent || 0) + change };
        }));
      }
      return newTransaction;
    } else {
      const payload = toFirestoreTransaction(data);
      const created = await dbCreateTransaction(user.uid, payload);
      applyLedgerDeltas(transactionCreateDeltas(payload));
      return created;
    }
  }, [isDemo, user, transactions, settings.language, applyLedgerDeltas]);
  const updateTransaction = useCallback(async (id, data, oldTxOverride = null) => {
    const oldTx = oldTxOverride || transactions.find((tx) => tx.id === id);
    if (!oldTx) { console.warn('updateTransaction: tx not found', id); return; }
    if (isDemo) {
      setAccounts((prev) => prev.map((acc) => {
        if (acc.id !== oldTx.account_id) return acc;
        const revert = oldTx.transaction_type === 'expense' ? oldTx.amount : -oldTx.amount;
        return { ...acc, balance: acc.balance + revert };
      }));
      if (oldTx.budget_id) {
        setBudgets((prev) => prev.map((b) => {
          if (b.id !== oldTx.budget_id) return b;
          const revert = oldTx.transaction_type === 'expense' ? -oldTx.amount : oldTx.amount;
          return { ...b, spent: (b.spent || 0) + revert };
        }));
      }
      const newTx = { ...oldTx, ...data };
      setAccounts((prev) => prev.map((acc) => {
        if (acc.id !== newTx.account_id) return acc;
        const change = newTx.transaction_type === 'expense' ? -newTx.amount : newTx.amount;
        return { ...acc, balance: acc.balance + change };
      }));
      if (newTx.budget_id) {
        setBudgets((prev) => prev.map((b) => {
          if (b.id !== newTx.budget_id) return b;
          const change = newTx.transaction_type === 'expense' ? newTx.amount : -newTx.amount;
          return { ...b, spent: (b.spent || 0) + change };
        }));
      }
      setTransactions((prev) => prev.map((tx) => tx.id === id ? newTx : tx));
    } else {
      const oldFirestore = toFirestoreTransaction(oldTx);
      const newFirestore = toFirestoreTransaction({ ...oldTx, ...data });
      await dbUpdateTransaction(user.uid, id, oldFirestore, newFirestore);
      applyLedgerDeltas(transactionUpdateDeltas(oldFirestore, newFirestore));
    }
  }, [isDemo, user, transactions, applyLedgerDeltas]);
  const deleteTransaction = useCallback(async (id, txOverride = null) => {
    const tx = txOverride || transactions.find((t) => t.id === id);
    if (!tx) { console.warn('deleteTransaction: tx not found', id); return; }
    if (isDemo) {
      setAccounts((prev) => prev.map((acc) => {
        if (acc.id !== tx.account_id) return acc;
        const revert = tx.transaction_type === 'expense' ? tx.amount : -tx.amount;
        return { ...acc, balance: acc.balance + revert };
      }));
      if (tx.budget_id) {
        setBudgets((prev) => prev.map((b) => {
          if (b.id !== tx.budget_id) return b;
          const revert = tx.transaction_type === 'expense' ? -tx.amount : tx.amount;
          return { ...b, spent: (b.spent || 0) + revert };
        }));
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } else {
      const payload = toFirestoreTransaction(tx);
      await dbDeleteTransaction(user.uid, id, payload);
      applyLedgerDeltas(transactionDeleteDeltas(payload));
      if (tx.source === 'bank' && tx.bankRef) {
        dismissBankRef(user.uid, tx.bankRef).catch((error) => {
          console.warn('Could not remember the deleted entry:', error.message);
        });
      }
    }
  }, [isDemo, user, transactions, applyLedgerDeltas]);
  const connectBank = useCallback(async () => {
    const result = await startBankConnect();
    if (!result?.url) throw new Error('No authorisation url');
    window.location.href = result.url;
  }, []);

  const finishBankConnect = useCallback(async () => {
    if (!bankSyncAvailable) return null;
    const session = await readBankSession();
    const bankAccount = (session.accounts || [])[0] || null;
    if (!bankAccount?.id) throw new Error('No bank account in session');

    const connection = {
      provider: 'enablebanking',
      sessionId: session.sessionId,
      bankName: session.bank || null,
      bankAccountUid: bankAccount.id,
      bankAccountIban: bankAccount.iban || null,
      bankAccountName: bankAccount.name || null,
      bankAccountCurrency: bankAccount.currency || null,
      validUntil: session.validUntil || null,
      connectedAt: new Date().toISOString(),
      autoSync: true,
    };
    await dbSaveBankConnection(user.uid, connection);
    return connection;
  }, [bankSyncAvailable, user]);

  const updateBankConnection = useCallback(async (data) => {
    if (!bankSyncAvailable) return;
    await dbSaveBankConnection(user.uid, data);
  }, [bankSyncAvailable, user]);

  const disconnectBank = useCallback(async () => {
    if (!bankSyncAvailable) return;
    await dbClearBankConnection(user.uid);
  }, [bankSyncAvailable, user]);

  const syncBank = useCallback(async () => {
    if (!bankSyncAvailable) return null;
    const connection = bankConnection;
    if (!connection?.bankAccountUid || !connection?.accountId) return null;

    setBankSyncing(true);
    try {
      const lookbackFrom = shiftDay(dayOf(new Date().toISOString()), -BANK_LOOKBACK_DAYS);
      const fetchFrom =
        connection.importFrom && connection.importFrom < lookbackFrom
          ? connection.importFrom
          : lookbackFrom;
      const existing = await getTransactionsSince(
        user.uid,
        connection.accountId,
        `${fetchFrom}T00:00:00.000Z`
      );

      const newestDay = (list) => list.map((tx) => dayOf(tx.date)).filter(Boolean).sort().pop();
      const fromDay =
        connection.importFrom ||
        newestDay(existing.filter((tx) => tx.source === 'bank')) ||
        newestDay(existing) ||
        fetchFrom;

      const payload = await fetchBankTransactions(connection.bankAccountUid, fetchFrom);

      const { entries, skipped } = selectNewTransactions(
        payload.transactions,
        existing,
        fromDay,
        connection.dismissedRefs
      );
      const balance = pickBalance(payload.balances);

      let applied = null;
      if (entries.length || balance !== null) {
        applied = await importBankTransactions(user.uid, {
          accountId: connection.accountId,
          entries,
          balance,
        });
      }

      await dbSaveBankConnection(user.uid, {
        lastSyncAt: new Date().toISOString(),
        lastSyncCount: entries.length,
        lastSyncTruncated: Boolean(payload.truncated),
        lastSyncAccountId: connection.accountId,
        ...(connection.importFrom ? {} : { importFrom: fromDay }),
      });

      return {
        imported: entries.length,
        skipped,
        truncated: Boolean(payload.truncated),
        balance: applied ? applied.balance : null,
      };
    } catch (error) {
      if (error.status === 429) {
        await dbSaveBankConnection(user.uid, { rateLimitedAt: new Date().toISOString() });
      }
      throw error;
    } finally {
      setBankSyncing(false);
    }
  }, [bankSyncAvailable, bankConnection, user]);

  useEffect(() => {
    if (!bankSyncAvailable || bankReturnHandled.current) return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get('bank');
    if (!status) return;

    bankReturnHandled.current = true;
    window.history.replaceState({}, '', window.location.pathname);

    const notify = async (kind, message) => {
      const { toast } = await import('sonner');
      toast[kind](message);
    };

    if (status !== 'connected') {
      notify('error', status === 'denied' ? t.bankSyncErrorDenied : t.bankSyncErrorGeneric);
      return;
    }

    setBankConnecting(true);
    finishBankConnect()
      .then(() => notify('success', t.bankSyncConnectedNow))
      .catch(() => notify('error', t.bankSyncErrorSession))
      .finally(() => setBankConnecting(false));
  }, [bankSyncAvailable, finishBankConnect, t]);

  useEffect(() => { startupSyncDone.current = false; }, [user]);

  useEffect(() => {
    if (!bankSyncAvailable) return;
    if (!bankConnection?.autoSync || !bankConnection?.accountId || !bankConnection?.bankAccountUid) return;

    const freshlyLinked = bankConnection.accountId !== bankConnection.lastSyncAccountId;
    const blockedUntil = (Date.parse(bankConnection.rateLimitedAt || '') || 0) + BANK_RATE_LIMIT_PAUSE_MS;
    if (Date.now() < blockedUntil) return;

    const run = (floorMs) => {
      if (autoSyncRunning.current) return;
      const last = Date.parse(bankConnection.lastSyncAt || '') || 0;
      if (!freshlyLinked && Date.now() - last < floorMs) return;

      autoSyncRunning.current = true;
      syncBank()
        .catch((error) => { console.warn('Bank sync failed:', error.message); })
        .finally(() => { autoSyncRunning.current = false; });
    };

    if (freshlyLinked || !startupSyncDone.current) {
      startupSyncDone.current = true;
      run(BANK_STARTUP_FLOOR_MS);
    }

    const timer = setInterval(() => run(AUTO_SYNC_INTERVAL_MS), BANK_AUTO_SYNC_CHECK_MS);
    return () => clearInterval(timer);
  }, [bankSyncAvailable, bankConnection, syncBank]);

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const expenseBudgets = budgets.filter((b) => b.budget_type === 'expense').sort((a, b) => (a.order || 0) - (b.order || 0));
  const accumulatingBudgets = budgets.filter((b) => b.budget_type === 'accumulating').sort((a, b) => (a.order || 0) - (b.order || 0));
  const expenseBudgetsTotal = expenseBudgets.reduce((sum, b) => sum + b.amount + (b.carried_over || 0) - (b.spent || 0), 0);
  const accumulatingBudgetsTotal = accumulatingBudgets.reduce((sum, b) => sum + b.amount + (b.carried_over || 0) - (b.spent || 0), 0);
  const calculatePendingRemainder = useCallback((budget) => {
    if (budget.budget_type !== 'expense') return 0;
    if (budget.interval === 'none') return 0;
    
    const remaining = budget.amount + (budget.carried_over || 0) - (budget.spent || 0);
    return remaining > 0 ? remaining : 0;
  }, []);
  const getBudgetPendingRemainder = useCallback((budgetId) => {
    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget) return 0;
    return budget.pending_remainder || 0;
  }, [budgets]);
  const redistributeRemainder = useCallback(async (sourceBudgetId, distributions) => {
    const sourceBudget = budgets.find((b) => b.id === sourceBudgetId);
    if (!sourceBudget) return;

    const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
    const pendingRemainder = sourceBudget.pending_remainder || 0;

    if (totalDistributed > pendingRemainder) {
      console.error('Cannot distribute more than pending remainder');
      return;
    }

    if (isDemo) {
      setBudgets((prev) => prev.map((b) => {
        if (b.id === sourceBudgetId) {
          const selfAmount = distributions
            .filter((d) => d.budgetId === sourceBudgetId)
            .reduce((sum, d) => sum + d.amount, 0);
          return {
            ...b,
            pending_remainder: Math.max(0, (b.pending_remainder || 0) - totalDistributed),
            carried_over: (b.carried_over || 0) + selfAmount,
          };
        }
        const dist = distributions.find((d) => d.budgetId === b.id);
        if (dist) {
          return { ...b, carried_over: (b.carried_over || 0) + dist.amount };
        }
        return b;
      }));
    } else {
      await dbRedistributeRemainder(user.uid, sourceBudgetId, distributions);
    }
  }, [isDemo, user, budgets]);
  useEffect(() => {
    if (loading || authLoading) return;

    const now = new Date();
    const nowIso = now.toISOString();

    const DAY = 24 * 60 * 60 * 1000;

    const periodsElapsed = (budget) => {
      if (budget.interval === 'none') return 0;
      if (budget.budget_type !== 'expense' && budget.budget_type !== 'accumulating') return 0;
      const startDate = budget.start_date ? new Date(budget.start_date) : null;
      const lastReset = budget.last_reset ? new Date(budget.last_reset) : null;
      if (!startDate) return 0;
      const since = lastReset || startDate;
      const elapsed = now - since;
      switch (budget.interval) {
        case 'daily': return Math.floor(elapsed / DAY);
        case 'weekly': return Math.floor(elapsed / (7 * DAY));
        case 'monthly':
          return (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth());
        case 'quarterly': return Math.floor(elapsed / (90 * DAY));
        case 'yearly': return Math.floor(elapsed / (365 * DAY));
        default: return 0;
      }
    };

    const budgetsToReset = budgets.filter((b) => periodsElapsed(b) > 0);
    if (budgetsToReset.length === 0) return;

    const resetMap = {};
    budgetsToReset.forEach((budget) => {
      const carriedOver = budget.budget_type === 'accumulating'
        ? periodsElapsed(budget) * budget.amount + (budget.carried_over || 0) - (budget.spent || 0)
        : 0;
      resetMap[budget.id] = {
        spent: 0,
        carriedOver,
        pending_remainder: (budget.pending_remainder || 0) + calculatePendingRemainder(budget),
        lastReset: nowIso,
      };
    });

    setBudgets((prev) => prev.map((budget) => {
      const r = resetMap[budget.id];
      if (!r) return budget;
      return {
        ...budget,
        spent: 0,
        carried_over: r.carriedOver,
        pending_remainder: r.pending_remainder,
        last_reset: nowIso,
      };
    }));

    if (!isDemo && user) {
      budgetsToReset.forEach(async (budget) => {
        try {
          await dbPersistBudgetReset(user.uid, budget.id, resetMap[budget.id]);
        } catch (e) {
          console.error('Failed to persist budget reset:', budget.id, e);
        }
      });
    }
  }, [loading, authLoading, budgets, isDemo, user, calculatePendingRemainder]);

  const getBudgetById = useCallback((id) => budgets.find((b) => b.id === id), [budgets]);
  const getAccountById = useCallback((id) => accounts.find((a) => a.id === id), [accounts]);
  const getTransactionsForAccount = useCallback((accountId) => transactions.filter((tx) => tx.account_id === accountId), [transactions]);
  const getTransactionsForBudget = useCallback((budgetId) => transactions.filter((tx) => tx.budget_id === budgetId), [transactions]);

  const value = {
    user, authLoading, isDemo, logout: handleLogout,
    firebaseReady: isFirebaseConfigured, pendingVerificationEmail, checkVerificationNow, resendVerification,
    resolvedTheme,
    settings, loading,
    accounts, budgets, transactions,
    totalBalance, expenseBudgets, accumulatingBudgets, expenseBudgetsTotal, accumulatingBudgetsTotal,
    t, updateSettings,
    createAccount, updateAccount, deleteAccount, reorderAccounts, getAccountById,
    createBudget, updateBudget, deleteBudget, reorderBudgets, resetBudget, getBudgetById, setBudgetCarryover,
    createTransaction, updateTransaction, deleteTransaction, getTransactionsForAccount, getTransactionsForBudget,
    calculatePendingRemainder, getBudgetPendingRemainder, redistributeRemainder,
    bankSyncAvailable, bankConnection, bankSyncing, bankConnecting,
    connectBank, finishBankConnect, updateBankConnection, disconnectBank, syncBank,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}

export default AppContext;
