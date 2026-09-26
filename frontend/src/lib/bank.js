import { auth } from './firebase';

const clean = (value) => (value || '').replace(/^(['"])(.*)\1$/, '$2').trim();

const BANK_SYNC_UID = clean(process.env.REACT_APP_BANK_SYNC_UID);

export const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const isBankSyncUser = (user) => Boolean(BANK_SYNC_UID && user && user.uid === BANK_SYNC_UID);

const request = async (path, options = {}) => {
  const current = auth.currentUser;
  if (!current) {
    const error = new Error('No signed in user');
    error.status = 401;
    throw error;
  }

  const token = await current.getIdToken();
  const response = await fetch(path, {
    ...options,
    cache: 'no-store',
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache',
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed with ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const startBankConnect = (bank) =>
  request('/api/bank/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bank || {}),
  });

export const searchBanks = (query, country = 'DE') => {
  const params = new URLSearchParams({ country });
  if (query) params.set('query', query);
  return request(`/api/bank/banks?${params.toString()}`);
};

export const readBankSession = () => request('/api/bank/session');

export const fetchBankTransactions = (accountId, dateFrom) => {
  const params = new URLSearchParams({ accountId });
  if (dateFrom) params.set('dateFrom', dateFrom);
  return request(`/api/bank/transactions?${params.toString()}`);
};

const BALANCE_PRIORITY = ['CLBD', 'XPCD', 'ITAV', 'PRCD', 'OTHR'];

const balanceValue = (entry) => {
  const amount = Number(entry?.balance_amount?.amount);
  if (!Number.isFinite(amount)) return null;
  const sign = (entry?.credit_debit_indicator || '').toUpperCase() === 'DBIT' ? -1 : 1;
  return sign * Math.abs(amount);
};

export const pickBalance = (balances) => {
  if (!Array.isArray(balances) || balances.length === 0) return null;
  for (const type of BALANCE_PRIORITY) {
    const hit = balances.find((entry) => (entry?.balance_type || '').toUpperCase() === type);
    const value = hit ? balanceValue(hit) : null;
    if (value !== null) return value;
  }
  for (const entry of balances) {
    const value = balanceValue(entry);
    if (value !== null) return value;
  }
  return null;
};

export const dayOf = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
};

export const shiftDay = (day, days) => {
  const parsed = new Date(`${day}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return day;
  parsed.setDate(parsed.getDate() + days);
  return dayOf(parsed.toISOString());
};

const toIsoDate = (value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const firstText = (value) => {
  if (Array.isArray(value)) return value.map((part) => String(part || '').trim()).filter(Boolean).join(' ');
  if (typeof value === 'string') return value.trim();
  return '';
};

const counterpartyName = (entry, isIncome) => {
  const primary = isIncome ? entry?.debtor : entry?.creditor;
  const secondary = isIncome ? entry?.creditor : entry?.debtor;
  return firstText(primary?.name) || firstText(secondary?.name);
};

const label = (entry, isIncome) => {
  const name = counterpartyName(entry, isIncome);
  if (name) return name;
  const remittance = firstText(entry?.remittance_information);
  if (remittance) return remittance.slice(0, 80);
  return firstText(entry?.bank_transaction_code?.description) || '';
};

const fingerprint = (parts) => {
  const input = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return `fp_${hash.toString(36)}_${input.length.toString(36)}`;
};

const KEPT_STATUS = new Set(['BOOK', 'PDNG']);

export const normaliseTransaction = (entry) => {
  const status = (entry?.status || 'BOOK').toUpperCase();
  if (!KEPT_STATUS.has(status)) return null;

  const amount = Math.abs(Number(entry?.transaction_amount?.amount));
  if (!Number.isFinite(amount) || amount === 0) return null;

  const isIncome = (entry?.credit_debit_indicator || '').toUpperCase() === 'CRDT';
  const raw = entry?.booking_date || entry?.value_date || entry?.transaction_date;
  const date = raw ? toIsoDate(raw) : null;
  if (!date) return null;

  const day = dayOf(raw);
  const name = label(entry, isIncome);
  const reference = firstText(entry?.entry_reference) || firstText(entry?.transaction_id);

  return {
    amount,
    transaction_type: isIncome ? 'income' : 'expense',
    name: name || '...',
    date,
    day,
    status,
    bankRef: reference || fingerprint([status, day, amount.toFixed(2), isIncome ? 'CRDT' : 'DBIT', name]),
    hasReference: Boolean(reference),
  };
};

const sameAmount = (a, b) => Math.abs(a - b) < 0.005;

const daysApart = (a, b) => {
  const first = Date.parse(`${a}T12:00:00Z`);
  const second = Date.parse(`${b}T12:00:00Z`);
  if (Number.isNaN(first) || Number.isNaN(second)) return Number.POSITIVE_INFINITY;
  return Math.abs(first - second) / 86400000;
};

const BOOKING_WINDOW_DAYS = 6;

const plainName = (value) =>
  (value || '')
    .toUpperCase()
    .replace(/[^0-9A-ZÄÖÜß]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const isOwnName = (name, ownerNames) => {
  const candidate = plainName(name);
  if (!candidate) return false;
  return (ownerNames || []).some((owner) => {
    const tokens = plainName(owner).split(' ').filter((token) => token.length >= 3);
    if (tokens.length === 0) return false;
    return tokens.every((token) => candidate.split(' ').includes(token));
  });
};

export const selectBankChanges = (entries, existing, fromDay, dismissedRefs, ownerNames) => {
  const dismissed = new Set(dismissedRefs || []);
  const fromBank = (existing || []).filter((tx) => tx.source === 'bank' && tx.bankRef);
  const byRef = new Map(fromBank.map((tx) => [tx.bankRef, tx]));

  const seen = new Map();
  const incoming = (entries || [])
    .map(normaliseTransaction)
    .filter(Boolean)
    .filter((entry) => !fromDay || entry.day >= fromDay)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((entry) => {
      if (entry.hasReference) return entry;
      const count = (seen.get(entry.bankRef) || 0) + 1;
      seen.set(entry.bankRef, count);
      return count > 1 ? { ...entry, bankRef: `${entry.bankRef}_${count}` } : entry;
    });

  const reported = new Set(incoming.map((entry) => entry.bankRef));
  const stillPending = fromBank.filter(
    (tx) => tx.bankStatus === 'PDNG' && !reported.has(tx.bankRef)
  );

  const create = [];
  const update = [];
  let skipped = 0;

  for (const entry of incoming) {
    if (dismissed.has(entry.bankRef)) {
      skipped += 1;
      continue;
    }

    const known = byRef.get(entry.bankRef);
    if (known) {
      if ((known.bankStatus || 'BOOK') !== entry.status) update.push({ existing: known, entry });
      else skipped += 1;
      continue;
    }

    if (entry.status === 'BOOK') {
      const index = stillPending.findIndex(
        (tx) =>
          sameAmount(Number(tx.amount) || 0, entry.amount) &&
          (tx.transactionType || tx.transaction_type) === entry.transaction_type &&
          daysApart(dayOf(tx.date), entry.day) <= BOOKING_WINDOW_DAYS
      );
      if (index >= 0) {
        const [matched] = stillPending.splice(index, 1);
        update.push({ existing: matched, entry });
        continue;
      }
    }

    create.push(
      isOwnName(entry.name, ownerNames) ? { ...entry, name: '' } : entry
    );
  }

  return { create, update, remove: incoming.length ? stillPending : [], skipped };
};

export const transactionLabel = (transaction, t) => {
  const name = (transaction.name || '').trim();
  if (name && name !== '...') return name;
  return transaction.source === 'bank' ? t.bankSyncUnnamed : '...';
};

export const maskIban = (iban) => {
  const value = (iban || '').replace(/\s+/g, '');
  if (value.length < 8) return value;
  return `${value.slice(0, 4)} •••• ${value.slice(-4)}`;
};
