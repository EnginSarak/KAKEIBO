import crypto from 'node:crypto';

const BASE_URL = 'https://api.enablebanking.com';
const TOKEN_TTL_SECONDS = 3600;

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const readPrivateKey = () => {
  const raw = process.env.ENABLE_BANKING_PRIVATE_KEY;
  if (!raw) throw new Error('ENABLE_BANKING_PRIVATE_KEY is not set');
  const normalised = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
  return crypto.createPrivateKey(normalised);
};

const appId = () => {
  const value = process.env.ENABLE_BANKING_APP_ID;
  if (!value) throw new Error('ENABLE_BANKING_APP_ID is not set');
  return value.trim();
};

export const buildToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'RS256', kid: appId() };
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), readPrivateKey());
  return `${signingInput}.${signature.toString('base64url')}`;
};

export const call = async (path, { method = 'GET', body, query } = {}) => {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${buildToken()}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(`Enable Banking ${method} ${path} failed with ${response.status}`);
    error.status = response.status;
    error.details = parsed;
    throw error;
  }

  return parsed;
};

export const listAspsps = (country = 'DE') => call('/aspsps', { query: { country } });

export const startAuthorization = ({ aspsp, redirectUrl, state, validUntil, authMethod, psuType = 'personal' }) =>
  call('/auth', {
    method: 'POST',
    body: {
      access: { valid_until: validUntil },
      aspsp,
      redirect_url: redirectUrl,
      state,
      psu_type: psuType,
      ...(authMethod ? { auth_method: authMethod } : {}),
    },
  });

export const createSession = (code) => call('/sessions', { method: 'POST', body: { code } });

export const getSession = (sessionId) => call(`/sessions/${encodeURIComponent(sessionId)}`);

export const getBalances = (accountId) =>
  call(`/accounts/${encodeURIComponent(accountId)}/balances`);

export const getTransactions = (accountId, { dateFrom, dateTo, continuationKey } = {}) =>
  call(`/accounts/${encodeURIComponent(accountId)}/transactions`, {
    query: { date_from: dateFrom, date_to: dateTo, continuation_key: continuationKey },
  });
