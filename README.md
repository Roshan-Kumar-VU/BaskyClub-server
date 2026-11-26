# BaskyCLub

BaskyCLub is a basketball community for India: players, clubs, courts and district/state associations in one place.
Phase 1 (Vellore launch) is built: the backend, the website and the iOS/Android app. Going live is Phase D, see
[docs/phase-d-checklist.md](docs/phase-d-checklist.md).

This repo is a monorepo (pnpm workspaces + Turborepo) that holds all three apps and the code they share.

| Folder | What | Stack | Port |
|---|---|---|---|
| `apps/api` | Backend: every `/api/...` route, all business rules, database, tests. See [apps/api/README.md](apps/api/README.md). | Next.js 16 (route handlers), Prisma 5.22, PostgreSQL 17, Zod 4 | 3000 |
| `apps/web` | Website: every app feature plus the admin and management tools. See [apps/web/README.md](apps/web/README.md). | Next.js 16, React, Tailwind 4 | 3001 |
| `apps/mobile` | iOS / Android app. See [apps/mobile/README.md](apps/mobile/README.md). | Expo SDK 58, React Native, Expo Router | — |
| `packages/shared` | Code used by all three apps: API reply types, input limits, YouTube / age / practice-hour helpers. | TypeScript | — |
| `docs/` | [Phase D launch checklist](docs/phase-d-checklist.md): accounts and decisions needed before going live. | — | — |

## Architecture

```
  iPhone / Android app (Expo) ────── Bearer token ──────┐
                                                        ▼
  Browser ──▶ Website :3001 ──── /api/* forwarded ──▶ API :3000 ──▶ PostgreSQL 17
              Next.js pages     (with login cookie)    routes → services → Prisma
              /session/* login                              │
                                                            ├── email  (log now → Resend)
                                                            ├── push   (log now → Expo push)
                                                            └── photos (local disk now → R2/S3)

  packages/shared ── types + rules imported by the app, the website and the API
```

**One API, one set of rules.** All data and every permission check live in `apps/api`. The website and the app are
only screens: they call the same `/api/...` routes and show what comes back. A rule changed in the API applies to both.

**Shared code.** `packages/shared` holds the API reply types (`wire.ts`), input limits such as password and post
length (`rules.ts`), the age-on-date rule used for under-18 accounts (`dates.ts`), YouTube link parsing (`youtube.ts`)
and practice-hour helpers (`practice.ts`). The app, website and server import the same code, so they can't disagree.

### Inside the API (`apps/api`)

```
src/app/api/<area>/.../route.ts   web address: read input (Zod), call a service, reply JSON
        │
        ▼
src/server/auth/                  who is calling (JWT from the Authorization header or the website cookie)
src/server/permissions.ts         what that person may do (platform role, club role, association role)
        │
        ▼
src/server/services/*.service.ts  the rules for one area (posts, clubs, memberships, moderation, imports…)
        │
        ▼
src/server/db.ts → Prisma → PostgreSQL   28 tables (prisma/schema.prisma)
                                         + database rules Prisma can't express (prisma/phase1_extras.sql)
```

- `src/server/lib/` holds the swappable drivers and helpers: `mailer.ts` (email), `push.ts` (push alerts),
  `storage.ts` (photos), `rate-limit.ts`, `csv.ts`, `cursor.ts` (paging).
- Route areas: auth, users, feed, posts, comments, reports, moderation, clubs, club-roles, memberships, courts, map,
  places, associations, organization-members, office-bearers, legacy, affiliations, announcements, alerts, follows,
  badges, devices, uploads, files, admin, health.
- `tests/` logs in as every role and checks what each one can and can't do (176 tests, real Postgres).

### Inside the website (`apps/web`)

- The browser only talks to the website's own address. `next.config.ts` forwards `/api/*` to the API, so there is
  no CORS and the login cookie stays on the site's domain.
- **Login:** `/session/login`, `/session/signup` and `/session/logout` call the API and keep its token in an
  **httpOnly** cookie (`basky_token`, SameSite=Lax, Secure on https). Page scripts never see the token.
  A readable `basky_in` marker lets the page clear an expired login instead of breaking.
- `src/proxy.ts` refuses POST / PATCH / PUT / DELETE to `/api/*` and `/session/*` that don't come from the site itself.
- Data: `src/lib/store.ts` (`useApi(path)` with a small cache; changes call `invalidate(prefix)`).
  `/p/:id` (a single post) is rendered on the server so shared links get a preview.

### Inside the app (`apps/mobile`)

- Expo Router: every file in `src/app/` is a screen; `(tabs)/` are the bottom tabs.
- `src/data/repo.ts` calls the API and maps replies into screen models (`src/types/models.ts`).
- Login token is sent as `Authorization: Bearer …`. Push alerts register the phone after login and open the right post
  on tap (needs an EAS development build, Phase D).
