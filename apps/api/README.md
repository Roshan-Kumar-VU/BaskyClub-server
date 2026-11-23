# apps/api — BaskyCLub API

The shared backend for BaskyCLub: **one API for the website and the iOS/Android app**, plus the database design.
Next.js 16 (API routes) · PostgreSQL · Prisma 5.22 · TypeScript.

```
Phone app / website  ──▶  API (this folder)  ──▶  PostgreSQL
                          checks login + powers     Mac now → Supabase / AWS later
```

## Folder map

| Path | What it is |
|---|---|
| `prisma/schema.prisma` | The approved Phase 1 database design (28 tables). Owned by the database chat. |
| `prisma/phase1_extras.sql` | Database rules Prisma can't write (one open membership, one owner, like/comment counters…). |
| `prisma/migrations/` | The SQL that builds the tables. `20261027000000_phase1_baseline` = all of Phase 1. |
| `prisma/seed.ts` + `seed-data/` | Fills places (states, districts, zones) and the test accounts. |
| `src/server/` | The engine room: login, permissions, and one *service* file per area with all the rules. |
| `src/app/api/` | The web addresses (routes). Each one is a few lines that call a service. |
| `tests/` | Automated tests that log in as every role and check what they can and can't do. |

How a request flows: `src/app/api/clubs/[id]/join/route.ts` → `requireViewer` (who is this?) → `memberships.service.ts → requestToJoin` (rules + database) → JSON reply.

## First-time setup (Mac)

```bash
pnpm install                      # at the repo root: downloads packages + prepares Prisma (needs internet)
cd apps/api                       # every command below runs from here
```

Add these lines to your `.env` (it already has DATABASE_URL and DIRECT_URL). `$(whoami)` fills in your username:

```bash
cat >> .env <<EOF
TEST_DATABASE_URL="postgresql://$(whoami)@localhost:5432/baskyclub_test"
JWT_SECRET="$(openssl rand -base64 48)"
API_URL="http://localhost:3000"
WEB_URL="http://localhost:3001"
EOF
```

Then:

```bash
pnpm db:migrate                # build tables (already done once — safe to repeat)
pnpm db:seed                   # places + test accounts
pnpm dev                       # start the API → open http://localhost:3000/api/health
```

Automated tests (use a separate, throwaway database — they erase it every run):

```bash
createdb baskyclub_test
ppnpm test:prepare              # build tables in the test database
pnpm test                          # 144 checks, about 15 seconds
```

## Everyday commands

| Command | Does |
|---|---|
| `pnpm dev` | Start the API at http://localhost:3000 (restarts on every file save) |
| `pnpm test` | Run all tests |
| `pnpm db:seed` | Add places + test accounts (skips what already exists) |
| `pnpm db:reset` | **Erase the local database** and rebuild it from scratch + seed |
| `pnpm db:studio` | Look at the data in the browser |
| `pnpm typecheck` | Check the code for type mistakes |

## Test accounts (local / testing only)

All use the password **`Basky@123`**. Phone numbers are `+91 90000 000NN` (NN = the number below).

| # | Email | Role |
|---|---|---|
| 1 | superadmin@test.baskyclub.in | Super admin (everything) |
| 2 | baskyteam@test.baskyclub.in | Basky team: approves clubs |
| 3 | moderator@test.baskyclub.in | Moderator: review queue for posts and comments |
| 4 | tnba.admin@test.baskyclub.in | TNBA owner + General Secretary |
| 5 | vellore.admin@test.baskyclub.in | Vellore DBA owner + Secretary |
| 6 | vellore.member@test.baskyclub.in | Vellore DBA member + Joint Secretary |
| 7 | club.owner@test.baskyclub.in | Owner of Vellore Hoopers |
| 8 | club.admin@test.baskyclub.in | Admin of Vellore Hoopers (SG) |
| 9 | captain@test.baskyclub.in | Captain of Vellore Hoopers (PG) |
| 10 | coach@test.baskyclub.in | Head coach of Vellore Hoopers; owner of Vellore Basketball Academy |
| 11 | player@test.baskyclub.in | Player at Vellore Hoopers (SF) |
| 12 | minor.player@test.baskyclub.in | 16-year-old player, parent confirmed (C) |
| 13 | minor.pending@test.baskyclub.in | 15-year-old, waiting for parent → browse only |
| 14 | joiner@test.baskyclub.in | Asked to join Vellore Hoopers (pending) |
| 15 | user@test.baskyclub.in | Normal user, no club (left Vellore Hoopers last year) |
| 16 | creator@test.baskyclub.in | Creator badge |
| 17 | suspended@test.baskyclub.in | Suspended — cannot log in |
| 18 | pending.owner@test.baskyclub.in | Owner of Katpadi Ballers (waiting for approval) |
| — | (no account) | Visitor |

