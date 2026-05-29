// theme.js — Visual + locale constants shared across the app.

export const C = {
  bg: '#f5efe4',
  bg2: '#ede4d3',
  card: '#fbf6ec',
  border: '#d9c8a8',
  text: '#3d2817',
  muted: '#8b7355',
  subtle: '#6b5a3f',
  primary: '#3d2817',
  primaryText: '#f5efe4',
  accent: '#9c3a2f',
  positive: '#2d5a3d',
  warn: '#a87515',
  info: '#3a5a7a',
};

export const FONT_DISPLAY = 'Georgia, "Songti TC", "Noto Serif TC", serif';
export const FONT_BODY = '-apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif';

export const CURRENCIES = {
  TWD: { symbol: 'NT$', name: '新台幣' },
  EUR: { symbol: '€',   name: '歐元' },
  USD: { symbol: 'US$', name: '美元' },
  JPY: { symbol: '¥',   name: '日圓' },
  GBP: { symbol: '£',   name: '英鎊' },
  CHF: { symbol: 'CHF', name: '瑞郎' },
  AUD: { symbol: 'A$',  name: '澳幣' },
  CAD: { symbol: 'C$',  name: '加幣' },
  SGD: { symbol: 'S$',  name: '新幣' },
  HKD: { symbol: 'HK$', name: '港幣' },
  CNY: { symbol: 'CN¥', name: '人民幣' },
  KRW: { symbol: '₩',   name: '韓元' },
  THB: { symbol: '฿',   name: '泰銖' },
  SEK: { symbol: 'kr',  name: '瑞典克朗' },
  NOK: { symbol: 'kr',  name: '挪威克朗' },
  DKK: { symbol: 'kr',  name: '丹麥克朗' },
  PLN: { symbol: 'zł',  name: '波蘭茲羅提' },
  CZK: { symbol: 'Kč',  name: '捷克克朗' },
};

export const ZERO_DECIMAL = new Set(['TWD', 'JPY', 'KRW']);

export const CURRENCY_ORDER = [
  'TWD', 'EUR', 'USD', 'JPY', 'GBP', 'CHF',
  'AUD', 'HKD', 'CNY', 'KRW', 'THB', 'SGD',
  'CAD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK',
];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const getCurrency = (code) => CURRENCIES[code] || { symbol: code, name: code };

export function fmt(amount, currency = 'TWD') {
  const sym = getCurrency(currency).symbol;
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : 2;
  return `${sym} ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
