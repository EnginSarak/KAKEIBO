import { requireOwner } from '../_lib/auth.mjs';
import { getBalances, getTransactions } from '../_lib/enablebanking.mjs';

const MAX_PAGES = 10;

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

  const url = new URL(req.url, 'https://kakeibo.enginsarak.com');
  const accountId = url.searchParams.get('accountId');
  const dateFrom = url.searchParams.get('dateFrom') || undefined;
  const dateTo = url.searchParams.get('dateTo') || undefined;

  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  console.log(`transactions requested from ${dateFrom || 'unset'} to ${dateTo || 'now'}`);

  try {
    const collected = [];
    let continuationKey;
    let pages = 0;

    do {
      const page = await getTransactions(accountId, { dateFrom, dateTo, continuationKey });
      collected.push(...(page.transactions || []));
      continuationKey = page.continuation_key;
      pages += 1;
    } while (continuationKey && pages < MAX_PAGES);

    let balances = null;
    try {
      const result = await getBalances(accountId);
      balances = result.balances || null;
    } catch {
      balances = null;
    }

    return res.status(200).json({
      transactions: collected,
      balances,
      truncated: Boolean(continuationKey),
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Transactions could not be fetched',
      upstream: error.details?.message || error.message,
    });
  }
}
