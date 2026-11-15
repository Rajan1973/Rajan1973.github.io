#!/usr/bin/env node
/* Self-check for scripts/lib/snapshot.mjs. Run: node scripts/test-snapshot.mjs */
import assert from 'node:assert/strict';
import { parseNum, readReview, summarise, quarterKey, isPlaceholder, buildSnapshot } from './lib/snapshot.mjs';

// number parsing: sign styles, units, not-disclosed markers
assert.equal(parseNum('+5.6%'), 5.6);
assert.equal(parseNum('-8.7%'), -8.7);
assert.equal(parseNum('−38.7%'), -38.7); // unicode minus
assert.equal(parseNum('12,268.0'), 12268);
assert.equal(parseNum('n/d'), null);
assert.equal(parseNum(''), null);
assert.equal(parseNum(undefined), null);

// quarter ordering: FY27 Q2 is newer than FY27 Q1, and FY28 Q1 is newer than both
assert.ok(quarterKey('Q2 FY27') > quarterKey('Q1 FY27'));
assert.ok(quarterKey('Q1 FY28') > quarterKey('Q2 FY27'));

// review parsing from an inline page fragment
const page = `
<script>
const RET=[["UltraTech", "ULTRACEMCO", "19 Oct 2026", "12,268.0", "+5.6%", "+4.8%", "+1.3%", "+11.1%"],
 ["Ramco", "RAMCOCEM", "early Nov", "831.60", "-19.5%", "-13.3%", "-10.9%", "n/d"]];
const SCORE=[["UltraTech","x","y","del","Delivered"],["Ramco","x","y","miss","Missed"],["Note row","x","y","other","?"]];
</script>`;
const r = readReview(page);
assert.equal(r.returns.length, 2);
assert.equal(r.returns[0].r3m, 1.3);
assert.equal(r.returns[1].mtd, null);
assert.equal(r.verdicts.length, 2, 'unknown verdict codes are dropped');

// summary: pos/neg/pnd counts on 3M, median ignores missing values
const s = summarise(r.returns, r.verdicts);
assert.equal(s.covered, 2);
assert.equal(s.pos3m, 1);
assert.equal(s.neg3m, 1);
assert.equal(s.pnd3m, 0);
assert.equal(s.median.r3m, (1.3 + -10.9) / 2);
assert.equal(s.median.mtd, 11.1);
assert.deepEqual(s.verdicts, { del: 1, part: 0, miss: 1 });

// a review with no returns block is reported as such, not as zero covered
const none = summarise(null, null);
assert.equal(none.covered, 0);
assert.equal(none.median.r3m, null);

// placeholder rows are detected, excluded from figures and flagged as notes
assert.ok(isPlaceholder({ name: 'Company A', ticker: 'TICKER' }));
assert.ok(!isPlaceholder({ name: 'Ramco', ticker: 'RAMCOCEM' }));
const fake = { sectors: [{ id: 'x', name: 'X', quarter: 'Q2 FY27', path: 'x.html', status: 'published' }] };
const html2 = page.replace('["Ramco", "RAMCOCEM"', '["Company A", "TICKER", "n/a", "1", "+1%", "+1%", "+1%", "+1%"],["Ramco", "RAMCOCEM"');
const snap = buildSnapshot(fake, () => html2, { x: [{ ticker: 'RAMCOCEM', note: 'Included in error' }] });
assert.equal(snap.sectors[0].stocks.length, 2, 'placeholder excluded from stocks');
assert.equal(snap.sectors[0].summary.covered, 2);
assert.equal(snap.sectors[0].notes.length, 1, 'only curated notes are shown; placeholders are excluded silently');
assert.deepEqual(snap.quarters, ['Q2 FY27']);

// a returns table where every value is n/s is not return data
const blank = buildSnapshot(fake, () => '<script>const RET=[["A","AAA","x","n/s","n/s","n/s","n/s","n/s"]];</script>', {});
assert.equal(blank.sectors[0].hasReturns, false);

console.log('snapshot self-check: all assertions passed');
