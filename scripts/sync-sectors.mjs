#!/usr/bin/env node
/* Sync sector earnings reviews into the app.
 *
 *   node scripts/sync-sectors.mjs "<source-dir>"
 *
 * <source-dir> defaults to $SECTOR_SRC or the local stock-reports project. It copies every
 *   *-q1fy27*.html  (minus obvious non-sector files)
 * into  sectors/<slug>-q1fy27.html  and regenerates  data/sectors.json,
 * preserving the curated one-line "note" for each slug and keeping ladder order.
 *
 * Re-run it whenever the other project produces new or updated reviews. Then commit
 * sectors/ + data/sectors.json and push — GitHub Pages and Vercel redeploy on their own.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SRC = process.argv[2] || process.env.SECTOR_SRC || 'D:/Anti Gravity/stock-reports-with-Antigravity';
const OUT_DIR = join(ROOT, 'sectors');
const MANIFEST = join(ROOT, 'data', 'sectors.json');
const QUARTER = 'Q1 FY27';

/* Ladder order + curated blurbs, keyed by normalised slug. Unknown slugs still sync
 * (appended, blank note) — add them here to give them a blurb and a fixed position. */
const LADDER = [
  ['auto-ancillaries',        'OEM demand, EV mix, export exposure'],
  ['bearings',                'Industrial + auto aftermarket cycle'],
  ['bess',                    'Grid-scale storage order pipeline'],
  ['cables-wires',            'Capex cycle, capacity additions, margins'],
  ['capital-goods-large',     'Order book, execution, working capital'],
  ['defence',                 'Indigenisation, order inflow, export wins'],
  ['diagnostic-chains',       'Volume growth, pricing, network expansion'],
  ['ems',                     'PLI, customer concentration, RoCE'],
  ['epc',                     'Order book to sales, leverage, NWC days'],
  ['gold-jewellery',          'SSSG, studded mix, store rollout'],
  ['hospital-chains',         'ARPOB, occupancy, bed-addition pipeline'],
  ['hotels',                  'RevPAR, room additions, F&B mix'],
  ['it-midcap',               'Deal TCV, vertical mix, margin defence'],
  ['metals-mining',           'Realisations, cost curve, China demand'],
  ['platform-fintech',        'Take rate, credit mix, unit economics'],
  ['power-ancillaries',       'T&D capex beneficiaries, tender wins'],
  ['power-generation',        'PLF, merchant tariffs, capacity pipeline'],
  ['power-transmission',      'TBCB wins, execution, RoE'],
  ['recycling',               'Feedstock access, realisations, regulation'],
  ['speciality-chemicals',    'Pricing recovery, China+1, utilisation'],
  ['textiles',                'Cotton cost, US demand, PLI capacity'],
];
const NOTE = new Map(LADDER);
const ORDER = new Map(LADDER.map(([s], i) => [s, i]));

const normSlug = (name) =>
  basename(name, '.html')
    .replace(/-sector-review$/, '')
    .replace(/-q1fy27$/, '')
    .replace(/-large$/, '-large')      // keep capital-goods-large distinct
    .replace(/^autoancillaries$/, 'auto-ancillaries');

const titleOf = (html) => {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
};
const clean = (title) => (title || '')
  .replace(/\bQ1\s*FY27\b/gi, '')
  .replace(/\bsector earnings review\b/gi, '')
  .replace(/[-–—:]\s*$/g, '')
  .replace(/^\s*[-–—:]/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();
const displayName = (slug, title) => {
  const nice = {
    'bess': 'Battery Energy Storage (BESS)', 'ems': 'Electronics Manufacturing (EMS)',
    'epc': 'EPC & Infrastructure', 'it-midcap': 'IT — Midcap',
    'capital-goods-large': 'Capital Goods (Large)', 'gold-jewellery': 'Gold Jewellery Retail',
    'platform-fintech': 'Platform Fintech', 'recycling': 'Recycling & Waste',
    'hotels': 'Hotels', 'diagnostic-chains': 'Diagnostic Chains', 'hospital-chains': 'Hospital Chains',
    'power-ancillaries': 'Power Ancillaries',
  };
  return nice[slug] || clean(title) || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/* Company names + tickers covered by a review, for search.
 * The reviews use a consistent card head:
 *   <h3>Motherson Sumi</h3><div class="tick">NSE: MOTHERSON • Large Cap</div>
 * plus analyst-table ticker cells. Pull both, dedupe, drop obvious noise. */
const coversOf = (html) => {
  const set = new Set();
  for (const m of html.matchAll(/<h3>\s*([A-Z][^<]{1,40}?)\s*<\/h3>\s*<div class="tick">\s*(?:NSE|BSE)\s*:\s*([A-Z0-9&.\-]{2,20})/gi)) {
    set.add(m[1].replace(/\s+/g, ' ').trim());
    set.add(m[2].trim().toUpperCase());
  }
  for (const m of html.matchAll(/(?:NSE|BSE)\s*:\s*([A-Z0-9&.\-]{2,20})\b/g)) set.add(m[1].toUpperCase());
  const NOISE = new Set(['NSE', 'BSE', 'EBITDA', 'OPM', 'CMP', 'BUY', 'SELL', 'HOLD', 'BEAT', 'MISS', 'FY27', 'FY26', 'ADD', 'PAT', 'YOY', 'QOQ', 'ROE', 'ROCE']);
  return [...set].filter((x) => x && !NOISE.has(x)).sort();
};

if (!existsSync(SRC)) { console.error('source dir not found: ' + SRC); process.exit(1); }
mkdirSync(OUT_DIR, { recursive: true });

const files = readdirSync(SRC).filter((f) =>
  /q1fy27/i.test(f) && /\.html?$/i.test(f) && !/deepdive|deep-dive/i.test(f));

if (!files.length) { console.error('no *-q1fy27*.html files in ' + SRC); process.exit(1); }

const sectors = [];
for (const f of files) {
  const slug = normSlug(f);
  const html = readFileSync(join(SRC, f), 'utf8');
  const outName = slug + '-q1fy27.html';
  copyFileSync(join(SRC, f), join(OUT_DIR, outName));
  sectors.push({
    id: slug,
    name: displayName(slug, titleOf(html)),
    quarter: QUARTER,
    status: 'published',
    path: 'sectors/' + outName,
    title: titleOf(html) || displayName(slug),
    note: NOTE.get(slug) || '',
    covers: coversOf(html),
  });
}
sectors.sort((a, b) => (ORDER.has(a.id) ? ORDER.get(a.id) : 999) - (ORDER.has(b.id) ? ORDER.get(b.id) : 999) || a.name.localeCompare(b.name));

writeFileSync(MANIFEST, JSON.stringify({
  $comment: 'Generated by scripts/sync-sectors.mjs from the rajan-sector-analysis outputs. ' +
            'Edit LADDER in that script for order/blurbs; do not hand-edit this file.',
  quarter: QUARTER,
  sectors,
}, null, 2) + '\n');

console.log('synced ' + sectors.length + ' sector reviews -> sectors/  +  data/sectors.json');
for (const s of sectors) console.log('  ' + s.id.padEnd(22) + '  ' + s.name);
