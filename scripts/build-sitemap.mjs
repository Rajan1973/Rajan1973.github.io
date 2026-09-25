#!/usr/bin/env node
/* Generate sitemap.xml from the actual manifests + repo contents, so every
 * report and sector review is discoverable by search/LLM crawlers — not just
 * the one or two entries someone remembered to add by hand.
 *
 *   node scripts/build-sitemap.mjs
 *
 * Run this after publishing a new daily brief or sector review (the publish
 * skill / sync-sectors.mjs can call it automatically — see docs), then commit
 * sitemap.xml and push.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SITE = 'https://rajan1973.github.io';

const reports = JSON.parse(readFileSync(join(ROOT, 'data/reports.json'), 'utf8')).reports || [];
const sectors = JSON.parse(readFileSync(join(ROOT, 'data/sectors.json'), 'utf8')).sectors || [];
const today = new Date().toISOString().slice(0, 10);

const urls = [];
const add = (loc, lastmod, changefreq, priority) => urls.push({ loc, lastmod, changefreq, priority });

// the app shell + the two hand-authored static pages
add(SITE + '/', today, 'daily', '1.0');
add(SITE + '/rotation/', today, 'daily', '0.7');
if (existsSync(join(ROOT, 'guide.html'))) add(SITE + '/guide.html', today, 'monthly', '0.5');

// every daily brief actually present in the manifest AND on disk
for (const r of reports) {
  if (!existsSync(join(ROOT, r.path))) { console.warn('  skip (file missing): ' + r.path); continue; }
  add(SITE + '/' + r.path, r.id.slice(0, 10), 'never', '0.7');
}

// every published sector review actually present in the manifest AND on disk
for (const s of sectors) {
  if (s.status !== 'published' || !s.path) continue;
  if (!existsSync(join(ROOT, s.path))) { console.warn('  skip (file missing): ' + s.path); continue; }
  add(SITE + '/' + s.path, today, 'monthly', '0.6');
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) =>
    `  <url>\n` +
    `    <loc>${u.loc}</loc>\n` +
    `    <lastmod>${u.lastmod}</lastmod>\n` +
    `    <changefreq>${u.changefreq}</changefreq>\n` +
    `    <priority>${u.priority}</priority>\n` +
    `  </url>`
  ).join('\n') +
  `\n</urlset>\n`;

writeFileSync(join(ROOT, 'sitemap.xml'), xml);
console.log(`wrote sitemap.xml with ${urls.length} URLs (${reports.length} reports, ${sectors.filter((s) => s.status === 'published').length} sectors, 3 static pages)`);
