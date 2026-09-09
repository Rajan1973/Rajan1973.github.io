# Deploying NIFTY & BEYOND

## The model: one repo, two hosts

Everything ships in **one repo — `Rajan1973/Rajan1973.github.io`**:

```
Rajan1973.github.io/
├─ index.html            ← THIS app (was: the hand-made archive page → legacy-index.html)
├─ assets/               ← app.css, app.js, logo.svg
├─ data/                 ← reports.json, sectors.json  (the two manifests)
├─ rotation/             ← the RRG app (self-contained; its own read-only Supabase)
├─ sectors/              ← the Q1 FY27 sector reviews (21 files)
├─ scripts/              ← sync-sectors.mjs
├─ reports/2026/**       ← the daily briefs — UNCHANGED, still pushed by the market-data pipeline
├─ guide.html            ← UNCHANGED
├─ googleed5170282d29d728.html   ← UNCHANGED (Search Console)
├─ sitemap.xml  .nojekyll        ← UNCHANGED
└─ legacy-index.html     ← the old landing page, kept reachable as a fallback
```

Then **two hosts serve that same repo**:

| Host | URL | Role |
|---|---|---|
| GitHub Pages | `rajan1973.github.io` | stays exactly as today — Blogger iframes and every existing deep link keep working |
| **Vercel** | `nifty-and-beyond.vercel.app` (or a custom domain) | the polished front door |

**Why this is the Vercel-ready answer:** because `reports/` and `sectors/` live *in the deployment*, the app references them as `/reports/…` and `/sectors/…` — **same-origin on both hosts**, so the embedded report/sector frames auto-expand to full height with no proxy, no `vercel.json`, no CORS. Every push (daily brief, new sector review, app tweak) redeploys **both** hosts automatically. `localhost` is the only special case, and the app already handles it (falls back to the absolute `rajan1973.github.io` URL for reports).

---

## Step A — put the app into the site repo

From a clean clone of `https://github.com/Rajan1973/Rajan1973.github.io`:

```bash
git switch -c unify-nifty-and-beyond

# 1. keep the old landing page as a fallback (git history keeps it regardless)
git mv index.html legacy-index.html

# 2. copy this project in at the root  (adjust <src>)
SRC="D:/codex-projects/nifty-and-beyond"
cp    "$SRC/index.html"      index.html
cp -r "$SRC/assets"          assets
cp -r "$SRC/data"            data
cp -r "$SRC/rotation"        rotation
cp -r "$SRC/sectors"         sectors
cp -r "$SRC/scripts"         scripts
cp    "$SRC/.gitignore"      .gitignore     # merge if one already exists

# 3. do NOT touch: reports/**, guide.html, googleed5170282d29d728.html, sitemap.xml, .nojekyll

git add -A
git commit -m "Unify site under NIFTY & BEYOND research desk (app + RRG + 21 sector reviews)"
git push -u origin unify-nifty-and-beyond
```

Open a PR, merge to `main`. GitHub Pages redeploys in ~1 min. Verify:

1. `https://rajan1973.github.io/` → the new app.
2. `#/report` → the iframe **auto-expands** (same-origin now), no inner scrollbar.
3. `#/sectors/metals-mining` → the review renders in place.
4. `#/rotation` → the RRG graph loads.
5. `https://rajan1973.github.io/reports/2026/09/20260909.html` → still resolves (untouched).
6. `https://rajan1973.github.io/legacy-index.html` → the old page, as a safety net.

Nothing about the Blogger embed changes — it points at `reports/**` HTML directly, not at this app.

---

## Step B — connect Vercel to the same repo

1. **vercel.com → Add New → Project → Import Git Repository** → pick
   `Rajan1973/Rajan1973.github.io`.
2. Configure Project:
   - **Framework Preset:** `Other`
   - **Build Command:** *(empty — turn off "Override")*
   - **Output Directory:** *(empty — serves the repo root)*
   - **Install Command:** *(empty)*
   - **Root Directory:** `./`
3. **Deploy.** You get `https://<project>.vercel.app`.
4. In **Project → Settings → Git**, confirm **Production Branch = `main`**. Every
   push to `main` now redeploys Vercel too.
5. Leave **Settings → General → Clean URLs** and **Trailing Slash** at their
   defaults (off). The site relies on literal `…/YYYYMMDD.html` URLs.

That's the whole deploy. No `vercel.json` is needed; add one only if you later
want redirects or headers.

### Optional — custom domain

**Settings → Domains → Add.** Point a domain (e.g. `niftyandbeyond.com`) at
Vercel per its DNS instructions. If you do, set `site_base` in
`data/reports.json` to that domain so "Open in new tab" links stay on-brand, and
add it as `og:url` / canonical in `index.html`.

---

## Ongoing updates

Both manifests are plain JSON; edit, commit, push — both hosts redeploy.

### New daily brief  (`upload-post-mkt-report` skill)

Today the skill hand-edits the old `index.html`. After the merge it should
instead **prepend one object to `data/reports.json` → `reports[]`**:

```json
{
  "id": "2026-09-10",
  "date_short": "10 Sep 2026",
  "date_long": "Thursday, 10 September 2026",
  "kind": "Daily brief",
  "k": "daily",
  "headline": "…the report's own headline, no site prefix…",
  "path": "reports/2026/09/20260910.html",
  "tags": ["Nifty …", "Breadth …", "FII …"]
}
```

- `id` = `YYYY-MM-DD`; second same-day artefact (pre-expiry F&O) gets a suffix (`2026-08-25-fo`).
- `k` ∈ `daily | expiry | fo | weekly` — drives colour + the archive filter.
- `path` relative to the repo root, digits-only filename per the existing convention.
- 5–7 short `tags`; the archive card shows the first four.
- Newest object goes **first**. Home, the report switcher, archive and search all read from this file — nothing else to change.

### New / updated sector reviews

The reviews are generated in the separate `rajan-sector-analysis` project. To
pull them in:

```bash
node scripts/sync-sectors.mjs "D:/path/to/that/project"
# copies every *-q1fy27*.html into sectors/ and regenerates data/sectors.json
git add sectors data/sectors.json && git commit -m "Sync sector reviews" && git push
```

Order and the one-line blurbs live in the `LADDER` array at the top of
`scripts/sync-sectors.mjs` — edit there, not in the generated JSON. A future
quarter: bump `QUARTER` in that script (and add a `q2fy27` glob) or keep both
quarters by giving the new files distinct slugs.

### RRG app refresh

Nothing to do here — the embedded app reads live from its own project. To pull a
newer build of the app shell:

```bash
curl -sL https://raw.githubusercontent.com/Rajan1973/rrg-nifty-indices/main/rrg_app_updated.html -o rotation/index.html
curl -sL https://raw.githubusercontent.com/Rajan1973/rrg-nifty-indices/main/rrg-user-manual.html -o rotation/user-manual.html
```

It carries only a **publishable, read-only** Supabase key — safe to commit.

---

## Rollback

- App regression: `legacy-index.html` is still live; swap the two files back with
  `git mv` and push. GitHub Pages and Vercel both revert on the next deploy.
- Vercel only: **Deployments → pick a previous one → Promote to Production**.
