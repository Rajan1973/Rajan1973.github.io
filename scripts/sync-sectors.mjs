#!/usr/bin/env node
/* Sync sector earnings reviews into the app — additive only, never overwrites
 * a sector that is already published.
 *
 *   node scripts/sync-sectors.mjs ["<dir>" "<dir2>" ...]
 *   node scripts/sync-sectors.mjs --refresh cement,defence   ["<dir>" ...]
 *
 * Three sources are merged:
 *   1. Whatever is already in data/sectors.json is kept EXACTLY as is — your
 *      hand edits (note, name, status) and the file already in sectors/ are
 *      never touched by a plain run. This is the important change: the old
 *      version regenerated the whole manifest from the source dirs every run,
 *      which meant a sector published straight from a manual GitHub upload
 *      (no matching file in either source dir on this machine) would be
 *      silently DELETED the next time this script ran.
 *   2. The external source dir(s) given as args (default: the two local
 *      rajan-sector-analysis project folders) — but only for slugs that are
 *      NOT already known. A slug already in data/sectors.json is skipped
 *      here; pass --refresh to force re-copying specific slugs.
 *   3. Any *.html file that is ALREADY sitting in sectors/ but has no manifest
 *      entry at all — e.g. one uploaded straight to GitHub's web UI without a
 *      matching data/sectors.json edit. It gets a generated entry (title +
 *      covers extracted from its own HTML) instead of sitting there unlinked.
 *
 * Re-run any time — after the sector project produces new reviews, or after a
 * manual "Add file" upload to sectors/ on github.com — then commit
 * sectors/ + data/sectors.json and push; GitHub Pages and Vercel redeploy on
 * their own.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { extractNames } from './lib/extract.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const rawArgs = process.argv.slice(2).filter(Boolean);
let REFRESH = new Set();
const SRCS = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === '--refresh') { REFRESH = new Set((rawArgs[++i] || '').split(',').filter(Boolean)); }
  else if (a.startsWith('--refresh=')) { REFRESH = new Set(a.slice('--refresh='.length).split(',').filter(Boolean)); }
  else SRCS.push(a);
}
if (!SRCS.length) SRCS.push(process.env.SECTOR_SRC || 'D:/Anti Gravity/stock-reports-with-Antigravity',
                            'D:/Anti Gravity/equity-os/data/sectors');
const OUT_DIR = join(ROOT, 'sectors');
const MANIFEST = join(ROOT, 'data', 'sectors.json');
const QUARTER = 'Q1 FY27';

/* Ladder order + curated blurbs, keyed by normalised slug. An unlisted slug still
 * syncs (appended alphabetically, blank note) — add it here for a fixed
 * position and a one-line blurb. */
const LADDER = [
  ['auto-ancillaries',        'OEM demand, EV mix, export exposure'],
  ['bearings',                'Industrial + auto aftermarket cycle'],
  ['bess',                    'Grid-scale storage order pipeline'],
  ['cables-wires',            'Capex cycle, capacity additions, margins'],
  ['capital-goods-large',     'Order book, execution, working capital'],
  ['cement',                  'Pricing discipline, volume growth, cost curve'],
  ['defence',                 'Indigenisation, order inflow, export wins'],
  ['diagnostic-chains',       'Volume growth, pricing, network expansion'],
  ['ems',                     'PLI, customer concentration, RoCE'],
  ['epc',                     'Order book to sales, leverage, NWC days'],
  ['pipes-building-materials', 'PVC spreads, volume growth, housing demand'],
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
  ['small-finance-banks',     'NIM compression, MFI stress, SFB-to-universal-bank transition'],
  ['speciality-chemicals',    'Pricing recovery, China+1, utilisation'],
  ['textiles',                'Cotton cost, US demand, PLI capacity'],
  ['vehicle-finance-gold-loans', 'Gold-loan yield competition, vehicle-finance rate-cut tailwind'],
];
const NOTE = new Map(LADDER);
const ORDER = new Map(LADDER.map(([s], i) => [s, i]));

