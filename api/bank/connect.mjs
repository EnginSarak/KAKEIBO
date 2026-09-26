import { requireOwner } from '../_lib/auth.mjs';
import { startAuthorization } from '../_lib/enablebanking.mjs';
import { packState } from '../_lib/state.mjs';

const ACCESS_DAYS = 180;

export default async function handler(req, res) {
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

  try {
    const result = await startAuthorization({
      aspsp: {
        name: process.env.BANK_ASPSP_NAME || 'the bank',
        country: process.env.BANK_ASPSP_COUNTRY || 'DE',
      },
      redirectUrl,
      state: packState(owner.sub),
      validUntil,
    });

    return res.status(200).json({ url: result.url, authorizationId: result.authorization_id });
  } catch (error) {
    return res.status(error.status && error.status < 500 ? 502 : 500).json({
      error: 'Authorization could not be started',
      upstream: error.details?.message || error.message,
    });
  }
}
