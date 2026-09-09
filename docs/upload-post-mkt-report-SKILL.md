---
name: upload-post-mkt-report
description: >
  Publish a generated "NIFTY & BEYOND" daily market brief to GitHub Pages (rajan1973.github.io) and prepare it for Blogger (nifty-vanakkam.blogspot.com). The site is now the unified NIFTY & BEYOND research app — the archive/latest are driven by data/reports.json, NOT by index.html. This skill copies the correctly-named report file into reports/YYYY/MM/, prepends one entry to data/reports.json, and produces the Blogger iframe code. Use whenever the user says "upload the report", "publish the report", "post to github pages", "post to blogger", "publish today's report", or asks to get a just-generated daily brief live on the site.
---

# Upload the Daily Brief — GitHub Pages + Blogger

Takes a report produced by the **market-data renderer** and gets it live in two
places: **rajan1973.github.io** (GitHub Pages, source of truth) and
**nifty-vanakkam.blogspot.com** (Blogger, which embeds the GitHub-hosted page in
an iframe).

> **Site change, 2026-09-10.** `rajan1973.github.io` is now the **unified NIFTY &
> BEYOND app** (`index.html` = a hash-routed single-page app; the old hand-made
> archive page is preserved as `legacy-index.html`). The app is also served from
> Vercel off the same repo. **The archive, "latest" card and search are all
> driven by `data/reports.json`.** This skill no longer edits `index.html` —
> touching `index.html` or `legacy-index.html` is now a mistake. Every push to
> `main` redeploys both GitHub Pages and Vercel automatically (~1–2 min).

Fixed facts about this setup, don't re-derive them each run:

| Thing | Value |
|---|---|
| Report name | **NIFTY & BEYOND** — tagline *"What the index doesn't tell you"* |
| Source file | `D:\Claude Projects\market-data\reports\YYYY-MM-DD-daily-brief.html` |
| Produced by | `npm run render-report` in `market-data` (never hand-written) |
| GitHub repo | `Rajan1973/Rajan1973.github.io` |
| Live site | `https://rajan1973.github.io` and `https://rajan1973-github-io.vercel.app` |
| Report path convention | `reports/YYYY/MM/YYYYMMDD.html` |
| **Filename convention** | **`YYYYMMDD.html`** — digits only, e.g. `20260902.html`. Special types append a bare word, still no separator: `20260904weekly.html`, `20260908fo.html`. An expiry-day daily uses the plain name — it replaces that day's slot, never duplicates it. |
| App manifest | `data/reports.json` in the repo root — the one file this skill edits |
| Blogger | `https://nifty-vanakkam.blogspot.com` — posts embed the GitHub Pages report via iframe, not native Blogger content |

---

## Step 0 — Figure out what you're publishing

The report is generated, not written. If it does not exist yet for the target
date, produce it first:

```bash
npm run build-report-pack && npm run render-report
```

Both default to the latest trading day; the output filename tells you the date.

**Check which edition you have before publishing.** The renderer produces two:

| Edition | When | Publish it? |
|---|---|---|
| **Full** | A narrative file exists at `reports/narrative/YYYY-MM-DD.json` | **Yes** |
| **Data-only** | No narrative file | **No, unless the user says otherwise** |

A data-only edition renders the eight Supabase-fed sections complete and shows an
explicit *pending* block for the six needing web, Kite or judgement. The renderer
prints which mode it used. If it says `DATA-ONLY`, say so and confirm before
going further.

**Where to read the facts for the manifest entry.** Take them from the report's
own **§1 Executive Scorecard** and its labelled narrative bullets — do not
re-derive them. You need: the headline, Nifty close and %, breadth, FII/DII net,
and 4–7 short tag strings. **§2 Market Regime**'s band is often the sharpest tag.

---

## Step 1 — Read the live `data/reports.json` before touching anything

**Every time, no exceptions.** It is hand-maintained state — editing a stale copy
silently drops entries added since you last saw it.

Fetch it fresh — `WebFetch` on
`https://raw.githubusercontent.com/Rajan1973/Rajan1973.github.io/main/data/reports.json`,
or clone the repo. Read the top of the `reports` array so you know the current
newest `id` and the exact object shape. **The live version wins** — edit that,
never a guessed reconstruction.

