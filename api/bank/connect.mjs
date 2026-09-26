import { requireOwner } from '../_lib/auth.mjs';
import { startAuthorization } from '../_lib/enablebanking.mjs';
import { packState } from '../_lib/state.mjs';

const ACCESS_DAYS = 179;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let owner;
  try {
    owner = await requireOwner(req);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  const redirectUrl = process.env.BANK_REDIRECT_URL || 'https://kakeibo.enginsarak.com/api/bank/callback';
  const validUntil = new Date(Date.now() + ACCESS_DAYS * 86400000).toISOString().replace(/\.\d+Z$/, 'Z');

  const aspspName = (process.env.BANK_ASPSP_NAME || '').trim();
  if (!aspspName) return res.status(503).json({ error: 'Bank sync is not configured' });

  const authMethod = (process.env.BANK_AUTH_METHOD || '').trim();

  try {
    const result = await startAuthorization({
      aspsp: {
        name: aspspName,
        country: process.env.BANK_ASPSP_COUNTRY || 'DE',
      },
      redirectUrl,
      state: packState(owner.sub),
      validUntil,
      ...(authMethod ? { authMethod } : {}),
    });

    return res.status(200).json({ url: result.url, authorizationId: result.authorization_id });
  } catch (error) {
    return res.status(error.status && error.status < 500 ? 502 : 500).json({
      error: 'Authorization could not be started',
      upstream: error.details?.message || error.message,
    });
  }
}
