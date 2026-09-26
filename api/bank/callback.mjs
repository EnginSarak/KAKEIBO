import { createSession } from '../_lib/enablebanking.mjs';
import { sessionCookie, unpackState } from '../_lib/state.mjs';

const APP_URL = process.env.BANK_APP_URL || 'https://kakeibo.enginsarak.com';

const back = (res, status) => {
  res.setHeader('Location', `${APP_URL}/settings?bank=${status}`);
  return res.status(302).end();
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = new URL(req.url, APP_URL);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (url.searchParams.get('error')) return back(res, 'denied');
  if (!code || !state) return back(res, 'incomplete');

  const allowed = (process.env.ALLOWED_FIREBASE_UID || '').trim();
  if (!allowed) return back(res, 'unconfigured');

  try {
    const claims = unpackState(state);
    if (claims.uid !== allowed) return back(res, 'forbidden');
  } catch {
    return back(res, 'invalid');
  }

  try {
    const session = await createSession(code);
    if (!session?.session_id) return back(res, 'failed');
    res.setHeader('Set-Cookie', sessionCookie(session.session_id));
    return back(res, 'connected');
  } catch {
    return back(res, 'failed');
  }
}
