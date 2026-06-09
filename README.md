# Calendar — a personal AI reminder app

A polished, **local** reminder app styled after **Apple Calendar**. Add reminders in
plain English ("call John every Tuesday at 9am") and **Groq** turns them into structured
reminders. It learns *when you actually finish things* and nudges you to reschedule.
Notion is your database; a local cache keeps everything fast and works offline.

- **Frontend:** React + Vite + Tailwind CSS v4 (Apple Calendar look, light/dark)
- **Backend:** Node + Express (proxies Groq & Notion — your keys never reach the browser)
- **Database:** your Notion workspace (auto-provisioned), with a local JSON cache/backup
- **AI:** Groq (`llama-3.3-70b-versatile`) via the OpenAI-compatible API — called with `fetch`, no SDK

Runs entirely on your machine. No deployment, no auth, no third-party server.

---

## Features

- 📅 **Month calendar + List views** — Apple-style month grid (today highlighted, reminders as event chips, click a day for its detail) and a searchable, sortable list.
- 🗣️ **Natural-language capture** — type it how you'd say it; Groq extracts title, date/time, recurrence, and priority into a form you review before saving.
- 🧠 **Smart suggestions** — Groq scans your schedule for overloaded days, mis-set priorities, conflicts, and duplicates.
- 🎯 **Adaptive rescheduling** — every reminder has **Done / Snooze 1hr / Later**. The app logs these and, once it sees a pattern, nudges: *"You usually finish these around 3 PM — reschedule?"*
- 📊 **`/stats` page** — completions, dismissals, and completion rate per reminder. For engine-rescheduled reminders it shows **before vs after** so you can judge whether the nudges actually help.
- 🔁 **Recurrence** — daily / weekly / monthly / custom; completing a recurring reminder rolls it forward.
- 🔔 **Due notifications**, 🌗 **dark/light mode**, ⌨️ **keyboard shortcuts** (press `?`), optimistic UI + toasts.

---

## Quick start

> You can run the app immediately with **no keys** — it falls back to local JSON
> storage with AI disabled. Add keys to unlock Notion sync and the AI features.

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**. (Vite serves the UI on `5173` and proxies
`/api` to the Express server on `3001`. `npm run dev` starts both.)

---

## Enabling AI + Notion (2 keys)

Copy `.env.example` to `.env` and fill in the values:

### 1. Groq key (AI)

1. Get a key at <https://console.groq.com/keys>.
2. Put it in `.env` as `GROQ_API_KEY=gsk_...` (optionally set `GROQ_MODEL`).

### 2. Notion (your database)

1. **Create an integration:** <https://www.notion.so/profile/integrations> →
   **New integration** → internal → copy the secret → `NOTION_TOKEN=ntn_...`
2. **Share a page with it:** open a Notion page → **•••** → **Connections** →
   add your integration.
3. **Copy that page's ID** (or full URL) into `NOTION_PARENT_PAGE_ID`.
4. Leave `NOTION_DATABASE_ID` blank — the app creates a **Reminders** database under
   that page on first run and remembers its ID.

Restart `npm run dev`. The header shows **Notion · Groq on** when both are live.

---

## How it works

```
Browser (React, :5173) ──/api/*──► Express (:3001) ──► Groq API (OpenAI-compatible, via fetch)
                                          ├──► Notion API (source of truth)
                                          └──► server/reminders.json (cache/backup)
```

- Reads come from an **in-memory cache** (warmed from Notion on startup); writes go to
  Notion, then update the cache and a `reminders.json` snapshot.
- If `NOTION_TOKEN` is missing/unreachable → **local mode** off the JSON snapshot. If
  `GROQ_API_KEY` is missing → AI endpoints return a friendly "not configured" message.
- AI parsing uses Groq **function-calling**, so responses are schema-validated JSON — a
  malformed response can't crash the app.

### Adaptive-rescheduling engine

- Each action (`done` / `snooze` / `not_now`) is logged with its weekday + hour onto the
  reminder (`dismissal_events`).
- `GET /api/reminders/:id/suggest-time` takes the **median** completion hour across
  reminders of the same priority — but only once there are **≥3 real completions** with a
  tight spread (else it stays quiet). Simple arithmetic, no ML.
- The nudge applies the suggested hour to today (or tomorrow if it's already past) and flags
  the reminder as engine-rescheduled, which `/stats` uses for the before/after comparison.

### Notion schema

Auto-created properties: **Title**, **Due**, **Recurrence**, **Recurrence Detail**,
**Priority**, **Done**, **Notes**, plus **Dismissal Events** (a JSON blob holding the
rescheduling state). The app adds the **Dismissal Events** property to a pre-existing
database automatically.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Backend (`:3001`) + frontend (`:5173`) together |
| `npm run server` / `npm run client` | One side only |
| `npm run build` / `npm run preview` | Production build / preview |

## Troubleshooting

- **"AI off" with a key set** → restart `npm run dev` after editing `.env`.
- **Header says "Local" with a Notion token** → the integration isn't connected to the
  parent page. Redo Connections → your integration, then restart.
- **Reset local data** → delete `server/reminders.json` (and `server/.runtime.json` to
  re-provision the Notion database).

## Security

Keys live only in `.env` (gitignored), read **server-side only**. The browser talks
exclusively to `/api/*`; no key is ever sent to the frontend.
