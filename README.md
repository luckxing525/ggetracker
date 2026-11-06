# GGE Outreach Guide: putting it on Vercel

This folder is a complete website. Follow Part 2 to put it online (about 15 minutes, no coding).
Part 1 explains what each piece does, so you understand what you're deploying.

---

## Part 1 · How it works (the 2-minute version)

```
 your teammate's browser                      Vercel                         Upstash
┌────────────────────────┐   fetch /api/rows  ┌────────────────────┐   reads/   ┌─────────────┐
│ index.html             │ ─────────────────▶ │ api/rows.js        │ ─ writes ─▶│ Redis       │
│ the guide, templates,  │  + team password   │ checks password,   │            │ database    │
│ tracker, KPIs          │ ◀───────────────── │ then saves/loads   │ ◀───────── │ (the data)  │
└────────────────────────┘    tracker rows    └────────────────────┘            └─────────────┘
```

**Three ideas to know:**

1. **Frontend vs backend.** `index.html` is the *frontend*: everything you see and click. It runs in each person's browser, so on its own it can only remember things in *that* browser. To share data, it needs a *backend*: code that runs on a server everyone talks to. That's `api/rows.js`.

2. **Serverless functions.** You don't rent or manage a server. Vercel sees the `api/` folder and turns `api/rows.js` into a web address (`/api/rows`) that wakes up whenever someone calls it. It's free at this size.

3. **The database.** The function needs somewhere permanent to put the data. That's Upstash Redis, a small hosted database you add from inside Vercel. The whole tracker is stored as one list called `gge:rows`, with one entry per company.

**What's in this folder:**

| File | What it is |
|---|---|
| `index.html` | The whole site: the guide content, templates, styles (CSS) and behaviour (JavaScript), all in one file. |
| `api/rows.js` | The backend. It checks the password, then reads, saves or deletes tracker rows in the database. Read its comments; they explain each part. |
| `package.json` | Tells Vercel which add-on library the backend needs (`@upstash/redis`, the database connector). |
| `.gitignore` | Tells GitHub which files *not* to upload (secrets and downloaded libraries). |
| `README.md` | This guide. |

**What gets saved where:**

| Thing | Saved where | Shared with the team? |
|---|---|---|
| Tracker rows (company, contact, channel, stage, notes, steps done) | Upstash database | ✅ Yes, everyone sees the same tracker |
| Live KPIs | Calculated from the tracker every time | ✅ Yes |
| Blanks you type in templates, the Reset button, the remembered password | Your own browser | ❌ No, just you (on purpose: your drafts are yours) |

**How "live" works:** each open page asks the server for the latest tracker every 10 seconds (only while the tab is visible). If a teammate marks a step done, you'll see it within about 10 seconds, no refresh needed. If you're mid-typing, it waits until you click away so it never overwrites you.

**How the password works:** you pick one team password and store it in Vercel as a *secret* (an "environment variable" called `TEAM_PASSWORD`). It's never in the code, so it's never on GitHub. People type it once per device. The page sends it with every request, and `api/rows.js` refuses anyone without it.

> **Be honest with yourself about what it protects.** The password protects the **tracker data** (company names, contacts, notes), and it's checked on the server, so it's real protection. The **guide text and templates** are part of the page itself, so a determined person could see them by viewing the page source. That's fine here because they aren't secret. Don't put anything truly sensitive (bank details, personal phone numbers) in the notes.

---

## Part 2 · Put it online, step by step

You need: a free **GitHub** account (github.com) and a free **Vercel** account (vercel.com → "Sign up with GitHub" is easiest).

### Step 1 · Put the folder on GitHub
1. Unzip `gge-outreach-guide.zip` on your computer.
2. On github.com click **+** (top right) → **New repository**. Name it `gge-outreach-guide`, choose **Private**, and click **Create repository**.
3. On the next page, click the link **"uploading an existing file"**.
4. Drag in everything from inside the unzipped folder: `index.html`, `package.json`, `README.md`, `.gitignore` and the **`api` folder**. Make sure `api/rows.js` shows up inside an `api` folder in the list.
   *Tip: Mac hides files starting with a dot. Press `Cmd + Shift + .` in Finder to show `.gitignore`. If you skip it, nothing breaks.*
5. Click **Commit changes**.