- `phase2/` keeps screens planned for after Phase 1; they are not part of the app build.

## What Phase 1 covers

| Area | Website + app |
|---|---|
| Feed | All India or one district, plus the district association's posts; official announcements pinned |
| Posts | Text, photos, YouTube links; likes, comments and replies (paged), share links, reports |
| Who can post | Current or past club members, Basky staff, association staff for their association. Past members post personally only |
| Clubs | List and map with weekly practice hours, join requests, members, roles, timings, register a new club |
| Associations | Page, team, office bearers, Media / Legacy records, announcements (alerts to followers) |
| Accounts | Sign up, under-18 accounts limited until a parent confirms by email, password reset by email link, profile, Creator badge |
| Alerts | One inbox for announcements and replies to your comments; push on the app |
| Moderation | Approve, hide (reversible) or remove posts and comments; review queue |
| Basky team / admins | Approve clubs and courts, badges, Creator requests, users (limit / suspend / restore / delete, with change history), roles, associations, CSV upload of office bearers and Legacy records (checked first, all-or-nothing) |

## Setup

Needs Node 22.13+, pnpm 11 (`corepack enable` picks the version from `package.json`) and PostgreSQL 17
(`brew install postgresql@17`).

```bash
pnpm install                         # every app; also generates the Prisma client
brew services run postgresql@17      # start Postgres for this session only (not at login)
```

1. API: follow [apps/api/README.md](apps/api/README.md) (database, `.env`, `pnpm api db:migrate`, `pnpm api db:seed`).
2. Website: `cp apps/web/.env.example apps/web/.env` (`API_URL`, `WEB_URL`).
3. App: `cp apps/mobile/.env.example apps/mobile/.env.local` (the API address the phone can reach).
4. `pnpm dev` starts the API (:3000) and the website (:3001). Start the app with `pnpm mobile start`.

Stop Postgres afterwards with `brew services stop postgresql@17`.

### Test accounts (local only)

`pnpm api db:seed` creates test accounts for every role (player, club owner, club admin, under-18 waiting for a parent,
association admin, moderator, Basky team, super admin). All use the password `Basky@123`. The full list is in
[apps/api/README.md](apps/api/README.md#test-accounts-local--testing-only). In development the login screens of the
website and the app list them for one-tap login.

### Environment variables

| App | File | Main variables |
|---|---|---|
| API | `apps/api/.env` | `DATABASE_URL`, `DIRECT_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `API_URL`, `WEB_URL`, `EMAIL_DRIVER` (`log`), `PUSH_DRIVER` (`log`), `STORAGE_DRIVER` (`local`) |
| Website | `apps/web/.env` | `API_URL` (where the website's server reaches the API), `WEB_URL` |
| App | `apps/mobile/.env.local` | `EXPO_PUBLIC_API_URL` |

`.env` files are git-ignored; never commit them. Production values are listed in the
[Phase D checklist](docs/phase-d-checklist.md#production-environment-variables-api).

## Commands (from the repo root)

| Command | Does |
|---|---|
| `pnpm dev` | API (:3000) + website (:3001) with reload on save |
| `pnpm typecheck` | Type-check every app and package |
| `pnpm test` | API tests (needs the test database, see apps/api) and shared-package tests |
| `pnpm build` | Production builds (Turborepo rebuilds only what changed) |
| `pnpm api <script>` | Run a script in apps/api, e.g. `pnpm api db:seed`, `pnpm api db:studio` |
| `pnpm web <script>` | Run a script in apps/web |
| `pnpm mobile <script>` | Run a script in apps/mobile, e.g. `pnpm mobile start` |

Add a package to one app: `pnpm --filter @baskyclub/api add <pkg>`. For the Expo app always use
`cd apps/mobile && pnpm expo install <pkg>` (picks SDK-compatible versions).

## CI

`.github/workflows/ci.yml` runs on every push:

1. Typecheck, API tests against a throwaway Postgres 17, shared tests, API and website production builds.
2. An Android bundle of the app (`expo export`), which catches workspace / Metro resolution problems.

## Branches

- `main`: the stable branch; deploys will run from it (Phase D).
- `v-001/arch`: Phase 1 work (monorepo, backend, app, website), merged into `main` through PR #1.

## Status and next steps

- **Done:** Phase A (backend), Phase B (app), Phase C (website).
- **Next, Phase D (launch):** hosting, managed database, domain, real email, photo storage, push alerts, store builds.
  What is needed from the owners and what is left for the developer: [docs/phase-d-checklist.md](docs/phase-d-checklist.md).
- **Known limits:** the website map shows one place at a time (OpenStreetMap, no map library); hidden comments still
  count in the comment total; reply-to-reply alerts reach only the thread starter; the rate limiter lives in server
  memory (fine for one server).
