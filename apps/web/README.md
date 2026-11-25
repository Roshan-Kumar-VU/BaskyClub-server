# apps/web — BaskyCLub website

Next.js pages only. Every piece of data comes from the API (`apps/api`) over HTTP, the same way the app gets it.

```
Browser ──▶ website (:3001) ──/api/... forwarded──▶ API (:3000) ──▶ PostgreSQL
```

- The browser calls this site's own `/api/...`; `next.config.ts` forwards it to the API. Same origin for the browser: no CORS, and cookies stay on this domain.
- Most pages are client pages that read the API through `src/lib/store.ts` (`useApi(path)`, a small cache; changes call `invalidate(prefix)`). `/p/:id` is rendered on the server for link previews.
- Styling: Tailwind 4, colours from the app's "Courtside" theme (`src/app/globals.css`).

## Login

- `/session/login`, `/session/signup`, `/session/logout` (`src/app/session/[action]/route.ts`) call the API and keep its login token in an **httpOnly** cookie `basky_token` (SameSite=Lax, Secure on https). Page scripts never see the token; the API reads the cookie on every `/api` call.
- `basky_in` (readable, no secret) tells the page a login cookie exists, so an expired one is cleared instead of breaking every request.
- `src/proxy.ts` refuses changes (POST/PATCH/PUT/DELETE) to `/api/*` and `/session/*` that don't come from this site (Origin check).
- Who is logged in: `GET /api/auth/me` (`src/lib/session.tsx`).

## Pages

Everything the app does, plus bulk CSV upload for the Basky team.

| Area | Pages |
|---|---|
| Public | `/` feed (All India / district, district association), `/p/:id` post + comments, `/clubs` list + map, `/clubs/:id`, `/associations/:id`, `/u/:id` |
| Account | `/login`, `/signup`, `/forgot-password`, `/reset-password?token=`, `/parent-consent?token=`, `/profile`, `/settings/profile`, `/settings/password`, `/settings/creator` |
| Members | `/post/new`, `/alerts`, `/clubs/new`, `/announce` |
| Clubs (owners, admins) | `/clubs/:id/manage`, `/members`, `/requests`, `/timings` |
| Associations (their team) | `/associations/:id/manage`, `/post`, `/team`, `/bearers`, `/legacy` (CSV upload for the Basky team) |
| BaskyCLub staff | `/admin` (team), `/admin/moderation` (moderators), `/clubs`, `/courts`, `/badges`, `/creators`, `/users`, `/associations`, `/roles` and `/history` (super admins) |

The map is an OpenStreetMap view of the chosen club or court (no map library loaded). Club-to-association link requests stay hidden, as in the app (PRD §5).

## Run

```bash
cp .env.example .env     # API_URL and WEB_URL
pnpm dev                 # from the repo root: API on :3000 + website on :3001
```

The API's `WEB_URL` must point at this site (it builds the email and share links), and `API_URL` here must point at the API. Both are read when the site is built or started.