Clubs: **Vellore Hoopers** (approved, affiliated to Vellore DBA, verified) · **Vellore Basketball Academy** (approved, community club) · **Katpadi Ballers** (pending).
Associations: BFI → TNBA → Vellore DBA (claimed, covers Vellore + Tirupathur) and Chennai DBA (published).

Sample posts (Round 2): Priya's photo post (pinned), club highlights (YouTube), a members-only notice, a club-page trials post, a no-club post waiting for review, the creator's drill with a comment thread, a TNBA post (Chennai) and a junior's post — plus likes and follows.

The seed never adds test accounts when `NODE_ENV=production` (unless `SEED_TEST_WORLD=yes`).

## API — Round 1

All replies are JSON. Errors look like `{ "error": { "code": "already_member", "message": "You are already a member of this club." } }`.
Send the login token as `Authorization: Bearer <token>`.

| Method | Address | Who | Does |
|---|---|---|---|
| GET | /api/health | anyone | API and database are up |
| POST | /api/auth/signup | anyone | Create account; under-18 needs `parentName` + `parentEmail` |
| POST | /api/auth/login | anyone | `{ login: email or phone, password }` → token |
| GET | /api/auth/me | logged in | Own profile, clubs, roles, association powers |
| POST | /api/auth/change-password | logged in | `{ currentPassword, newPassword }` |
| POST | /api/auth/parental-consent/confirm | parent (link) | `{ token }` → under-18 account becomes active |
| GET | /api/places/states | anyone | 36 states |
| GET | /api/places/states/:code/districts | anyone | Districts of a state |
| GET | /api/clubs | anyone | Approved clubs; `?districtCode= &stateCode= &kind= &q= &limit= &offset=` |
| POST | /api/clubs | adult, active | Register a club (waits for approval; you become owner) |
| GET | /api/clubs/:id | anyone | Club page (+ what *you* can do there) |
| PATCH | /api/clubs/:id | owner, admin, Basky team | Edit details |
| POST | /api/clubs/:id/review | Basky team | `{ decision: approve / suspend / reinstate }` |
| GET | /api/admin/clubs?status=pending | Basky team | Approval queue |
| GET | /api/clubs/:id/members | anyone | Active members, positions, roles |
| POST / DELETE | /api/clubs/:id/join | logged in | Ask to join / withdraw request |
| POST | /api/clubs/:id/leave | member | Leave (owner must hand over first) |
| GET | /api/clubs/:id/requests | owner, admin | Pending join requests |
| POST | /api/memberships/:id/approve, /reject | owner, admin | Decide a request |
| PATCH | /api/memberships/:id | member (own position) / staff | Player ticked, position, coach, referee |
| DELETE | /api/memberships/:id | owner, admin | Remove a member (only owner removes an admin) |
| POST | /api/clubs/:id/roles | owner (admin) / owner+admin (captain) | `{ userId, role }` |
| DELETE | /api/club-roles/:id | see service | End a role (kept as history) |
| POST | /api/clubs/:id/transfer-ownership | owner, Basky team | `{ newOwnerUserId, keepAsAdmin }` |

