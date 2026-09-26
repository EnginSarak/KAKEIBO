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

  const asked = req.body && typeof req.body === 'object' ? req.body : {};
  const text = (value, fallback) => {
    const candidate = typeof value === 'string' ? value.trim() : '';
    return candidate || fallback;
  };

  const aspspName = text(asked.name, (process.env.BANK_ASPSP_NAME || '').trim());
  const country = text(asked.country, process.env.BANK_ASPSP_COUNTRY || 'DE').toUpperCase();
  const psuType = asked.psuType === 'business' ? 'business' : 'personal';

  if (!aspspName || aspspName.length > 120) return res.status(400).json({ error: 'A bank is required' });
  if (!/^[A-Z]{2}$/.test(country)) return res.status(400).json({ error: 'country must be a two letter code' });

  const authMethod = (process.env.BANK_AUTH_METHOD || '').trim();

  try {
    const result = await startAuthorization({
      aspsp: { name: aspspName, country },
      redirectUrl,
      state: packState(owner.sub),
      validUntil,
      psuType,
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
