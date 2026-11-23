# apps/web — BaskyCLub website

Next.js pages only. Every piece of data comes from the API (`apps/api`) over HTTP, the same way the app gets it.

```
Browser ──▶ website (:3001) ──/api/... forwarded──▶ API (:3000) ──▶ PostgreSQL
```

- Server-rendered pages (e.g. `/p/:id`) call `API_URL` directly.
- The browser calls this site's own `/api/...`; `next.config.ts` forwards it to the API. Same origin for the browser: no CORS, and cookies stay on this domain.

## Pages

| Page | What |
|---|---|
| `/` | Placeholder home |
| `/p/:id` | A shared post, with a link preview (Open Graph) for WhatsApp and social apps |
| `/parent-consent?token=` | Parent confirms an under-18 account (link from the signup email) |
| `/reset-password?token=` | New password (link from the forgot-password email) |

## Run

```bash
cp .env.example .env     # API_URL and WEB_URL
pnpm dev                 # from the repo root: API on :3000 + website on :3001
```

The API's `WEB_URL` must point at this site (it builds the email and share links), and `API_URL` here must point at the API. Both are read when the site is built or started.
