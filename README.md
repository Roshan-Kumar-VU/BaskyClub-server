# BaskyCLub

Monorepo for BaskyCLub (pnpm workspaces + Turborepo).

| Folder | What |
|---|---|
| `apps/web` | Next.js: the API (`/api/...`) for the app and website, plus website pages. See [apps/web/README.md](apps/web/README.md). |
| `apps/mobile` | Expo app (iOS / Android). See [apps/mobile/README.md](apps/mobile/README.md). |
| `packages/*` | Code shared by the apps. |

## Setup

Needs Node 22.13+ and pnpm 11 (`corepack enable` picks the version from `package.json`).

```bash
pnpm install          # installs every app; also generates the Prisma client
```

Then follow [apps/web/README.md](apps/web/README.md) for the database and `.env`.

## Commands (from the repo root)

| Command | Does |
|---|---|
| `pnpm typecheck` | Type-check every app |
| `pnpm build` | Production build (only what changed; Turborepo caches the rest) |
| `pnpm test` | API tests (needs the test database, see apps/web) |
| `pnpm web <script>` | Run a script in apps/web, e.g. `pnpm web dev`, `pnpm web db:seed` |
| `pnpm mobile <script>` | Run a script in apps/mobile, e.g. `pnpm mobile start` |

Add a package to one app: `pnpm --filter @baskyclub/web add <pkg>`. For the Expo app always use `cd apps/mobile && pnpm expo install <pkg>` (picks SDK-compatible versions).
