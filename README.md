# BaskyClub app (iOS + Android)

Expo SDK 58 · React Native · TypeScript · Expo Router. Data comes from the shared API in `../baskyclub-server` (see the project doc API_REFERENCE.md).

## Run on your Mac

1. Start the API first (another Terminal tab): `cd ../baskyclub-server && npm run dev`
2. Tell the app where the API is: `cp .env.example .env.local` (edit the address for a real phone — see the file)
3. Start the app:

```bash
cd ~/Documents/"BaskyClub Workspace"/baskyclub-app
npm install          # first time only
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
| `src/types/models.ts` | Types matching the Database Guide |
| `src/data/repo.ts` | The only place screens get data — calls the API and caches answers |
| `src/data/api.ts`, `cache.ts` | API address + login token; small read-through cache |
| `src/data/mock/` | Old sample data (no longer used by screens) |

## Checks

```bash
npx tsc --noEmit     # typecheck
```
