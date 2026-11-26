# Phase D — launch checklist

What is needed to put BaskyCLub online for real users (Vellore launch). Phase D work starts once the
items in **Part 1** are ready. Owners: **Roshan / Bhuvi** = accounts and decisions, **Dev** = code.

## Part 1 — needed from the project owners (accounts and decisions)

| # | What | Why | Details to send the developer |
|---|---|---|---|
| 1 | **Hosting provider and monthly budget** for the API and the website (e.g. Railway, Render, Fly.io; Vercel for the website) | The API (`apps/api`) and website (`apps/web`) must run on a server | Provider chosen, team invite to the project |
| 2 | **Managed PostgreSQL 17** (e.g. Neon, Supabase, Railway Postgres) with daily backups | The database | Connection string (pooled) and direct connection string, shared privately (never in chat or Git) |
| 3 | **Domain** (e.g. `baskyclub.in`) and access to its DNS settings | Website address, API address, email sender | Domain name; who can edit DNS |
| 4 | **Email provider account** (Resend is already supported in code; Amazon SES or Brevo possible) | Password reset and parent-consent emails | API key, sender address (e.g. `no-reply@baskyclub.in`); DNS records (SPF/DKIM) added when the provider asks |
| 5 | **Photo storage**: Cloudflare R2 (recommended, no download fees) or AWS S3 | Photos are on the server's disk today and can be lost on redeploy | Bucket name, access key, secret key, public URL or custom domain for photos |
| 6 | **Expo account** (EAS) | Build the app and send push alerts | Invite the developer to the Expo organisation |
| 7 | **Firebase project** (Android push) | Push alerts on Android go through Firebase Cloud Messaging | FCM service-account key (uploaded to Expo, not to Git) |
| 8 | **Google Play Console** account (₹ one-time fee) | Publish the Android app | Developer invite; app name, icon, screenshots, short/long description |
| 9 | **Apple Developer Program** (only if launching on iPhone; yearly fee) | iOS build, push and App Store | Team invite; APNs key handled through EAS |
| 10 | **Privacy policy and terms** text | Required by Play Store / App Store, and for under-18 users | Approved text (the developer adds the pages to the website) |
| 11 | **Merge PR #1** (`v-001/arch` → `main`) | Deploys run from `main` | — |
| 12 | Answers to the open PRD questions | Behaviour that must be decided before launch | See Part 4 |

## Part 2 — developer work that needs no accounts (can start any time)

- **Photo storage driver** for R2/S3 (`STORAGE_DRIVER`), keeping the current local-disk driver for development.
- **Trusted client IP**: the API reads the caller's IP from `x-forwarded-for`, which anyone can set. In
  production only the hosting proxy's value may be trusted, or the login and sign-up rate limits can be bypassed.
- **App login token in secure storage** (`expo-secure-store` instead of AsyncStorage).
- **Production settings**: `isProduction` checks (the parent-consent test link must not be returned), strict
  CORS list, security headers on the website.
- Deploy configuration (build/start commands, `prisma migrate deploy` on release, health check `/api/health`).
- Privacy policy and terms pages on the website (text from Part 1, item 10).

## Part 3 — developer work once the accounts exist

- Set production environment variables on the host (see below) and deploy API + website.
- Point the domain: e.g. `baskyclub.in` → website, `api.baskyclub.in` → API (or the API behind the website's `/api`).
- Turn on real email (`EMAIL_DRIVER=resend`) and send a test reset and parent-consent email.
- `eas init`, development build on a real phone, `PUSH_DRIVER=expo`, test an announcement and a reply alert.
- Store build (`eas build --profile production`) and Play Store internal testing track.
- Seed the real Vellore data (association, office bearers, clubs) — the Basky team can use the website's CSV upload.

### Production environment variables (API)

| Variable | Value |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | From item 2 |
| `JWT_SECRET` | New long random value (`openssl rand -base64 48`), never reused from development |
| `API_URL` | Public API address, e.g. `https://api.baskyclub.in` |
| `WEB_URL` | Public website address, e.g. `https://baskyclub.in` |
| `CORS_ORIGINS` | Only if a browser app on another address calls the API directly |
| `EMAIL_DRIVER`, `RESEND_API_KEY`, `EMAIL_FROM` | From item 4 |
| `PUSH_DRIVER` | `expo` |
| `STORAGE_DRIVER` + bucket keys | From item 5 (names fixed when the driver is written) |

Website: `API_URL` (where its server reaches the API) and `WEB_URL`. App: `EXPO_PUBLIC_API_URL`.

## Part 4 — open questions (PRD)

1. Club-to-association affiliation requests: when do they open (hidden in Phase 1)? Until then the Basky team sets affiliations.
2. Notification settings: can people turn alert types off?
3. Roles table: final list of who can do what (association member vs admin, club captain powers).
4. Affiliation `valid_until` left empty: does it mean "no expiry" or "unknown"?
5. Website map: keep the simple OpenStreetMap view, or a map library with all pins (Leaflet/MapLibre)?
6. Whose Expo/EAS, Firebase and store accounts (company or personal)?

## Later (when users grow towards 1 lakh)

- Rate limiter in Redis (today it is in the server's memory, so it only works with one server).
- Background queue for emails and push alerts.
- Database connection pooler, error tracking (Sentry), uptime alerts.
- Hidden comments still count in the comment total (needs a database trigger change).
- Reply-to-reply alerts reach only the thread starter (needs a notifications table).
- Database CHECK constraints on status columns.