const ALIAS = { autoancillaries: 'auto-ancillaries', 'epc-infrastructure': 'epc', 'recycling-waste': 'recycling' };
const normSlug = (name) => {
  const s = basename(name, '.html').replace(/-sector-review$/, '').replace(/-q1fy27$/, '');
  return ALIAS[s] || s;
};

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
    'power-ancillaries': 'Power Ancillaries', 'small-finance-banks': 'Small Finance Banks',
    'vehicle-finance-gold-loans': 'Vehicle Finance & Gold Loans',
  };
  return nice[slug] || clean(title) || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const entryFrom = (slug, outName, html, keepNote) => ({
  id: slug,
  name: displayName(slug, titleOf(html)),
  quarter: QUARTER,
  status: 'published',
  path: 'sectors/' + outName,
  title: titleOf(html) || displayName(slug),
  note: keepNote || NOTE.get(slug) || '',
  covers: extractNames(html),
});

mkdirSync(OUT_DIR, { recursive: true });

// 1. start from whatever is already published — a plain run touches NONE of it.
const existing = existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')).sectors || []) : [];
const bySlug = new Map(existing.map((s) => [s.id, s]));
const changed = [];

// 2. add slugs that are genuinely new (or explicitly --refresh'd) from the
//    external source dirs. Everything else already known is left alone.
const claimedThisRun = new Set();
for (const SRC of SRCS) {
  if (!existsSync(SRC)) { console.warn('skip (not found): ' + SRC); continue; }
  const files = readdirSync(SRC).filter((f) =>
    /q1fy27/i.test(f) && /\.html?$/i.test(f) && !/deepdive|deep-dive/i.test(f));
  for (const f of files) {
    const slug = normSlug(f);
    if (claimedThisRun.has(slug)) continue;              // first source dir wins for this run
    const isNew = !bySlug.has(slug);
    if (!isNew && !REFRESH.has(slug)) continue;           // already published — skip unless --refresh
    claimedThisRun.add(slug);
    const html = readFileSync(join(SRC, f), 'utf8');
    const outName = slug + '-q1fy27.html';
    copyFileSync(join(SRC, f), join(OUT_DIR, outName));
    const prev = bySlug.get(slug);
    bySlug.set(slug, entryFrom(slug, outName, html, prev && prev.note));
    changed.push((isNew ? '+ added   ' : '~ refreshed') + ' ' + slug);
  }
}

// 3. adopt any file already sitting in sectors/ with no manifest entry at all —
//    the manual-upload case this script exists to fix.
const knownFiles = new Set([...bySlug.values()].map((s) => basename(s.path)));
const onDisk = readdirSync(OUT_DIR).filter((f) => /\.html?$/i.test(f));
for (const f of onDisk) {
  if (knownFiles.has(f)) continue;
  const slug = normSlug(f);
  if (bySlug.has(slug)) continue;                        // same sector already covered under a different filename
  const html = readFileSync(join(OUT_DIR, f), 'utf8');
  bySlug.set(slug, entryFrom(slug, f, html));
  changed.push('+ adopted  ' + slug + '  (was on disk with no manifest entry)');
}

if (!bySlug.size) { console.error('nothing to write — no existing manifest and no *-q1fy27*.html found in: ' + SRCS.join(', ')); process.exit(1); }

const sectors = [...bySlug.values()]
  .sort((a, b) => (ORDER.has(a.id) ? ORDER.get(a.id) : 999) - (ORDER.has(b.id) ? ORDER.get(b.id) : 999) || a.name.localeCompare(b.name));

writeFileSync(MANIFEST, JSON.stringify({
  $comment: 'Maintained by scripts/sync-sectors.mjs. A plain run only ADDS sectors — it never rewrites an ' +
            'already-published entry or its file. Use --refresh <slug1,slug2> to force re-copy specific ones. ' +
            'Edit LADDER in that script for order/blurbs.',
  quarter: QUARTER,
  sectors,
}, null, 2) + '\n');

if (changed.length) {
  console.log(changed.length + ' change(s):');
  for (const c of changed) console.log('  ' + c);
} else {
  console.log('no changes — everything already known and no --refresh requested.');
}
console.log('\nsectors/ + data/sectors.json now hold ' + sectors.length + ' reviews:');
for (const s of sectors) console.log('  ' + s.id.padEnd(28) + s.name);
