#!/usr/bin/env node
/* Safely prepend one edition to data/reports.json — no hand-editing, no comma risk.
 *
 *   node scripts/add-report.mjs \
 *     --id 2026-09-10 \
 *     --kind daily \
 *     --headline "Regime Holds as Breadth Quietly Recovers" \
 *     --path reports/2026/09/20260910.html \
 *     --tags "Nifty +0.42%; Breadth 280:210; FII +₹1,200 Cr; DII +₹900 Cr; VIX 10.9"
 *
 * --kind is one of: daily | expiry | fo | weekly   (default: daily)
 * --tags are separated by ";"  (4–7 short strings)
 * date_short / date_long are derived from --id unless you pass --weekly-ending
 *   (for a weekly review: --kind weekly --weekly-ending "10 January 2026")
 *
 * It refuses if the id already exists, validates the result parses, and writes
 * data/reports.json back with the file's existing 2-space style. Review the diff,
 * then commit + push:  git add reports data/reports.json && git commit -m "…" && git push
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const FILE = resolve(ROOT, 'data/reports.json');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[++i];
}

const die = (m) => { console.error('add-report: ' + m); process.exit(1); };

const id = args.id;
if (!id || !/^\d{4}-\d{2}-\d{2}(-[a-z0-9]+)?$/.test(id)) die('need --id YYYY-MM-DD (optionally -suffix, e.g. 2026-09-10-fo)');
const kind = (args.kind || 'daily').toLowerCase();
const KINDS = { daily: 'Daily brief', expiry: 'Expiry special', fo: 'F&O analysis', weekly: 'Weekly review' };
if (!KINDS[kind]) die('--kind must be one of: ' + Object.keys(KINDS).join(', '));
if (!args.headline || args.headline === true) die('need --headline "…"');
if (!args.path || args.path === true) die('need --path reports/YYYY/MM/YYYYMMDD.html');
if (!/^reports\/\d{4}\/\d{2}\/[a-z0-9]+\.html$/i.test(args.path)) die('--path looks wrong: ' + args.path);
const tags = String(args.tags || '').split(';').map((t) => t.trim()).filter(Boolean);
if (tags.length < 2) die('need --tags "a; b; c; d" (2–7 items)');

const ymd = id.slice(0, 10);
const d = new Date(ymd + 'T00:00:00Z');
if (isNaN(d)) die('bad date in --id');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dd = String(d.getUTCDate()).padStart(2, '0');
const date_short = `${dd} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const date_long = kind === 'weekly' && args['weekly-ending'] && args['weekly-ending'] !== true
  ? `Week ending ${args['weekly-ending']}`
  : `${WD[d.getUTCDay()]}, ${Number(dd)} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

const raw = readFileSync(FILE, 'utf8');
let data;
try { data = JSON.parse(raw); } catch (e) { die('data/reports.json does not parse: ' + e.message); }
if (!Array.isArray(data.reports)) die('data/reports.json has no reports[] array');
if (data.reports.some((r) => r.id === id)) die(`id "${id}" already present — nothing changed`);

const entry = { id, date_short, date_long, kind: KINDS[kind], k: kind, headline: args.headline, path: args.path, tags };
data.reports.unshift(entry);

const indent = (raw.match(/\n(\s+)"reports"/) || [, '  '])[1].length || 2;
writeFileSync(FILE, JSON.stringify(data, null, indent) + '\n');

console.log('added as newest entry:\n');
console.log(JSON.stringify(entry, null, 2));
console.log('\ndata/reports.json now lists ' + data.reports.length + ' editions. Review the diff, then:');
console.log('  git add reports data/reports.json && git commit -m "Add daily brief: ' + date_short + '" && git push');
