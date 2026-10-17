# BaskyClub app (iOS + Android)

Expo SDK 58 · React Native · TypeScript · Expo Router. First draft runs on **mock data** (no database).

## Run on your Mac

```bash
cd "~/Documents/BaskyClub Workspace/baskyclub-app"
npm install          # first time only
npx expo start       # then press:  i = iOS Simulator   a = Android emulator
```

- **iPhone / Android phone:** install **Expo Go**, same Wi-Fi as the Mac, scan the QR code.
- iOS Simulator needs Xcode; Android emulator needs Android Studio with a virtual device.

## Where things live

| Folder | What |
|---|---|
| `src/app/` | Screens (every file is a route). `(tabs)/` = bottom tabs |
| `src/components/` | Reusable UI (post card, match card, buttons…) |
| `src/theme/` | Colours, fonts, spacing — ported from the website |
| `src/types/models.ts` | Types matching the Database Guide |
| `src/data/mock/` | Sample data (made-up names) |
| `src/data/repositories/` | The only place screens get data. Swap mock → API here later |

## Checks

```bash
npx tsc --noEmit     # typecheck
```
