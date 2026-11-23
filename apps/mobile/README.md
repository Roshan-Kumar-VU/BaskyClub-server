# BaskyClub app (iOS + Android)

Expo SDK 58 · React Native · TypeScript · Expo Router. Data comes from the shared API in `../web` (same repo; see the project doc API_REFERENCE.md).

## Run on your Mac

1. Start the API first (another Terminal tab): `pnpm web dev` (from the repo root)
2. Tell the app where the API is: `cp .env.example .env.local` (edit the address for a real phone — see the file)
3. Start the app:

```bash
pnpm install         # first time only, at the repo root
cd apps/mobile
npx expo start       # then press:  i = iOS Simulator   a = Android emulator   w = browser
```

In development the login screen lists every test account (password `Basky@123`) — one tap to be a player, coach, club owner, association admin, moderator or super admin.

- **iPhone / Android phone:** install **Expo Go**, same Wi-Fi as the Mac, scan the QR code.
- iOS Simulator needs Xcode; Android emulator needs Android Studio with a virtual device.

## Where things live

| Folder | What |
|---|---|
| `src/app/` | Screens (every file is a route). `(tabs)/` = bottom tabs |
| `src/components/` | Reusable UI (post card, match card, buttons…) |
| `src/theme/` | Colours, fonts, spacing — ported from the website |
| `src/types/models.ts` | Screen-side models (what screens read; `src/data/repo.ts` maps API replies into them) |
| `@baskyclub/shared` (`packages/shared`) | API reply types, input limits (`LIMITS`), YouTube and age helpers — the same code the server uses |
| `src/data/repo.ts` | The only place screens get data — calls the API and caches answers |
| `src/data/api.ts`, `cache.ts` | API address + login token; small read-through cache |

## Checks

```bash
npx tsc --noEmit     # typecheck
```
