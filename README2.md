# T.C. Domstad — beschikbaarheidsbord

Shared availability board for a T.C. Domstad competition team. It shows every player for every match day, allows quick status toggling, and keeps the schedule synchronized through a shared server-side store. A new season (different dates, players, or time of year) can be generated at any time through the password-protected `/panel` admin tool — no redeploy needed.

## Features

- Shared schedule board without login
- Mobile-first cards for every playing day
- Player chips with green / red / gray status
- Joker/substitute player support, only togglable once the day is short-handed
- Per-player `.ics` agenda export and a full-schedule `.xlsx` export (styled like the club's own format)
- Polling refresh every 5 seconds
- `/panel` admin tool (password-protected) to generate a brand-new season: date range, weekday, players, players-per-day, and holidays to skip
- Upstash Redis support with local fallback in development

## Data model

The active season's configuration (title, players, match days, players-per-day, joker, etc.) is stored as one JSON document. Player availability is a separate per-day/per-player status map keyed as:

`date|player`

with allowed values:

- `playing`
- `problem`
- `idle`

Both live in `app/lib/schedule.ts`. On first run (no Redis data yet), the app seeds itself with the original 2026/2027 winter season. Generating a new season through `/panel` replaces both documents.

## API

- `GET /api/schedule` — returns the active season's schedule, roster, and live statuses
- `POST /api/status` — updates a single player/date status after validation against the active season

## `/panel` admin tool

Log in at `/panel/login` with `PANEL_PASSWORD`, then fill in the new season's date range, weekday, players (one per line), players-per-day, and an optional joker/substitute name. Submitting **replaces the live board for everyone immediately** — there's a confirmation prompt before it does.

Auth uses a signed, httpOnly session cookie (via `jose`), checked both by `proxy.ts` (fast redirect) and again inside the Server Action itself (the actual authorization check).

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000. To use `/panel` locally, create a `.env.local` with `PANEL_PASSWORD` and `PANEL_SESSION_SECRET` (see `.env.example`; generate a secret with `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).

## Vercel deployment

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add environment variables in the Vercel project settings:
   - `KV_URL`
   - `KV_TOKEN`
   - `PANEL_PASSWORD`
   - `PANEL_SESSION_SECRET`
4. Use the default Next.js build settings.
5. Deploy.

For a quick Upstash setup:

- Create a Redis database in Upstash
- Copy the REST URL to `KV_URL`
- Copy the REST token to `KV_TOKEN`

The app will use Redis when those values are set; if they are missing, it falls back to local in-memory state for development (and a season generated through `/panel` in that mode only lives until the dev server restarts).

## Notes

- The schedule currently seeds the initial 2026/2027 season data exactly as provided.
- Use `/panel` when the next season starts (e.g. moving outdoors in spring) instead of editing code.