---

## Step 2 — Prepend one entry to `data/reports.json`

The file looks like:

```json
{
  "site_base": "https://rajan1973.github.io/",
  "embed_base": "/",
  "blogger": "https://nifty-vanakkam.blogspot.com",
  "reports": [
    { …newest edition… },
    { …older… }
  ]
}
```

Insert **one new object as the first element of `reports[]`**. Shape:

```json
{
  "id": "2026-09-10",
  "date_short": "10 Sep 2026",
  "date_long": "Thursday, 10 September 2026",
  "kind": "Daily brief",
  "k": "daily",
  "headline": "The report's own headline hook — no date prefix, no site name",
  "path": "reports/2026/09/20260910.html",
  "tags": ["Nifty −0.39%", "Breadth 172:326", "FII −₹503 Cr", "Regime 46 Neutral"]
}
```

Field rules:

| Field | Rule |
|---|---|
| `id` | `YYYY-MM-DD`. A second same-day artefact (pre-expiry F&O) gets a suffix: `2026-08-25-fo`. |
| `date_short` | `DD Mon YYYY` |
| `date_long` | Full weekday + date, e.g. `Thursday, 10 September 2026`. A weekly review uses `Week ending DD Month YYYY`. |
| `kind` | Display label: `Daily brief` \| `Expiry special` \| `F&O analysis` \| `Weekly review` |
| `k` | Machine key — **must** be one of `daily` \| `expiry` \| `fo` \| `weekly`. Drives colour + the archive filter. |
| `headline` | The report's headline hook only. No `NIFTY & BEYOND —`, no date. |
| `path` | `reports/YYYY/MM/YYYYMMDD.html` — relative to repo root, digits-only filename (Step 3), must match the file you add. |
| `tags` | 4–7 short strings from §1/§2. The archive card shows the first four; all are searchable. |

**Do not** edit `index.html`, `legacy-index.html`, `sitemap.xml`, or anything
under `sectors/` or `rotation/`. Keep JSON valid — trailing commas break the app.

---

## Step 3 — Name the report file

Copy the renderer's output to **`YYYYMMDD.html`** — the name it carries at
`reports/YYYY/MM/` on the site. The renderer emits
`2026-09-01-daily-brief.html`; the site takes `20260901.html`.

**Send the file already renamed.** The rename must happen before `SendUserFile`,
never as an instruction for the user to perform.

### Why digits only

The convention changed on 2026-09-01 after the same failure twice in two days:

| Sent as | Arrived in the repo as |
|---|---|
| `aug-31-2026.html` | `aug312026.html` |
| `sep-01-2026.html` | `sep012026.html` |

**Hyphens are stripped somewhere between download and upload.** `YYYYMMDD.html`
has no separator to lose, sorts chronologically in GitHub's listing, and is
unambiguous. Files published before 2026-09-01 keep their old names — point
`path` at whatever is actually in the repo; never rename history.

Double-check `path` in the Step 2 entry matches this filename exactly. A mismatch
here is the single most common way this breaks — a 404 on a freshly "published"
report.

---

## Step 4 — Build the Blogger container code

Always this exact shape. Only the `src` date changes:

```html
<iframe src="https://rajan1973.github.io/reports/2026/09/20260910.html"
  width="100%" height="15000" frameborder="0" scrolling="yes"
  style="border:none;">
</iframe>
```

Present it as a standalone copyable block — the user pastes it straight into
Blogger's HTML-mode editor.

**On height — use `15000` as a floor, not a constant.** Measured on the live
1 Sep report: 13,799 px at 1280 px desktop, 14,471 px at ~980 px tablet. The page
gets *taller* as the viewport narrows (content wraps), so size for the narrow
case. If retuning more than once, open the published URL in the browser pane and
read `document.documentElement.scrollHeight`, then set the iframe a little above
it. Keep `scrolling="yes"` as a safety net.

**The report is theme-aware** — it renders light or dark from the reader's own
system setting, inside the iframe too. Don't force a theme via iframe styling.

---

