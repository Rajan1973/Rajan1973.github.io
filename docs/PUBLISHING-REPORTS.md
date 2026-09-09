# Publishing reports into the NIFTY & BEYOND app

The live app (`rajan1973.github.io` and the Vercel URL) renders whatever is in
**two manifest files** in the `Rajan1973/Rajan1973.github.io` repo:

| Report type | Files that must change in the repo |
|---|---|
| EOD / daily brief | `reports/YYYY/MM/YYYYMMDD.html` **+** one entry in `data/reports.json` |
| Sector / stock review | `sectors/<slug>-q1fy27.html` **+** one entry in `data/sectors.json` |

Any change committed to the `main` branch redeploys **both** GitHub Pages and
Vercel automatically, in about 1–2 minutes. There is no separate "deploy" step
and nothing to touch in Vercel ever again.

### The normal daily path — you never touch JSON

Run **`/upload-post-mkt-report`** (or say *"publish today's report"*). The skill
reads the headline / Nifty % / breadth / FII-DII / regime from the report's own
§1 and §2, **builds the `data/reports.json` entry for you**, renames the HTML,
puts it in `reports/`, shows you the diff, and on your go-ahead pushes to `main`.
Both sites redeploy in ~2 min. You only eyeball it.

The by-hand steps below are the **fallback** — for a missed / back-dated report,
or if a push fails. Two safer ways than raw JSON editing:

- **Ask Claude:** *"add the EOD for 10 Sep, headline '…', tags …"* → prepares the
  change and gives you a one-click merge.
- **`scripts/add-report.mjs`** (needs the repo cloned + Node) — one command,
  can't miscount commas:
  ```bash
  node scripts/add-report.mjs --id 2026-09-10 --kind daily \
    --headline "Regime Holds as Breadth Quietly Recovers" \
    --path reports/2026/09/20260910.html \
    --tags "Nifty +0.42%; Breadth 280:210; FII +₹1,200 Cr; DII +₹900 Cr; VIX 10.9"
  ```
  `--kind` = `daily` \| `expiry` \| `fo` \| `weekly`. It derives the dates from
  `--id`, refuses a duplicate, validates the result, and prints the commit line.
- **By hand on the GitHub website** — no git, no terminal. Steps below.

---

## A. EOD / daily brief — by hand on GitHub

### 1. Put the report HTML in the repo

1. Go to <https://github.com/Rajan1973/Rajan1973.github.io>.
2. Click the **`reports`** folder → **`2026`** → the month folder (e.g. **`09`**).
   - If the month folder doesn't exist yet, you'll create it in the next step by
     typing it into the filename.
3. Click **Add file → Upload files**.
4. Drag in your report file. **Rename it first** to digits-only:
   `YYYYMMDD.html` — e.g. `20260910.html`.
   (A weekly review: `20260910weekly.html`. A pre-expiry F&O piece:
   `20260910fo.html`. No dashes, ever — dashes get stripped on upload and the
   link 404s.)
   - To drop it into a new month folder, in the "Name your file…" box type
     `09/20260910.html` and GitHub creates the folder.
5. Commit message: `Add daily brief: 10 September 2026`
6. Keep **"Commit directly to the `main` branch"** → **Commit changes**.

### 2. Add one entry to `data/reports.json`

1. Repo home → click the **`data`** folder → click **`reports.json`**.
2. Click the **pencil icon** (top-right) — "Edit this file".
3. Find the line `"reports": [` near the top. **Immediately below it**, paste this
   block and keep the trailing comma:

   ```json
       {
         "id": "2026-09-10",
         "date_short": "10 Sep 2026",
         "date_long": "Thursday, 10 September 2026",
         "kind": "Daily brief",
         "k": "daily",
         "headline": "The report's own headline hook",
         "path": "reports/2026/09/20260910.html",
         "tags": ["Nifty +0.4%", "Breadth 280:210", "FII +₹1,200 Cr", "VIX 10.9"]
       },
   ```

   | Field | Rule |
   |---|---|
   | `id` | `YYYY-MM-DD`. Second same-day artefact → suffix it: `2026-09-10-fo`. |
   | `date_short` | `DD Mon YYYY` |
   | `date_long` | `Weekday, DD Month YYYY` (weekly: `Week ending DD Month YYYY`) |
   | `kind` | `Daily brief` \| `Expiry special` \| `F&O analysis` \| `Weekly review` |
   | `k` | **must** be `daily` \| `expiry` \| `fo` \| `weekly` — sets the colour + archive filter |
   | `headline` | the hook only — no "NIFTY & BEYOND —", no date |
   | `path` | exactly where you put the file in step 1 |
   | `tags` | 4–7 short strings; the card shows the first four, all are searchable |

   The **newest edition is always first** in the list.
