# BaskyCLub

Monorepo for BaskyCLub (pnpm workspaces + Turborepo).

| Folder | What |
|---|---|
| `apps/api` | Backend: the API (`/api/...`) for the website and the app, database, tests. Port 3000. See [apps/api/README.md](apps/api/README.md). |
| `apps/web` | Website (Next.js pages only; data from the API). Port 3001. See [apps/web/README.md](apps/web/README.md). |
| `apps/mobile` | Expo app (iOS / Android). See [apps/mobile/README.md](apps/mobile/README.md). |
| `packages/*` | Code shared by the apps. |

## Setup

Needs Node 22.13+ and pnpm 11 (`corepack enable` picks the version from `package.json`).

```bash
pnpm install          # installs every app; also generates the Prisma client
```

Then follow [apps/api/README.md](apps/api/README.md) for the database and `.env`, and copy `apps/web/.env.example` to `apps/web/.env`.

`pnpm dev` starts the API (:3000) and the website (:3001) together.

## Commands (from the repo root)

| Command | Does |
|---|---|
| `pnpm typecheck` | Type-check every app |
| `pnpm build` | Production build (only what changed; Turborepo caches the rest) |
| `pnpm test` | API tests (needs the test database, see apps/api) |
| `pnpm api <script>` | Run a script in apps/api, e.g. `pnpm api dev`, `pnpm api db:seed` |
| `pnpm web <script>` | Run a script in apps/web, e.g. `pnpm web dev` |
| `pnpm mobile <script>` | Run a script in apps/mobile, e.g. `pnpm mobile start` |

Add a package to one app: `pnpm --filter @baskyclub/api add <pkg>`. For the Expo app always use `cd apps/mobile && pnpm expo install <pkg>` (picks SDK-compatible versions).

## CI

`.github/workflows/ci.yml` runs on every push: typecheck, the API tests against a throwaway Postgres 17, the API and website builds, and an Android bundle of the app (catches workspace/Metro resolution problems).
