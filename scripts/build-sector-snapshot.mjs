#!/usr/bin/env node
/* Build data/sector-snapshot.json from the published sector reviews, so the
 * Sector research desk can show per-quarter performance and stock lookups.
 *
 *   node scripts/build-sector-snapshot.mjs
 *
 * Run after sync-sectors.mjs whenever a review is published or refreshed.
 * Curated flags live in data/sector-notes.json (see its $comment).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { buildSnapshot } from './lib/snapshot.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const manifest = JSON.parse(read('data/sectors.json'));
const notes = existsSync(join(ROOT, 'data/sector-notes.json')) ? JSON.parse(read('data/sector-notes.json')) : {};
const snap = buildSnapshot(manifest, (p) => (existsSync(join(ROOT, p)) ? read(p) : null), notes);
snap.generated = new Date().toISOString().slice(0, 10);
writeFileSync(join(ROOT, 'data/sector-snapshot.json'), JSON.stringify(snap, null, 2) + '\n');
const withRet = snap.sectors.filter((s) => s.hasReturns).length;
console.log(`wrote data/sector-snapshot.json: ${snap.sectors.length} published reviews, ${withRet} with return data`);
