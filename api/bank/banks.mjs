import { requireOwner } from '../_lib/auth.mjs';
import { listAspsps } from '../_lib/enablebanking.mjs';

const MAX_RESULTS = 40;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireOwner(req);
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }

  const url = new URL(req.url, 'https://example.invalid');
  const country = (url.searchParams.get('country') || 'DE').trim().toUpperCase();
  const query = (url.searchParams.get('query') || '').trim().toLowerCase();

  if (!/^[A-Z]{2}$/.test(country)) return res.status(400).json({ error: 'country must be a two letter code' });

  try {
    const result = await listAspsps(country);
    const matching = (result.aspsps || [])
      .filter((aspsp) => !query || (aspsp.name || '').toLowerCase().includes(query))
      .slice(0, MAX_RESULTS)
      .map((aspsp) => ({
        name: aspsp.name,
        country: aspsp.country,
        bic: aspsp.bic || null,
        beta: Boolean(aspsp.beta),
        psuTypes: aspsp.psu_types || [],
      }));

    return res.status(200).json({ banks: matching });
  } catch (error) {
    return res.status(502).json({
      error: 'Banks could not be listed',
      upstream: error.details?.message || error.message,
    });
  }
}