### Step 2 · Create the Vercel project
1. On vercel.com click **Add New… → Project**.
2. Find `gge-outreach-guide` in the list and click **Import**. (If it's not listed, click "Adjust GitHub App Permissions" and give Vercel access to that repo.)
3. On the configure screen:
   - **Framework Preset:** `Other`
   - Leave Build Command and Output Directory empty.
4. Open **Environment Variables** and add:
   - **Name:** `TEAM_PASSWORD` · **Value:** your team password (e.g. a short phrase like `denim-day-2027`)
5. Click **Deploy**. After about 30 seconds you get a link like `gge-outreach-guide.vercel.app`.

The page loads now, but saving won't work until the database is connected. That's next.

### Step 3 · Add the database (Upstash Redis)
1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database** (or **Browse Marketplace**) → choose **Upstash** → **Redis** → **Continue**.
3. Pick the **Free** plan and a region close to New York (e.g. `us-east-1`), name it `gge-tracker`, and click **Create**.
4. When it asks which projects to connect, choose **gge-outreach-guide** (all environments). Leave **Custom Environment Variable Prefix** empty (the grey "STORAGE" is only a placeholder; any prefix works, but empty is simplest) → **Connect Project**.
   This automatically adds the database's address and key to your project as environment variables. You don't copy anything by hand.

### Step 4 · Redeploy so it picks up the database
1. Go to the **Deployments** tab.
2. On the top deployment click **⋯ → Redeploy → Redeploy**.

### Step 5 · Test it
1. Open your `.vercel.app` link and enter the team password.
2. Go to **They said yes!**, type a test company, pick a channel, and click **Mark step done**.
3. Open the **Tracker** tab. The company is there and the KPIs moved.
4. Open the same link on your phone (or ask a teammate). Enter the password, and you'll see the same row. 🎉
5. Delete the test row with the ✕.

Share the link plus the password with your team, and you're done.

---

## Part 3 · Everyday things you might want to do

**Change the password.** Vercel → project → **Settings → Environment Variables** → edit `TEAM_PASSWORD` → Save → **Deployments → Redeploy**. Everyone gets asked for the new password the next time they open it. Do this if someone leaves the team.

**Edit the site** (fix a template, change a KPI target). Edit `index.html` on GitHub (open the file → pencil icon → **Commit changes**). Vercel redeploys automatically within a minute. Your tracker data is untouched, because it lives in the database, not the file.
- Templates are near the top of the script, in `const TPL = {`.
- Situations (the cards on the home page) are in `const SIT = {`.
- KPI targets are in `const CHANNELS = [`. Each line is: `[id, name, examples, contact target, [min, max sponsors], "host"/"sponsors", channel method]`.

**See the raw data.** Vercel → **Storage** → your database → **Open in Upstash** → **Data Browser** → the key `gge:rows`.

**Back up the tracker.** In the Upstash Data Browser you can view and copy everything in `gge:rows`. Do this before big changes.

**Sign out on a shared computer.** There's a **Sign out** button in the top bar.

**Try it on your own computer without Vercel.** Double-click `index.html`. Everything works, but the tracker saves only in that browser. That's fine for playing around.

---

## Part 4 · If something goes wrong

| What you see | What it means | Fix |
|---|---|---|
| "That password didn't work" | Wrong password, or `TEAM_PASSWORD` was changed | Check Settings → Environment Variables, then redeploy |
| "Couldn't reach the server…" on the password screen | The API isn't deployed, or it's crashing | Check the `api` folder made it to GitHub, then look at Vercel → **Logs** |
| You can log in, but nothing saves ("Couldn't save") | Database isn't connected | Redo Step 3, then **redeploy** (Step 4); new variables only apply after a redeploy |
| "The database isn't connected…" on the password screen | Upstash isn't linked to this project, or you haven't redeployed since | Storage → connect Upstash to the project → Deployments → Redeploy |
| Not sure what's wrong? | — | Visit `your-site.vercel.app/api/rows` directly. `{"error":"Wrong password"}` means the API is healthy; anything else tells you what's missing |
| Logs say `TEAM_PASSWORD is not set` | Variable missing | Add it in Settings → Environment Variables → redeploy |
| A teammate's change takes a few seconds to appear | Normal | The page checks every 10 seconds |

**Limits, in case you're curious:** the free Upstash plan comes with a monthly allowance of requests. Each open tab makes about 6 small requests a minute, and only while it's on screen; a hidden or closed tab makes none. A team of 5–10 using it during work sessions stays well within the free plan. If you ever see a usage warning from Upstash, change `10000` to `30000` in `index.html` (search for `setInterval`) to check every 30 seconds instead.