## API — Round 2 (community)

| Method | Address | Who | Does |
|---|---|---|---|
| GET | /api/feed?scope=all\|district\|following&districtCode=&cursor= | anyone (following: logged in) | Feed, 20 at a time; `nextCursor` loads more |
| POST | /api/posts | club member (current or past) or staff | `{ content, clubId?, organizationId?, visibility, images: [{url}], youtubeUrl? }` |
| GET / PATCH / DELETE | /api/posts/:id | anyone / author / author or moderator | Read, edit text, delete |
| POST | /api/posts/:id/share | logged in | Count a share, get the link |
| POST / DELETE | /api/posts/:id/like | active account | Like / unlike → `{ liked, likeCount }` |
| GET / POST | /api/posts/:id/comments | anyone / active account | Top-level comments; add `{ content, parentId? }` |
| GET | /api/comments/:id/replies | anyone | "View N replies" |
| DELETE | /api/comments/:id | commenter, post author, moderator | Leaves "Comment removed" if it has replies |
| GET | /api/clubs/:id/posts | anyone (members see members-only) | Club page posts |
| GET | /api/users/:id · /api/users/:id/posts | anyone | Profile page and its posts |
| PATCH | /api/auth/me | logged in | Edit profile, district, pinned post |
| GET / POST / DELETE | /api/follows | logged in | My follows / follow `{ targetType, targetId }` / unfollow `?targetType=&targetId=` |
| POST | /api/reports | logged in | Report a post, comment or person |
| GET | /api/moderation/cases?status=open\|hidden | moderator, Basky team | Review queue |
| POST | /api/moderation/cases/:id/decide | moderator, Basky team | `{ decision: approve / hide / remove, note? }`. Hide is reversible (`?status=hidden` lists them); approve and remove are final |

**Who sees a post:** `public` — everywhere · `club_page` — club page, author's profile, and the Following feed of the club's members/followers · `members` — active members of that club only. Posts waiting for review are seen only by their author and moderators.
**Who can post (Phase 1 PRD §7):** current or past members of an approved club/academy, and BaskyCLub staff. Posts for a club: its active members and club staff only. Posts for an association: its owner/admins (or the Basky team). Everyone else gets 403 `club_members_only`. Posts publish immediately; reports still go to the moderators' queue.
**Limits:** 10 posts an hour, 5 comments a minute, 10 photos + 1 YouTube link per post.

## API — Round 3 (associations, alerts, admin, map, photos)

