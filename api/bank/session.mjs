import { requireOwner } from '../_lib/auth.mjs';
import { getSession } from '../_lib/enablebanking.mjs';
import { clearedSessionCookie, readSessionCookie } from '../_lib/state.mjs';

const readAccount = (entry) => {
  if (typeof entry === 'string') return { id: entry, iban: null, name: null, currency: null };
  if (!entry || typeof entry !== 'object') return { id: null };

  const identifier = entry.account_id;
  const iban = typeof identifier === 'string' ? identifier : identifier?.iban || entry.iban || null;

  return {
    id: entry.uid || entry.resource_id || entry.id || (typeof identifier === 'string' ? identifier : null),
    iban,
    name: entry.name || entry.product || entry.details || null,
    currency: entry.currency || null,
  };
};

const readAccounts = (session) => {
  const source = Array.isArray(session.accounts_data) && session.accounts_data.length
    ? session.accounts_data
    : session.accounts || [];
  return source.map(readAccount).filter((account) => account.id);
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireOwner(req);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  let sessionId;
  try {
    sessionId = readSessionCookie(req);
  } catch {
    return res.status(404).json({ error: 'No pending bank session' });
  }

  try {
    const session = await getSession(sessionId);
    res.setHeader('Set-Cookie', clearedSessionCookie());
    return res.status(200).json({
      sessionId,
      bank: session.aspsp?.name || null,
      accounts: readAccounts(session),
      validUntil: session.access?.valid_until || null,
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Session could not be read',
      upstream: error.details?.message || error.message,
    });
  }
}
