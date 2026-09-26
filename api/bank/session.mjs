import { requireOwner } from '../_lib/auth.mjs';
import { getSession } from '../_lib/enablebanking.mjs';
import { clearedSessionCookie, readSessionCookie } from '../_lib/state.mjs';

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
      accounts: (session.accounts || []).map((account) => ({
        id: account.uid || account.account_id,
        iban: account.account_id?.iban || account.iban || null,
        name: account.name || account.product || null,
        currency: account.currency || null,
      })),
      validUntil: session.access?.valid_until || null,
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Session could not be read',
      upstream: error.details?.message || error.message,
    });
  }
}
