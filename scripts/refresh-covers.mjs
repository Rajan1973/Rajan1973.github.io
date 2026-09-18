#!/usr/bin/env node
/* Re-extract `covers` (companies/tickers) for every sector already in
 * data/sectors.json, straight from the file already published in sectors/ —
 * no external source dir needed, no file is re-copied or overwritten.
 *
 * Useful whenever scripts/lib/extract.mjs learns a new markup pattern (e.g. a
 * report template that renders company cards via JS instead of static HTML)
 * and older entries were left with a thin or empty `covers` list.
 *
 *   node scripts/refresh-covers.mjs            # every sector
 *   node scripts/refresh-covers.mjs cement bess # just these slugs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { extractNames } from './lib/extract.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const MANIFEST = join(ROOT, 'data', 'sectors.json');
const only = new Set(process.argv.slice(2).filter(Boolean));

const data = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let changed = 0;
for (const s of data.sectors) {
  if (only.size && !only.has(s.id)) continue;
  const f = join(ROOT, s.path);
  if (!existsSync(f)) { console.warn('  missing file, skipped: ' + s.path); continue; }
  const covers = extractNames(readFileSync(f, 'utf8'));
  const before = (s.covers || []).length;
  s.covers = covers;
  if (covers.length !== before) changed++;
  console.log('  ' + s.id.padEnd(28) + before + ' -> ' + covers.length + ' names');
}

writeFileSync(MANIFEST, JSON.stringify(data, null, 2) + '\n');
console.log('\nupdated covers for ' + (only.size || data.sectors.length) + ' sector(s), ' + changed + ' changed count.');
