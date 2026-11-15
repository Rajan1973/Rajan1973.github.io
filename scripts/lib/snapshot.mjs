/* Sector snapshot — pulls the stock-level returns and promised-vs-delivered
 * verdicts out of each published sector review, and summarises them per sector.
 *
 * Only the blocks every new-template review shares are read (RET, SCORE). Older
 * reviews without them come back with `returns: null` and are reported as
 * "no return data" rather than silently counted as zero.
 */
import vm from 'node:vm';

const MINUS = /[−–]/g; // unicode minus / en dash → ASCII hyphen

export function parseNum(v) {
  if (v == null) return null;
  const s = String(v).replace(MINUS, '-').replace(/[%,+*₹\s]/g, '').replace(/\(.*\)/, '');
  if (!s || /n\/?d|nil|na|n\/a/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Evaluate a `const NAME = [ ... ];` literal from a review page. The arrays are data
// literals written by our own renderer; vm with no globals and a timeout keeps it inert.
export function readArray(html, name) {
  const m = html.match(new RegExp('const ' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\]);'));
  if (!m) return null;
  try {
    return vm.runInNewContext('(' + m[1] + ')', Object.create(null), { timeout: 500 });
  } catch {
    return null;
  }
}

const VERDICTS = new Set(['del', 'part', 'miss']);

// Template rows left in a review ("Company A" / "TICKER"). They are not real stocks,
// so they are kept out of the statistics and surfaced as a note instead.
export const isPlaceholder = (r) => r.ticker === 'TICKER' || /^Company [A-Z]$/.test(r.name);

export function readReview(html) {
  const ret = readArray(html, 'RET');
  const score = readArray(html, 'SCORE');
  const returns = Array.isArray(ret)
    ? ret.filter((r) => Array.isArray(r) && r[0]).map((r) => ({
        name: String(r[0]),
        ticker: String(r[1] || ''),
        resultsDate: String(r[2] || ''),
        cmp: parseNum(r[3]),
        r1y: parseNum(r[4]),
        r6m: parseNum(r[5]),
        r3m: parseNum(r[6]),
        mtd: parseNum(r[7]),
      }))
    : null;
  const verdicts = Array.isArray(score)
    ? score.filter((r) => Array.isArray(r) && VERDICTS.has(r[3])).map((r) => ({ name: String(r[0]), verdict: r[3] }))
    : null;
  return { returns, verdicts };
}

const median = (xs) => {
  const v = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

// One sector's summary: the numbers the snapshot table shows.
export function summarise(returns, verdicts) {
  const rows = returns || [];
  const dirs = (k) => {
    let pos = 0, neg = 0, pnd = 0;
    for (const r of rows) {
      if (r[k] == null) pnd++; else if (r[k] > 0) pos++; else if (r[k] < 0) neg++; else pnd++;
    }
    return { pos, neg, pnd };
  };
  const counts = { del: 0, part: 0, miss: 0 };
  for (const v of verdicts || []) counts[v.verdict]++;
  return {
    covered: rows.length,
    pos3m: dirs('r3m').pos, neg3m: dirs('r3m').neg, pnd3m: dirs('r3m').pnd,
    median: { mtd: median(rows.map((r) => r.mtd)), r3m: median(rows.map((r) => r.r3m)), r6m: median(rows.map((r) => r.r6m)), r1y: median(rows.map((r) => r.r1y)) },
    verdicts: counts,
  };
}

// quarter label "Q2 FY27" → sortable number (FY27 Q2 = 2727.2)
export function quarterKey(q) {
  const m = String(q || '').match(/Q(\d)\s*FY(\d{2})/i);
  return m ? Number(m[2]) + Number(m[1]) / 10 : 0;
}

// notes: curated { [sectorId]: [{ ticker, note }] } from data/sector-notes.json.
export function buildSnapshot(manifest, readHtml, notes = {}) {
  const sectors = [];
  for (const s of manifest.sectors || []) {
    if (s.status !== 'published' || !s.path) continue;
    const html = readHtml(s.path);
    const { returns, verdicts } = html ? readReview(html) : { returns: null, verdicts: null };
    const real = (returns || []).filter((r) => !isPlaceholder(r));
    const flags = (returns || []).filter(isPlaceholder).map((r) => ({
      ticker: '—', // the template ticker is a literal "TICKER", not a real symbol
      note: 'Template placeholder row "' + r.name + '" left in the review; excluded from the figures.',
    }));
    sectors.push({
      id: s.id,
      name: s.name,
      quarter: s.quarter,
      path: s.path,
      hasReturns: real.length > 0,
      summary: summarise(real, verdicts),
      stocks: real,
      notes: [...(notes[s.id] || []), ...flags],
    });
  }
  const quarters = [...new Set(sectors.map((s) => s.quarter))].sort((a, b) => quarterKey(b) - quarterKey(a));
  return { quarters, sectors };
}
