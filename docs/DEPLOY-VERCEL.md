# Deploying the NIFTY & BEYOND app on Vercel

This is the clean, correct sequence. The app is a plain static site living in the
`Rajan1973/Rajan1973.github.io` repo; Vercel serves that same repo alongside
GitHub Pages. After this is set up once, **every push to `main` redeploys Vercel
automatically** — you never repeat these steps.

> Screenshots referenced below are the ones captured during setup. Drop your own
> in at each `[screenshot: …]` marker if you want an illustrated copy.

---

## Before you start

- The app must be on the repo's **`main`** branch (PR merged). Check:
  <https://github.com/Rajan1973/Rajan1973.github.io> → the file list shows
  `index.html`, `assets/`, `data/`, `rotation/`, `sectors/`.
- You need a Vercel account logged in with — or connected to — the **`Rajan1973`**
  GitHub account.

---

## Step 1 — Start a new project

1. Go to <https://vercel.com> and sign in.
2. Click **Add New… → Project** (or, on the welcome screen, the **"Import your
   Project"** tab).

`[screenshot: "Let's build something new" — Import your Project tab, "Import Git Repository" on the left with a URL box and provider buttons, "Drop to Deploy" on the right]`

Use the **left** side ("Import Git Repository"). Do **not** use "Drop to Deploy"
on the right — that uploads a one-off snapshot with no automatic redeploys.

---

## Step 2 — Connect the correct GitHub account

1. Click the black **GitHub** button under "Select a Git provider".
2. GitHub opens an authorization / install dialog. Choose the **`Rajan1973`**
   account.
3. Under **Repository access**, pick either:
   - **All repositories**, or
   - **Only select repositories** → select **`Rajan1973/Rajan1973.github.io`**.
4. Click **Install** / **Save**.

`[screenshot: GitHub → Settings → Applications → Vercel → "Repository access" set to "Only select repositories" with Rajan1973/Rajan1973.github.io listed]`

You can review or change this later at
<https://github.com/settings/installations> → **Vercel** → *Repository access*.

---

## Step 3 — Import the repository

Back on Vercel's import screen:

1. In **"Select a Git Namespace"**, choose **`Rajan1973`**.
2. Find **`Rajan1973.github.io`** in the list.
3. Click **Import**.

`[screenshot: Vercel import list showing the Rajan1973.github.io repository with an Import button]`

---

## Step 4 — Configure the project

On the configuration screen, set exactly this:

| Setting | Value |
|---|---|
| **Project Name** | anything (e.g. `nifty-and-beyond`) |
| **Framework Preset** | **Other** |
| **Root Directory** | `./` (leave default) |
| **Build Command** | *leave empty* (toggle "Override" off if shown) |
| **Output Directory** | *leave empty* |
| **Install Command** | *leave empty* |
| **Environment Variables** | none |

There is no build — the site is served as-is.

---

## Step 5 — Deploy

Click **Deploy**. It finishes in under a minute and shows a confirmation with a
preview thumbnail.

`[screenshot: "Congratulations! You just deployed a new project" with a preview thumbnail and Next Steps list]`

Click **Continue to Dashboard**.

---

## Step 6 — Lock in the settings

In the project's **Settings**:

1. **Git** → confirm **Production Branch = `main`**. (Now every push to `main`
   auto-deploys.)
2. **General** → leave **Clean URLs** and **Trailing Slash** **OFF**. The site
   depends on literal `…/YYYYMMDD.html` URLs; turning these on would break report
   links.

---

## Step 7 — (Optional) Custom domain

**Settings → Domains → Add** a domain you own and follow Vercel's DNS
instructions. If you add one, tell Claude so the "open in new tab" links and the
page's canonical URL can be pointed at it.

---

## How to check it's correct

Do a hard refresh (**Ctrl+Shift+R**) on the Vercel URL, then:

| Check | Expected |
|---|---|
| `https://<project>.vercel.app/` | Cream/off-white page, **"Nifty & Beyond"** logo top-left, sidebar: *Today's close · Daily report · Rotation · RRG · Sector research · Archive* |
| Click **Daily report** | A daily brief loads **inside** the page (no separate tab), with a date dropdown |
| Click **Rotation · RRG** | The rotation graph loads (benchmark selector, quadrant chart) |
| Click **Sector research** → any card | The sector review opens in place |
| Click **Archive** | Report cards with working filters and search |
| `https://<project>.vercel.app/reports/2026/09/20260909.html` | Opens the raw report (proves report URLs resolve) |
| Push any change to `main`, wait ~2 min | Vercel **Deployments** tab shows a new deployment; the site updates |

On the **Deployments** tab, a healthy deployment shows **Ready** with a green
check and source "main".

If the Vercel URL still shows an old "Markets with Rajan" blue-header page, the
app isn't on `main` yet — merge the pending pull request, and Vercel redeploys on
its own.

---

## What you never do again

- No re-importing, no re-deploying by hand.
- No touching Vercel to publish a report — you push to `main` (or run
  `/upload-post-mkt-report`), and Vercel + GitHub Pages both rebuild themselves.
