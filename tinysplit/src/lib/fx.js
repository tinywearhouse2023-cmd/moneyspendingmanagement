// fx.js — Historical FX rate fetching.
//
// Uses the free fawazahmed0/currency-api hosted on jsdelivr and Cloudflare
// Pages CDNs. Supports 200+ currencies including TWD. Historical data
// available from approximately 2024-03-12 onwards; older dates fall back
// to the latest rate.
//
// Reference: https://github.com/fawazahmed0/exchange-api

const cache = new Map();
const todayStr = () => new Date().toISOString().slice(0, 10);

export async function fetchFxRate(date, from, to) {
  if (!from || !to || from === to) return { rate: 1, effectiveDate: date };

  const key = `${date}_${from}_${to}`;
  if (cache.has(key)) return cache.get(key);

  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();
  const today = todayStr();
  const dateParam = !date || date >= today ? 'latest' : date;

  const tryParam = async (param) => {
    const urls = [
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${param}/v1/currencies/${fromLower}.json`,
      `https://${param}.currency-api.pages.dev/v1/currencies/${fromLower}.json`,
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const rate = data[fromLower]?.[toLower];
        if (rate != null) return { rate, effectiveDate: data.date || param };
      } catch {
        /* try next URL */
      }
    }
    return null;
  };

  let result = await tryParam(dateParam);
  if (!result && dateParam !== 'latest') result = await tryParam('latest');
  if (!result) throw new Error(`查無 ${from} → ${to} 匯率`);

  cache.set(key, result);
  return result;
}
