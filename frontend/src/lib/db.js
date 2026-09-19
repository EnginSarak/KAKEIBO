import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  limit,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';

export async function createAccount(userId, data) {
  const accountsRef = collection(db, 'users', userId, 'accounts');
  const accountData = {
    name: data.name,
    balance: data.balance || 0,
    color: data.color || '#0f392b',
    order: data.order || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(accountsRef, accountData);
  return { id: docRef.id, ...accountData };
}

export function subscribeToAccounts(userId, callback) {
  const accountsRef = collection(db, 'users', userId, 'accounts');
  const q = query(accountsRef, orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const accounts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(accounts);
  });
}

export async function updateAccount(userId, accountId, data) {
  const accountRef = doc(db, 'users', userId, 'accounts', accountId);
  await updateDoc(accountRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteAccount(userId, accountId) {
  const batch = writeBatch(db);
  const accountRef = doc(db, 'users', userId, 'accounts', accountId);
  batch.delete(accountRef);

  const budgetsSnapshot = await getDocs(query(collection(db, 'users', userId, 'budgets'), where('accountId', '==', accountId)));
  budgetsSnapshot.docs.forEach(d => batch.delete(d.ref));

  const transactionsSnapshot = await getDocs(query(collection(db, 'users', userId, 'transactions'), where('accountId', '==', accountId)));
  transactionsSnapshot.docs.forEach(d => batch.delete(d.ref));

  await batch.commit();
}

export async function reorderAccounts(userId, accountIds) {
  const batch = writeBatch(db);
  accountIds.forEach((accountId, index) => {
    batch.update(doc(db, 'users', userId, 'accounts', accountId), { order: index, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function createBudget(userId, data) {
  const budgetsRef = collection(db, 'users', userId, 'budgets');
  const budgetData = {
    name: data.name,
    amount: data.amount,
    color: data.color || null,
    budgetType: data.budgetType || 'expense',
    interval: data.interval || 'monthly',
    startDate: data.startDate,
    accountId: data.accountId,
    spent: 0,
    carriedOver: 0,
    pending_remainder: 0,
    order: data.order || 0,
    lastReset: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(budgetsRef, budgetData);
  return { id: docRef.id, ...budgetData };
}

export function subscribeToBudgets(userId, callback) {
  const budgetsRef = collection(db, 'users', userId, 'budgets');
  const q = query(budgetsRef, orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const budgets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(budgets);
  });
}

export async function updateBudget(userId, budgetId, data) {
  const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
  await updateDoc(budgetRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteBudget(userId, budgetId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', userId, 'budgets', budgetId));

  const transactionsSnapshot = await getDocs(query(collection(db, 'users', userId, 'transactions'), where('budgetId', '==', budgetId)));
  transactionsSnapshot.docs.forEach(d => {
    batch.update(d.ref, { budgetId: null, updatedAt: serverTimestamp() });
  });

  await batch.commit();
}

export async function reorderBudgets(userId, budgetIds) {
  const batch = writeBatch(db);
  budgetIds.forEach((budgetId, index) => {
    batch.update(doc(db, 'users', userId, 'budgets', budgetId), { order: index, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function resetBudget(userId, budgetId, budget) {
  const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
  if (budget.budgetType === 'accumulating' || budget.budget_type === 'accumulating') {
    const remaining = budget.amount - (budget.spent || 0) + (budget.carriedOver || budget.carried_over || 0);
    await updateDoc(budgetRef, { spent: 0, carriedOver: remaining, lastReset: serverTimestamp(), updatedAt: serverTimestamp() });
  } else {
    await updateDoc(budgetRef, { spent: 0, carriedOver: 0, lastReset: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

export async function updateBudgetCarryover(userId, budgetId, carriedOver) {
  const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
  await updateDoc(budgetRef, { carriedOver, updatedAt: serverTimestamp() });
}

export async function persistBudgetReset(userId, budgetId, resetData) {
  const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
  await updateDoc(budgetRef, {
    spent: resetData.spent,
    carriedOver: resetData.carriedOver,
    pending_remainder: resetData.pending_remainder,
    lastReset: resetData.lastReset,
    updatedAt: serverTimestamp(),
  });
}

export async function redistributeRemainder(userId, sourceBudgetId, distributions) {
  const sourceBudgetRef = doc(db, 'users', userId, 'budgets', sourceBudgetId);
  const sourceBudgetDoc = await getDoc(sourceBudgetRef);
  if (!sourceBudgetDoc.exists()) return;

  const sourceData = sourceBudgetDoc.data();
  const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
  const currentPending = sourceData.pending_remainder || 0;
  const currentSourceCarriedOver = sourceData.carriedOver || 0;

  const budgetAmounts = {};
  for (const dist of distributions) {
    budgetAmounts[dist.budgetId] = (budgetAmounts[dist.budgetId] || 0) + dist.amount;
  }

  const targetRefs = {};
  const targetDatas = {};
  for (const bid of Object.keys(budgetAmounts)) {
    if (bid !== sourceBudgetId) {
      const ref = doc(db, 'users', userId, 'budgets', bid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        targetRefs[bid] = ref;
        targetDatas[bid] = snap.data();
      }
    }
  }

  const batch = writeBatch(db);
  const selfAmount = budgetAmounts[sourceBudgetId] || 0;

  batch.update(sourceBudgetRef, {
    pending_remainder: Math.max(0, currentPending - totalDistributed),
    carriedOver: currentSourceCarriedOver + selfAmount,
    updatedAt: serverTimestamp(),
  });

  for (const [bid, amount] of Object.entries(budgetAmounts)) {
    if (bid === sourceBudgetId) continue;
    if (!targetRefs[bid]) continue;
    batch.update(targetRefs[bid], {
      carriedOver: (targetDatas[bid].carriedOver || 0) + amount,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function createTransaction(userId, data) {
  const batch = writeBatch(db);
  const transactionsRef = collection(db, 'users', userId, 'transactions');

  const transactionData = {
    amount: data.amount,
    transactionType: data.transactionType || 'expense',
    name: data.name || '...',
    budgetId: data.budgetId || null,
    accountId: data.accountId,
    date: data.date || new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = doc(transactionsRef);
  batch.set(docRef, transactionData);
  const accountRef = doc(db, 'users', userId, 'accounts', data.accountId);
  const accountDoc = await getDoc(accountRef);
  if (accountDoc.exists()) {
    const currentBalance = accountDoc.data().balance || 0;
    const change = data.transactionType === 'expense' ? -data.amount : data.amount;
    batch.update(accountRef, { balance: currentBalance + change, updatedAt: serverTimestamp() });
  }
  if (data.budgetId) {
    const budgetRef = doc(db, 'users', userId, 'budgets', data.budgetId);
    const budgetDoc = await getDoc(budgetRef);
    if (budgetDoc.exists()) {
      const currentSpent = budgetDoc.data().spent || 0;
      const change = data.transactionType === 'expense' ? data.amount : -data.amount;
      batch.update(budgetRef, { spent: currentSpent + change, updatedAt: serverTimestamp() });
    }
  }

  await batch.commit();
  return { id: docRef.id, ...transactionData };
}

export function subscribeToTransactions(userId, callback) {
  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const q = query(transactionsRef, orderBy('date', 'desc'), limit(20));
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(transactions);
  });
}

const accountEffect = (tx) => (tx.transactionType === 'expense' ? -tx.amount : tx.amount);
const budgetEffect = (tx) => (tx.transactionType === 'expense' ? tx.amount : -tx.amount);

export function transactionUpdateDeltas(oldData, newData) {
  const add = (map, id, delta) => {
    if (!id) return map;
    const next = (map.get(id) || 0) + delta;
    if (next === 0) map.delete(id);
    else map.set(id, next);
    return map;
  };
  const accounts = new Map();
  add(accounts, oldData.accountId, -accountEffect(oldData));
  add(accounts, newData.accountId, accountEffect(newData));

  const budgets = new Map();
  add(budgets, oldData.budgetId, -budgetEffect(oldData));
  add(budgets, newData.budgetId, budgetEffect(newData));

  return { accounts, budgets };
}

export const transactionCreateDeltas = (tx) => transactionUpdateDeltas({ ...tx, amount: 0 }, tx);
export const transactionDeleteDeltas = (tx) => transactionUpdateDeltas(tx, { ...tx, amount: 0 });

export async function updateTransaction(userId, transactionId, oldData, newData) {
  const { accounts, budgets } = transactionUpdateDeltas(oldData, newData);
  const accountEntries = [...accounts];
  const budgetEntries = [...budgets];

  const [accountDocs, budgetDocs] = await Promise.all([
    Promise.all(accountEntries.map(([id]) => getDoc(doc(db, 'users', userId, 'accounts', id)))),
    Promise.all(budgetEntries.map(([id]) => getDoc(doc(db, 'users', userId, 'budgets', id)))),
  ]);

  const batch = writeBatch(db);
  accountEntries.forEach(([id, delta], i) => {
    const snap = accountDocs[i];
    if (!snap.exists()) return;
    batch.update(doc(db, 'users', userId, 'accounts', id), {
      balance: (snap.data().balance || 0) + delta,
      updatedAt: serverTimestamp(),
    });
  });
  budgetEntries.forEach(([id, delta], i) => {
    const snap = budgetDocs[i];
    if (!snap.exists()) return;
    batch.update(doc(db, 'users', userId, 'budgets', id), {
      spent: (snap.data().spent || 0) + delta,
      updatedAt: serverTimestamp(),
    });
  });

  batch.update(doc(db, 'users', userId, 'transactions', transactionId), {
    ...newData,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function deleteTransaction(userId, transactionId, transaction) {
  const batch = writeBatch(db);
  const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
  const accountRef = doc(db, 'users', userId, 'accounts', transaction.accountId);
  const accountDoc = await getDoc(accountRef);
  if (accountDoc.exists()) {
    const currentBalance = accountDoc.data().balance || 0;
    const revert = transaction.transactionType === 'expense' ? transaction.amount : -transaction.amount;
    batch.update(accountRef, { balance: currentBalance + revert, updatedAt: serverTimestamp() });
  }
  if (transaction.budgetId) {
    const budgetRef = doc(db, 'users', userId, 'budgets', transaction.budgetId);
    const budgetDoc = await getDoc(budgetRef);
    if (budgetDoc.exists()) {
      const currentSpent = budgetDoc.data().spent || 0;
      const revert = transaction.transactionType === 'expense' ? -transaction.amount : transaction.amount;
      batch.update(budgetRef, { spent: currentSpent + revert, updatedAt: serverTimestamp() });
    }
  }

  batch.delete(transactionRef);
  await batch.commit();
}

export async function submitContactForm(data) {
  const contactRef = collection(db, 'contact-submissions');
  await addDoc(contactRef, { ...data, createdAt: serverTimestamp(), status: 'new' });
}

const FALLBACK_CAP = 500;
async function paginateClientSide(transactionsRef, options) {
  const { budgetId, showUntagged, filterDate, pageSize = 20, page = 1, searchQuery } = options;
  const constraints = [];
  if (budgetId) constraints.push(where('budgetId', '==', budgetId));
  else if (showUntagged) constraints.push(where('budgetId', '==', null));
  constraints.push(limit(FALLBACK_CAP));

  const snapshot = await getDocs(query(transactionsRef, ...constraints));
  let all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filterDate) {
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);
    all = all.filter(tx => {
      const d = tx.date || '';
      return d >= startOfDay.toISOString() && d < startOfNextDay.toISOString();
    });
  }
  const term = (searchQuery || '').trim().toLowerCase();
  if (term) all = all.filter(tx => (tx.name || '').toLowerCase().includes(term));

  all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const start = Math.max(0, (page - 1) * pageSize);
  const pageData = all.slice(start, start + pageSize);
  return {
    transactions: pageData,
    lastCursor: null,
    hasMore: all.length > start + pageSize,
    totalForSearch: all.length,
  };
}

const isMissingIndexError = (error) =>
  error?.code === 'failed-precondition' ||
  /index/i.test(error?.message || '');

export async function getTransactionsPaginated(userId, options = {}) {
  const { budgetId, showUntagged, filterDate, pageSize = 20, cursor, searchQuery } = options;
  const transactionsRef = collection(db, 'users', userId, 'transactions');
  try {
    if (searchQuery && searchQuery.trim()) {
      const constraints = [orderBy('date', 'desc')];
      if (budgetId) constraints.push(where('budgetId', '==', budgetId));
      else if (showUntagged) constraints.push(where('budgetId', '==', null));
      if (filterDate) {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfNextDay = new Date(startOfDay);
        startOfNextDay.setDate(startOfNextDay.getDate() + 1);
        constraints.push(where('date', '>=', startOfDay.toISOString()));
        constraints.push(where('date', '<', startOfNextDay.toISOString()));
      }
      constraints.push(limit(200));

      const snapshot = await getDocs(query(transactionsRef, ...constraints));
      const filtered = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(tx => (tx.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()));

      const pageData = filtered.slice(0, pageSize);
      return {
        transactions: pageData,
        lastCursor: null,
        hasMore: filtered.length > pageSize,
        totalForSearch: filtered.length,
      };
    }

    const constraints = [orderBy('date', 'desc')];
    if (budgetId) constraints.push(where('budgetId', '==', budgetId));
    else if (showUntagged) constraints.push(where('budgetId', '==', null));
    if (filterDate) {
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setDate(startOfNextDay.getDate() + 1);
      constraints.push(where('date', '>=', startOfDay.toISOString()));
      constraints.push(where('date', '<', startOfNextDay.toISOString()));
    }
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize + 1));

    const snapshot = await getDocs(query(transactionsRef, ...constraints));
    const hasMore = snapshot.docs.length > pageSize;
    const docs = snapshot.docs.slice(0, pageSize);

    return {
      transactions: docs.map(d => ({ id: d.id, ...d.data() })),
      lastCursor: docs.length > 0 ? docs[docs.length - 1] : null,
      hasMore,
      totalForSearch: null,
    };
  } catch (error) {
    if ((budgetId || showUntagged) && isMissingIndexError(error)) {
      console.warn('Transactions index missing — using client-side fallback. Deploy firestore.indexes.json for better performance.', error.message);
      return paginateClientSide(transactionsRef, options);
    }
    throw error;
  }
}

export async function getTransactionsCount(userId, options = {}) {
  const { budgetId, showUntagged, filterDate } = options;
  try {
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const constraints = [];
    if (budgetId) constraints.push(where('budgetId', '==', budgetId));
    else if (showUntagged) constraints.push(where('budgetId', '==', null));
    if (filterDate) {
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setDate(startOfNextDay.getDate() + 1);
      constraints.push(where('date', '>=', startOfDay.toISOString()));
      constraints.push(where('date', '<', startOfNextDay.toISOString()));
    }

    const countSnapshot = await getCountFromServer(query(transactionsRef, ...constraints));
    return countSnapshot.data().count;
  } catch (error) {
    console.warn('getTransactionsCount failed:', error.message);
    return -1;
  }
}
