# Phase 2 code (parked)

Moved out of `src/` on 26 Oct 2026 when Phase 1 became "join clubs and post" (Decision log #70–75).
Not part of the app build (excluded in `tsconfig.json`). Bring files back into `src/` when Phase 2 starts.

| File | What it was |
|---|---|
| `app/tabs/matches.tsx` | Matches tab (Live / Recent / Mine) |
| `app/tabs/create.tsx`, `app/create-sheet.tsx` | + tab placeholder and the Post / Match room sheet |
| `app/match/new.tsx`, `app/match/[id].tsx` | Create match room; live scoreboard with +1/+2/+3, hand-over |
| `components/match-card.tsx` | Scoreboard-style match card |
| `components/profile-view-with-stats.tsx` | Profile with hollow jersey number, per-game box score, games by category |
| `data/*-before-phase1-schema.ts` | Types, mock data (matches, tournaments, player stats, jersey numbers) and repository before the Phase 1 schema |

Phase 2 tables (player profiles/stats, teams, rosters, matches, tournaments) come from the database chat; rewrite these against them.