| Method | Address | Who | Does |
|---|---|---|---|
| GET / POST | /api/associations | anyone / super admin | List (`?level=&stateCode=&q=`) / create (starts as draft) |
| GET / PATCH | /api/associations/:id | anyone / association owner+admin (pageStatus: Basky team) | Association page / edit |
| PUT | /api/associations/:id/districts | Basky team | `{ districtCodes }` it covers |
| GET / POST | /api/associations/:id/members | association owner+admin | Who has power; add `{ userId, accessLevel }` |
| DELETE | /api/organization-members/:id | owner, Basky team, or self | End an association role |
| GET / POST | /api/associations/:id/office-bearers | anyone (`?past=1`) / staff | Office bearers with terms |
| PATCH / DELETE | /api/office-bearers/:id | staff | End a term (`termTo`) / remove a mistake |
| GET / POST | /api/associations/:id/legacy | anyone / staff | Media / Legacy records with photos + YouTube |
| PATCH / DELETE | /api/legacy/:id | staff | Edit / remove a record |
| GET / POST | /api/associations/:id/import/office-bearers\|legacy | Basky team | Bulk upload from a spreadsheet (see below): GET = empty CSV template; POST form data `file` (+ `dryRun=1` for a report only) |
| GET | /api/associations/:id/posts | anyone | Official posts (`POST /api/posts` with `organizationId`) |
| GET / POST | /api/clubs/:id/affiliations | club staff | List / ask to affiliate `{ organizationId }` |
| GET / POST | /api/associations/:id/affiliations | association staff | List (`?status=pending`) / invite `{ clubId }` |
| POST | /api/affiliations/:id/decide | the other side's staff | `{ decision: approve / reject, validUntil? }` (default 31 March) |
| POST | /api/affiliations/:id/end | either side | End / withdraw |
| POST | /api/announcements | association team / club owner+admin / Basky team | `{ senderOrgId? \| senderClubId?, audience, districtCode?, title, body, showInFeed }` |
| GET | /api/alerts?box=inbox\|sent | logged in | Alerts inbox (bell): announcements + replies to your comments (`type`), newest first, `nextCursor`; tap opens `postId` |
| POST / DELETE | /api/devices | logged in | Register phone `{ token, platform }` / remove `?token=` |
| GET | /api/map?lat=&lng=&radiusKm= (or ?districtCode=) | anyone | Clubs + courts near you, nearest first |
| POST / GET / PATCH / DELETE | /api/courts, /api/courts/:id | logged in / see service | Suggest and manage courts |
| POST | /api/courts/:id/review · GET /api/admin/courts | Basky team | Approve courts |
| PUT | /api/clubs/:id/timings | club staff | Weekly practice hours |
| POST | /api/uploads | active account | Photo (form field `file`, JPG/PNG/WEBP/HEIC, ≤10 MB) → `{ url }` |
| POST | /api/auth/forgot-password · /api/auth/reset-password | anyone | Email a reset link (same answer for unknown emails; 3 an hour per address, 20 per network) · set the new password. Email link is the only way to reset (PRD §4) |
| GET / POST / DELETE | /api/admin/badges(/:id) | Basky team | Verified (clubs) and Creator (people) badges |
| GET | /api/admin/users · POST /api/admin/users/:id/status | Basky team | Find accounts · set `{ status: active / limited / suspended / deleted, reason }`. Deleted is final and refused while the person holds a BaskyCLub role or owns a club/association |
| GET / POST / DELETE | /api/admin/roles(/:id) | super admin (list: Basky team) | BaskyCLub roles |
| GET | /api/admin/change-log | super admin | Who changed what |
| PATCH | /api/admin/zones/:code · /api/admin/districts/:code | Basky team | Fix zones and districts |

**Bulk upload (PRD §6).** The Basky team fills a sheet, downloads it as CSV (UTF-8) and uploads it for one association, also while its page is still a draft. Headers can be written any way (`Term From`, `term_from`); dates as `2024-04-01`, `01/04/2024` or `01-04-2024` (day first). Up to 500 rows / 1 MB. Every row is checked like adding it by hand; with `dryRun=1` you get `{ total, valid, errors: [{ line, field, message }], preview }`. Without it, nothing is saved unless every row is fine (`400 fix_rows` lists the problems). Rows already on the page, or twice in the file, are refused, so uploading the same file again makes no copies.

| Kind | Columns (required in bold) |
|---|---|
| `office-bearers` | **name**, **designation**, **term_from**, term_to, sort_order, photo_url (https) |
| `legacy` (Media) | **record_type** (`history` / `tournament_record` / `achievement`), **title**, year, story, winner, runner_up, photo_urls (https, separated by spaces or `\|`), youtube_url |

**Who can send announcements to whom:** association team → club admins in its area, members of affiliated clubs, people living in a district it covers, its followers · club owner/admin → club members, followers · BaskyCLub team → everyone, a district. Limit: 10 a day per sender.

**Settings for later (`.env`):** `EMAIL_DRIVER=resend` + `RESEND_API_KEY` (emails are printed in Terminal until then) · `PUSH_DRIVER=expo` (alerts are only recorded until then) · `STORAGE_DRIVER` (photos go to the `uploads` folder for now; Supabase Storage / S3 is added once hosting is chosen).

## Moving to Supabase / AWS later

Only `.env` changes (the two database addresses + a new JWT_SECRET). Then `pnpm db:migrate` against the new address.
Test accounts are **not** for the live site.
