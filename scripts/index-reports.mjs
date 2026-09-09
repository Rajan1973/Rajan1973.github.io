#!/usr/bin/env node
/* Populate `mentions` on every entry in data/reports.json by scanning the
 * report HTML each entry points at. `mentions` is the set of listed companies /
 * tickers named in that edition (scanners, momentum tables, sector rows), so the
 * ⌘K search can surface a daily brief when you search a stock.
 *
 *   node scripts/index-reports.mjs [baseDir]   [--only 2026-09-10]
 *
 * baseDir defaults to the repo root (where data/ and reports/ live). Run it after
 * adding a new brief, before committing:
 *   node scripts/index-reports.mjs && git add data/reports.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { extractNames } from './lib/extract.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const argv = process.argv.slice(2);
const only = (() => { const i = argv.indexOf('--only'); return i >= 0 ? argv[i + 1] : null; })();
const BASE = resolve(argv.find((a) => !a.startsWith('--') && a !== only) || ROOT);
const MANIFEST = join(ROOT, 'data/reports.json');

const data = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let done = 0, missing = 0;
for (const r of data.reports) {
  if (only && r.id !== only) continue;
  const f = join(BASE, r.path);
  if (!existsSync(f)) { missing++; console.warn('  missing: ' + r.path); continue; }
  const names = extractNames(readFileSync(f, 'utf8'));
  if (names.length) r.mentions = names; else delete r.mentions;
  done++;
  console.log('  ' + r.id.padEnd(16) + names.length + ' names' + (names.length ? '  ·  ' + names.slice(0, 10).join(', ') + (names.length > 10 ? ' …' : '') : ''));
}

writeFileSync(MANIFEST, JSON.stringify(data, null, 2) + '\n');
console.log(`\nindexed ${done} report(s)${missing ? `, ${missing} html file(s) not found under ${BASE}` : ''} -> data/reports.json`);