4. Scroll down → **Commit changes…** → keep "Commit directly to `main`" →
   **Commit changes**.

### 3. Check it

Wait ~2 minutes, then open <https://rajan1973.github.io/#/report> and hard-refresh
(**Ctrl+Shift+R**). The new date should be at the top of the dropdown and on the
home page. Also check it appears in **Archive** and in **⌘K / Ctrl-K search**.

### 4. Blogger (unchanged)

Blogger embeds the report HTML directly, not the app. New post → HTML view →
paste, changing only the date in the `src`:

```html
<iframe src="https://rajan1973.github.io/reports/2026/09/20260910.html"
  width="100%" height="15000" frameborder="0" scrolling="yes"
  style="border:none;">
</iframe>
```

Title the post `NIFTY & BEYOND — 10 Sep 2026`. If the bottom of the report is cut
off, raise `height` (open the report URL, run
`document.documentElement.scrollHeight` in the browser console, set a little above
that).

---

## B. Sector / stock review — by hand on GitHub

Sector reviews are not published by any skill — always a manual add.

### 1. Upload the review HTML

1. Repo → open the **`sectors`** folder.
2. **Add file → Upload files** → drag your review HTML in.
3. Rename it to the pattern **`<slug>-q1fy27.html`**, all lowercase, dashes for
   spaces — e.g. `pipes-building-materials-q1fy27.html`,
   `speciality-chemicals-q1fy27.html`.
4. Commit message: `Add sector review: Pipes & Building Materials Q1 FY27`
5. Commit directly to `main`.

### 2. Add one entry to `data/sectors.json`

1. Repo → **`data`** → **`sectors.json`** → pencil icon.
2. Inside the `"sectors": [ … ]` list, add (order doesn't matter, but keep the
   ladder roughly by theme):

   ```json
       {
         "id": "pipes-building-materials",
         "name": "Pipes & Building Materials",
         "quarter": "Q1 FY27",
         "status": "published",
         "path": "sectors/pipes-building-materials-q1fy27.html",
         "title": "Pipes & Building Materials Q1 FY27",
         "note": "Volume growth, PVC spreads, housing demand"
       },
   ```

   | Field | Rule |
   |---|---|
   | `id` | the slug, matches the filename without `-q1fy27.html` |
   | `name` | short label shown on the card (no "Q1 FY27") |
   | `status` | `published` to make it live; `pending` shows a greyed "review pending" card |
   | `path` | exactly where you put the file |
   | `title` | full title, used as the browser tab / frame title |
   | `note` | one line of what the review focuses on |
3. Commit directly to `main`.

### 3. Check it

Wait ~2 min → <https://rajan1973.github.io/#/sectors> (hard-refresh). The card
should show **Published / Open review →**; clicking it opens the review inside the
app. It's also in search.

> If you have the repo cloned locally and Node installed, `scripts/sync-sectors.mjs`
> does both files at once — see `DEPLOY.md`. The by-hand steps above need no tools.

---

## Quick reference

| Symptom | Cause |
|---|---|
| New report published but not in the app | forgot to add the `data/reports.json` entry, or `path` doesn't match the file |
| Card shows but clicking it 404s | filename in `path` ≠ actual file name (usually a dash that got stripped) |
| App still shows the old version | browser cache — hard-refresh (Ctrl+Shift+R); or the ~2 min rebuild hasn't finished |
| JSON edit won't save / app breaks | a missing or extra comma — the last item in a list has no trailing comma; every earlier item does |
