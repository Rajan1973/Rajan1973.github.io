/* Pull the set of listed companies / tickers a report HTML talks about, for search.
 * Used by sync-sectors.mjs (sector reviews) and index-reports.mjs (daily briefs).
 * Precision over recall — a stray token just makes a report surface once too often. */

// Not company tickers even though they look like ALL-CAPS symbols.
const STOP = new Set([
  'NIFTY', 'SENSEX', 'BANKNIFTY', 'FII', 'DII', 'FPI', 'HNI', 'MTD', 'YTD', 'WTD',
  'OI', 'PCR', 'ATR', 'RSI', 'ADX', 'SMA', 'EMA', 'DMA', 'VWAP', 'LTP', 'CMP',
  'EBITDA', 'EBIT', 'PAT', 'OPM', 'NPM', 'ROE', 'ROCE', 'ROA', 'EPS', 'PE', 'PB',
  'YOY', 'QOQ', 'MOM', 'BPS', 'CAGR', 'TTM', 'FY', 'FY26', 'FY27', 'FY28', 'Q1', 'Q2', 'Q3', 'Q4',
  'GDP', 'CPI', 'WPI', 'IIP', 'PMI', 'GST', 'RBI', 'MPC', 'SEBI', 'NSE', 'BSE', 'MCX', 'NSDL',
  'USD', 'INR', 'EUR', 'JPY', 'GBP', 'BRENT', 'WTI', 'MCX', 'COMEX',
  'US', 'UK', 'EU', 'IT', 'FMCG', 'PSU', 'AMC', 'NBFC', 'ETF', 'IPO', 'QIP', 'OFS', 'AGM', 'EGM',
  'SB', 'LB', 'SC', 'LU', 'CE', 'PE', 'ITM', 'OTM', 'ATM',
  'AND', 'THE', 'FOR', 'WITH', 'FROM', 'VIEW', 'READ', 'MORE', 'DATA', 'NOTE', 'TOTAL',
  'BUY', 'SELL', 'HOLD', 'ADD', 'BEAT', 'MISS', 'INLINE', 'HIGH', 'LOW', 'OPEN', 'CLOSE',
  'STOCK', 'SECTOR', 'INDEX', 'BREADTH', 'TREND', 'FLOW', 'SCORE', 'RANK', 'CHG', 'VOL',
  'IBM', 'GVT', 'CR', 'BN', 'MN', 'KG', 'MT',
]);

const looksTicker = (s) => /^[A-Z][A-Z0-9]*(?:&[A-Z0-9]+|\.[A-Z]+)?$/.test(s) && s.length >= 3 && s.length <= 16 && !STOP.has(s);

const cleanName = (s) => s
  .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'")
  .replace(/\s+/g, ' ').trim()
  .replace(/[·:,\-–—]+$/, '').trim();

const NAME_STOP = /^(Company|Metric|Stock|Sector|Ticker|Name|Score|Target|Rating|Analyst|Coverage|Strategic|Aggregate|Average|Combined|Total|Order Book|EV |Q1 |FY2|Wiring|JV |Global |Greenfield |Today|Commodit|Currenc|Comparison|Executive|Market |Macro|What'?s)/i;
// phrase-y words that mark a section heading rather than a company name
const PHRASE = /\b(vs|and|the|to|of|per|trade|off|gestation|period|impact|risk|slowdown|mix|ratio|trend|matrix|analysis|outlook|synthesis|guidance|commentary|localization|adoption|integration|expansion|pressure|point|share|revenue|margin|growth|cost|demand|capex|table|league|profile|forensics|disclaimer|commodity|commodities|currency|snapshot|confirmation|comparison|window|windows|bullet|bullets|cues|scorecard|dashboard|rotation|scanner|scanners|composite|regime|policy|breadth|participation)\b/i;
const looksName = (s) => /^[A-Z][A-Za-z]/.test(s) && / /.test(s) &&
  s.length >= 5 && s.length <= 34 && s.split(' ').length <= 4 &&
  /^[A-Za-z0-9 .&'()\-]+$/.test(s) && !NAME_STOP.test(s) && !PHRASE.test(s) &&
  (s.match(/[A-Z]/g) || []).length >= 2;

export function extractNames(html) {
  const set = new Set();

  // 1. explicit exchange tickers:  NSE: APOLLOHOSP   BSE: 500410
  for (const m of html.matchAll(/\b(?:NSE|BSE)\s*[:\-]\s*([A-Z0-9&.]{3,16})\b/g)) {
    if (looksTicker(m[1])) set.add(m[1]);
  }

  // 2. company-name cells in the sector-review tables / cards
  for (const m of html.matchAll(/<t[dh][^>]*class="[^"]*\bmono\b[^"]*"[^>]*>\s*([^<]{3,40})<\/t[dh]>/gi)) {
    const n = cleanName(m[1]); if (looksName(n)) set.add(n);
  }
  for (const m of html.matchAll(/<h3[^>]*>\s*([^<]{3,40})<\/h3>/gi)) {
    const n = cleanName(m[1]); if (looksName(n)) set.add(n);
  }

  // 3. daily-brief scanner rows:  <td>Stock</td><td>GRAPHITE</td>
  for (const m of html.matchAll(/<td[^>]*>\s*Stock\s*<\/td>\s*<td[^>]*>\s*([A-Z][A-Z0-9&.\- ]{2,24}?)\s*<\/td>/gi)) {
    const t = m[1].trim().toUpperCase().replace(/\s+/g, '');
    if (looksTicker(t)) set.add(t);
  }

  // 4. daily-brief momentum / continued-momentum tables:  first cell an ALL-CAPS symbol
  for (const m of html.matchAll(/<tr[^>]*>\s*<td[^>]*>\s*([A-Z][A-Z0-9&.]{2,15})\s*<\/td>/g)) {
    if (looksTicker(m[1])) set.add(m[1]);
  }

  return [...set].sort((a, b) => a.localeCompare(b));
}