## Step 5 — Publish

The `rajanchennai` account has collaborator write access to
`Rajan1973/Rajan1973.github.io` and the system Git Credential Manager holds a
working github.com credential. **Direct push to `main` is the normal path.**

### Push directly (default)

```bash
git clone https://github.com/Rajan1973/Rajan1973.github.io.git
# 1. write the renamed report into reports/YYYY/MM/YYYYMMDD.html
# 2. prepend the Step 2 entry to data/reports.json
node scripts/index-reports.mjs --only <id>   # fills `mentions` (stocks named in the brief) for search
git add reports/ data/reports.json
git commit -m "Add daily brief: DD Month YYYY"
git push origin main
```

`scripts/index-reports.mjs` scans the report HTML for the stocks it names
(scanners, momentum, sector rows) and writes them to that entry's `mentions`
array so the app's ⌘K search can surface the brief when someone searches a
ticker. `--only <id>` limits it to the edition just added; omit it to re-index
every edition. If Node isn't handy, skip it — search still works on headline,
tags and date, just not on stock names inside that day's brief.

**Rules that do not relax just because the push is automated:**

1. **Show the diff and get a go-ahead before pushing.** Show both the new report
   file path and the `data/reports.json` diff (the one added object). In the days
   before pushes were automated, the review gate caught a wrong VIX, two mangled
   filenames and a clobbered archive.
2. **Validate `data/reports.json` parses** (`node -e "JSON.parse(require('fs').readFileSync('data/reports.json'))"` or `python -m json.tool`) and that `path` points at a file that now exists in the tree.
3. **Never `git push --force`, never rewrite history.** GitHub Pages and Vercel
   both serve from `main`.
4. **No token handling.** The push works because GCM already holds one — never
   ask the user to paste a token, never write one into a config or remote URL.

After the push: `main` redeploys GitHub Pages **and** Vercel automatically. Give
it ~2 min, then confirm `https://rajan1973.github.io/#/report` shows the new
edition at the top of the date switcher.

### Manual upload (fallback)

Use if the push is refused or the user asks. Hand over both files with
`SendUserFile` — the renamed report HTML and the updated `data/reports.json` —
then walk through:

*Uploading the report:*
1. `https://github.com/Rajan1973/Rajan1973.github.io` → into `reports/YYYY/MM/`
   (GitHub's uploader creates a missing month folder from the path you drop into)
2. **Add file → Upload files** → drag the correctly-named report in (don't rename on upload)
3. Commit message (copyable): `Add daily brief: DD Month YYYY`
4. Commit directly to `main`

*Updating the manifest:*
1. Repo root → open `data/reports.json` → pencil (Edit this file)
2. Paste the new object as the first item in `reports[]`, keep the trailing comma
3. Commit message (copyable): `Add DD Month brief to manifest`
4. Commit directly to `main`

*Posting to Blogger:*
1. `https://www.blogger.com` → New post → switch editor to **HTML view**
2. Paste the Step 4 iframe
3. Title the post `NIFTY & BEYOND — DD Mon YYYY`
4. Publish

Give both commit messages as their own copyable lines.

---

## Output checklist

- [ ] Edition confirmed **full**, not data-only (or data-only explicitly approved)
- [ ] Live `data/reports.json` read fresh and used as the edit base (Step 1)
- [ ] Report renamed `YYYY-MM-DD-daily-brief.html` → `YYYYMMDD.html` **before** SendUserFile
- [ ] One object prepended to `data/reports.json` → `reports[]`; `k` is one of daily/expiry/fo/weekly; JSON still valid
- [ ] `node scripts/index-reports.mjs --only <id>` run (fills `mentions` for search), or skipped only if Node unavailable
- [ ] `index.html` / `legacy-index.html` / `sectors/` / `rotation/` **not touched**
- [ ] `path` in the new entry matches a report file that exists in the tree
- [ ] Diff shown (report file + reports.json) and go-ahead received **before** pushing
- [ ] Blogger iframe given as a copyable code block, `height="15000"`
- [ ] No force-push, no history rewrite, no token handling
- [ ] Post-push: new edition visible at `rajan1973.github.io/#/report`
