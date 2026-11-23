// =============================================================================
// BaskyCLub seed — run with:  npm run db:seed
//
// 1. Places (always): 36 states, 786 districts, 4 Tamil Nadu zones.
// 2. Test world (local/testing only): associations, clubs and one account per role,
//    centred on Vellore. Every test account uses the password in TEST_PASSWORD.
//
// Safe to run twice: places are only added if missing; the test world is skipped
// if it already exists. To start completely fresh: npm run db:reset
// =============================================================================
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const TEST_PASSWORD = "Basky@123";
const DATA_DIR = join(__dirname, "seed-data");

// Fixed ids so the app, tests and screenshots can refer to the same records.
export const ID = {
  user: (n: number) => `0000000a-0000-4000-8000-${String(n).padStart(12, "0")}`,
  org: (n: number) => `0000000b-0000-4000-8000-${String(n).padStart(12, "0")}`,
  club: (n: number) => `0000000c-0000-4000-8000-${String(n).padStart(12, "0")}`,
  post: (n: number) => `0000000d-0000-4000-8000-${String(n).padStart(12, "0")}`,
  announcement: (n: number) => `0000000e-0000-4000-8000-${String(n).padStart(12, "0")}`,
};

// One account per role. "key" is the short name used in tests: TEST_USERS.player.email
export const TEST_USERS = {
  superAdmin: { n: 1, name: "Sara SuperAdmin", email: "superadmin@test.baskyclub.in", dob: "1990-01-15" },
  baskyTeam: { n: 2, name: "Bala BaskyTeam", email: "baskyteam@test.baskyclub.in", dob: "1994-03-02" },
  moderator: { n: 3, name: "Meena Moderator", email: "moderator@test.baskyclub.in", dob: "1996-07-21" },
  tnbaAdmin: { n: 4, name: "Thiru TNBA Secretary", email: "tnba.admin@test.baskyclub.in", dob: "1972-11-09" },
  districtAdmin: { n: 5, name: "Vimal Vellore DBA", email: "vellore.admin@test.baskyclub.in", dob: "1980-05-30" },
  associationMember: { n: 6, name: "Anitha Association", email: "vellore.member@test.baskyclub.in", dob: "1988-08-12" },
  clubOwner: { n: 7, name: "Karthik ClubOwner", email: "club.owner@test.baskyclub.in", dob: "1985-02-18" },
  clubAdmin: { n: 8, name: "Divya ClubAdmin", email: "club.admin@test.baskyclub.in", dob: "1992-09-04" },
  captain: { n: 9, name: "Arun Captain", email: "captain@test.baskyclub.in", dob: "2000-04-11" },
  coach: { n: 10, name: "Coach Prakash", email: "coach@test.baskyclub.in", dob: "1978-12-01" },
  player: { n: 11, name: "Priya Player", email: "player@test.baskyclub.in", dob: "2002-06-25" },
  minorPlayer: { n: 12, name: "Rahul Junior (16)", email: "minor.player@test.baskyclub.in", dob: "" },
  minorAwaitingParent: { n: 13, name: "Kavin Junior (15)", email: "minor.pending@test.baskyclub.in", dob: "" },
  joiner: { n: 14, name: "Joel Joiner", email: "joiner@test.baskyclub.in", dob: "1999-10-10" },
  normalUser: { n: 15, name: "Nisha NoClub", email: "user@test.baskyclub.in", dob: "1998-01-20" },
  creator: { n: 16, name: "Hari HoopsCreator", email: "creator@test.baskyclub.in", dob: "1997-03-14" },
  suspended: { n: 17, name: "Suresh Suspended", email: "suspended@test.baskyclub.in", dob: "1995-05-05" },
  pendingClubOwner: { n: 18, name: "Ganesh NewClub", email: "pending.owner@test.baskyclub.in", dob: "1991-11-23" },
} as const;
export type TestUserKey = keyof typeof TEST_USERS;

export const TEST_CLUBS = {
  velloreHoopers: ID.club(1), // approved, affiliated to Vellore DBA, verified
  velloreAcademy: ID.club(2), // approved academy, not affiliated ("Community club")
  katpadiBallers: ID.club(3), // pending approval
};
export const TEST_ORGS = { bfi: ID.org(1), tnba: ID.org(2), velloreDba: ID.org(3), chennaiDba: ID.org(4) };

// ---- CSV ------------------------------------------------------------------------

function readCsv(file: string): Record<string, string>[] {
  const [header, ...lines] = readFileSync(join(DATA_DIR, file), "utf8").trim().split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? "").trim()]));
  });
}
const orNull = (s: string) => (s === "" ? null : s);

// ---- 1. Places --------------------------------------------------------------------

export async function seedPlaces(prisma: PrismaClient) {
  const states = readCsv("states_india.csv");
  const zones = readCsv("zones.csv");
  const districts = readCsv("districts_india.csv");

  await prisma.state.createMany({
    data: states.map((s) => ({ code: s.state_code, name: s.state_name, type: s.type })),
    skipDuplicates: true,
  });
  // Zones first without their HQ district (districts point to zones, zones point back to an HQ district)
  await prisma.zone.createMany({
    data: zones.map((z) => ({
      code: z.zone_code,
      stateCode: z.state_code,
      name: z.zone_name,
      isProvisional: z.is_provisional === "true",
    })),
    skipDuplicates: true,
  });
  await prisma.district.createMany({
    data: districts.map((d) => ({
      code: d.district_code,
      name: d.district_name,
      stateCode: d.state_code,
      lgdCode: orNull(d.lgd_code),
      altName: orNull(d.alt_name),
      shortCode: orNull(d.short_code),
      zoneCode: orNull(d.zone_code),
      isProvisional: d.is_provisional === "true",
    })),
    skipDuplicates: true,
  });
  for (const z of zones) {
    if (z.hq_district_code) {
      await prisma.zone.update({ where: { code: z.zone_code }, data: { hqDistrictCode: z.hq_district_code } });
    }
  }
  return { states: states.length, districts: districts.length, zones: zones.length };
}

// ---- 2. Test world --------------------------------------------------------------------

function yearsAgo(years: number, extraDays = 30): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear() - years, d.getUTCMonth(), d.getUTCDate() - extraDays));
}
function dateOf(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export async function seedTestWorld(prisma: PrismaClient, rounds = 10) {
  const already = await prisma.user.findUnique({ where: { email: TEST_USERS.superAdmin.email } });
  if (already) return { skipped: true };

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, rounds);
  const u = (key: TestUserKey) => ID.user(TEST_USERS[key].n);
  const now = new Date();
  const nextYearEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 2, 31)); // 31 March next year

  await prisma.$transaction(
    async (tx) => {
      // People
      for (const [key, t] of Object.entries(TEST_USERS) as [TestUserKey, (typeof TEST_USERS)[TestUserKey]][]) {
        const dateOfBirth =
          key === "minorPlayer" ? yearsAgo(16) : key === "minorAwaitingParent" ? yearsAgo(15) : dateOf(t.dob);
        await tx.user.create({
          data: {
            id: u(key),
            name: t.name,
            email: t.email,
            phone: `+9190000${String(t.n).padStart(5, "0")}`,
            passwordHash,
            dateOfBirth,
            homeDistrictCode: key === "tnbaAdmin" ? "TN-CHENNAI" : "TN-VELLORE",
            status: key === "minorAwaitingParent" ? "limited" : key === "suspended" ? "suspended" : "active",
            bio: `Test account: ${key}`,
          },
        });
      }

      // BaskyCLub team (#12, #43)
      await tx.platformRole.createMany({
        data: [
          { userId: u("superAdmin"), role: "super_admin" },
          { userId: u("baskyTeam"), role: "basky_admin", grantedById: u("superAdmin") },
          { userId: u("moderator"), role: "moderator", grantedById: u("superAdmin") },
        ],
      });

      // Under-18 accounts: one confirmed by a parent, one still waiting (#67)
      await tx.parentalConsent.createMany({
        data: [
          {
            userId: u("minorPlayer"),
            parentName: "Rahul's Parent",
            parentEmail: "parent.rahul@test.baskyclub.in",
            tokenHash: "seed-confirmed-consent",
            status: "confirmed",
            confirmedAt: now,
          },
          {
            userId: u("minorAwaitingParent"),
            parentName: "Kavin's Parent",
            parentEmail: "parent.kavin@test.baskyclub.in",
            tokenHash: "seed-pending-consent",
            status: "sent",
          },
        ],
      });

      // Associations: BFI → TNBA → district associations (#19, #59, #60)
      await tx.organization.create({
        data: { id: TEST_ORGS.bfi, name: "Basketball Federation of India", shortName: "BFI", level: "national", pageStatus: "published", createdById: u("superAdmin") },
      });
      await tx.organization.create({
        data: { id: TEST_ORGS.tnba, name: "Tamil Nadu Basketball Association", shortName: "TNBA", level: "state", parentId: TEST_ORGS.bfi, stateCode: "TN", pageStatus: "claimed", claimedAt: now, createdById: u("superAdmin") },
      });
      await tx.organization.create({
        data: { id: TEST_ORGS.velloreDba, name: "Vellore District Basketball Association", shortName: "Vellore DBA", level: "district", parentId: TEST_ORGS.tnba, stateCode: "TN", pageStatus: "claimed", claimedAt: now, createdById: u("superAdmin") },
      });
      await tx.organization.create({
        data: { id: TEST_ORGS.chennaiDba, name: "Chennai District Basketball Association", shortName: "Chennai DBA", level: "district", parentId: TEST_ORGS.tnba, stateCode: "TN", pageStatus: "published", createdById: u("superAdmin") },
      });
      // Vellore DBA also covers Tirupathur (no separate DBA, per districts_india.csv)
      await tx.district.updateMany({ where: { code: { in: ["TN-VELLORE", "TN-TIRUPATHUR"] } }, data: { associationId: TEST_ORGS.velloreDba } });
      await tx.district.update({ where: { code: "TN-CHENNAI" }, data: { associationId: TEST_ORGS.chennaiDba } });

      // Association powers (organization_members) and public titles (office_bearers)
      await tx.organizationMember.createMany({
        data: [
          { organizationId: TEST_ORGS.tnba, userId: u("tnbaAdmin"), accessLevel: "owner", grantedById: u("superAdmin") },
          { organizationId: TEST_ORGS.velloreDba, userId: u("districtAdmin"), accessLevel: "owner", grantedById: u("superAdmin") },
          { organizationId: TEST_ORGS.velloreDba, userId: u("associationMember"), accessLevel: "member", grantedById: u("districtAdmin") },
        ],
      });
      await tx.officeBearer.createMany({
        data: [
          { organizationId: TEST_ORGS.tnba, userId: u("tnbaAdmin"), name: TEST_USERS.tnbaAdmin.name, designation: "General Secretary", termFrom: dateOf("2024-04-01"), sortOrder: 1, enteredById: u("superAdmin") },
          { organizationId: TEST_ORGS.velloreDba, name: "Mr. S. Rajendran", designation: "President", termFrom: dateOf("2024-04-01"), sortOrder: 1, enteredById: u("districtAdmin") },
          { organizationId: TEST_ORGS.velloreDba, userId: u("districtAdmin"), name: TEST_USERS.districtAdmin.name, designation: "Secretary", termFrom: dateOf("2024-04-01"), sortOrder: 2, enteredById: u("superAdmin") },
          { organizationId: TEST_ORGS.velloreDba, userId: u("associationMember"), name: TEST_USERS.associationMember.name, designation: "Joint Secretary", termFrom: dateOf("2024-04-01"), sortOrder: 3, enteredById: u("districtAdmin") },
          { organizationId: TEST_ORGS.velloreDba, name: "Mr. K. Murugan", designation: "Secretary", termFrom: dateOf("2020-04-01"), termTo: dateOf("2024-03-31"), sortOrder: 2, enteredById: u("districtAdmin") },
        ],
      });
      await tx.legacyRecord.create({
        data: {
          organizationId: TEST_ORGS.velloreDba,
          recordType: "tournament_record",
          title: "Vellore District Championship",
          year: 2025,
          winner: "Vellore Hoopers",
          runnerUp: "Katpadi Ballers",
          createdById: u("districtAdmin"),
        },
      });

      // Clubs
      await tx.club.create({
        data: { id: TEST_CLUBS.velloreHoopers, name: "Vellore Hoopers", kind: "club", districtCode: "TN-VELLORE", status: "approved", description: "Test club: affiliated and verified.", motto: "One team, one city", latitude: 12.9165, longitude: 79.1325, createdById: u("clubOwner") },
      });
      await tx.club.create({
        data: { id: TEST_CLUBS.velloreAcademy, name: "Vellore Basketball Academy", kind: "academy", districtCode: "TN-VELLORE", status: "approved", description: "Test academy: community club, not affiliated.", latitude: 12.9692, longitude: 79.1559, createdById: u("coach") },
      });
      await tx.club.create({
        data: { id: TEST_CLUBS.katpadiBallers, name: "Katpadi Ballers", kind: "club", districtCode: "TN-VELLORE", status: "pending", description: "Test club: waiting for BaskyCLub approval.", createdById: u("pendingClubOwner") },
      });

      const joined = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
      const H = TEST_CLUBS.velloreHoopers;
      await tx.clubMembership.createMany({
        data: [
          { clubId: H, userId: u("clubOwner"), status: "active", isPlayer: false, joinedAt: joined, approvedById: u("clubOwner") },
          { clubId: H, userId: u("clubAdmin"), status: "active", isPlayer: true, primaryPosition: "SG", joinedAt: joined, approvedById: u("clubOwner") },
          { clubId: H, userId: u("captain"), status: "active", isPlayer: true, primaryPosition: "PG", joinedAt: joined, approvedById: u("clubOwner") },
          { clubId: H, userId: u("coach"), status: "active", isPlayer: false, isCoach: true, joinedAt: joined, approvedById: u("clubOwner") },
          { clubId: H, userId: u("player"), status: "active", isPlayer: true, primaryPosition: "SF", joinedAt: joined, approvedById: u("clubAdmin") },
          { clubId: H, userId: u("minorPlayer"), status: "active", isPlayer: true, primaryPosition: "C", joinedAt: joined, approvedById: u("clubAdmin") },
          { clubId: H, userId: u("joiner"), status: "pending", isPlayer: true, primaryPosition: "PF" },
          // History: the normal user played here last year and left (rejoin test)
          { clubId: H, userId: u("normalUser"), status: "left", isPlayer: true, joinedAt: new Date(now.getTime() - 400 * 24 * 3600 * 1000), leftAt: new Date(now.getTime() - 200 * 24 * 3600 * 1000) },
          { clubId: TEST_CLUBS.velloreAcademy, userId: u("coach"), status: "active", isPlayer: false, isCoach: true, joinedAt: joined, approvedById: u("coach") },
          { clubId: TEST_CLUBS.katpadiBallers, userId: u("pendingClubOwner"), status: "active", isPlayer: true, primaryPosition: "SF", joinedAt: now, approvedById: u("pendingClubOwner") },
        ],
      });
      await tx.clubRole.createMany({
        data: [
          { clubId: H, userId: u("clubOwner"), role: "owner", grantedById: u("clubOwner"), fromAt: joined },
          { clubId: H, userId: u("clubAdmin"), role: "admin", grantedById: u("clubOwner"), fromAt: joined },
          { clubId: H, userId: u("captain"), role: "captain", grantedById: u("clubOwner"), fromAt: joined },
          { clubId: TEST_CLUBS.velloreAcademy, userId: u("coach"), role: "owner", grantedById: u("coach"), fromAt: joined },
          { clubId: TEST_CLUBS.katpadiBallers, userId: u("pendingClubOwner"), role: "owner", grantedById: u("pendingClubOwner") },
        ],
      });
      await tx.coach.createMany({
        data: [
          { clubId: H, userId: u("coach"), name: TEST_USERS.coach.name, role: "head", isPrimary: true, startedAt: joined },
          { clubId: H, name: "Ms. Lakshmi (no account)", role: "assistant", startedAt: joined },
          { clubId: TEST_CLUBS.velloreAcademy, userId: u("coach"), name: TEST_USERS.coach.name, role: "head", isPrimary: true, startedAt: joined },
        ],
      });

      // Affiliation (#58): Vellore Hoopers is affiliated to Vellore DBA until 31 March next year
      await tx.affiliation.create({
        data: { clubId: H, organizationId: TEST_ORGS.velloreDba, tnbaNumber: "TNBA/VLR/0001", validFrom: dateOf(`${now.getUTCFullYear()}-04-01`), validUntil: nextYearEnd, status: "active", startedBy: "club", requestedById: u("clubOwner"), decidedById: u("districtAdmin"), decidedAt: now },
      });

      // Badges (#35, #73)
      await tx.verificationBadge.createMany({
        data: [
          { clubId: H, badge: "basky_verified", verifiedById: u("baskyTeam") },
          { userId: u("creator"), badge: "creator", verifiedById: u("baskyTeam") },
        ],
      });

      // Court + practice hours
      await tx.court.create({
        data: { clubId: H, name: "Vellore Hoopers Court", districtCode: "TN-VELLORE", indoor: false, surface: "synthetic", address: "Near Fort, Vellore", latitude: 12.9202, longitude: 79.1288, status: "approved", createdById: u("clubOwner") },
      });
      await tx.clubCourtTiming.createMany({
        data: [1, 3, 5].map((day) => ({ clubId: H, dayOfWeek: day, morningStart: "06:00", morningEnd: "08:00", eveningStart: "17:30", eveningEnd: "19:30" })),
      });
    },
    { timeout: 60_000 },
  );

  return { skipped: false, users: Object.keys(TEST_USERS).length, clubs: 3, organizations: 4 };
}


// ---- 3. Sample community (Round 2): posts, comments, likes, follows -----------------------

export const TEST_POSTS = {
  playerPhotos: ID.post(1), // Priya, public, 2 photos, pinned on her profile
  clubHighlights: ID.post(2), // club owner, Vellore Hoopers, public + YouTube
  membersNotice: ID.post(3), // captain, members only
  trialsClubPage: ID.post(4), // club admin, club page only
  noClubInReview: ID.post(5), // normal user (no club) → waiting for review
  creatorDrill: ID.post(6), // creator, public + YouTube, with a comment thread
  tnbaNews: ID.post(7), // TNBA secretary, Chennai
  juniorPost: ID.post(8), // 16-year-old player
  officialCard: ID.post(20), // Vellore DBA announcement shown in the feed (Round 3)
};

export async function seedCommunity(prisma: PrismaClient) {
  const already = await prisma.post.findUnique({ where: { id: TEST_POSTS.playerPhotos } });
  if (already) return { skipped: true };
  const u = (key: TestUserKey) => ID.user(TEST_USERS[key].n);
  const H = TEST_CLUBS.velloreHoopers;
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);
  // Free Unsplash basketball photos (unsplash.com/license)
  const photos = ["photo-1546519638-68e109498ffc", "photo-1608245449230-4ac19066d2d0", "photo-1519861531473-9200262188bf"];
  let next = 0;
  const photo = (_label: string) => `https://images.unsplash.com/${photos[next++ % photos.length]}?w=1080&q=80&auto=format&fit=crop`;

  await prisma.$transaction(
    async (tx) => {
      const posts = [
        { id: TEST_POSTS.playerPhotos, authorId: u("player"), districtCode: "TN-VELLORE", visibility: "public", content: "Sunday shootaround at the fort court 🏀", createdAt: hoursAgo(30), media: [photo("Shootaround 1"), photo("Shootaround 2")] },
        { id: TEST_POSTS.clubHighlights, authorId: u("clubOwner"), clubId: H, districtCode: "TN-VELLORE", visibility: "public", content: "Watching India v Lebanon before our district final. Learn from the best!", createdAt: hoursAgo(26), youtube: "https://www.youtube.com/watch?v=WqqN3wwhqfE" },
        { id: TEST_POSTS.membersNotice, authorId: u("captain"), clubId: H, districtCode: "TN-VELLORE", visibility: "members", content: "Members: practice moves to 6 am tomorrow. Bring white jerseys.", createdAt: hoursAgo(20) },
        { id: TEST_POSTS.trialsClubPage, authorId: u("clubAdmin"), clubId: H, districtCode: "TN-VELLORE", visibility: "club_page", content: "Under-18 trials this Saturday, 7 am. Open to all.", createdAt: hoursAgo(18) },
        { id: TEST_POSTS.noClubInReview, authorId: u("normalUser"), districtCode: "TN-VELLORE", visibility: "public", content: "Anyone up for 3v3 near Katpadi this evening?", createdAt: hoursAgo(10), moderationStatus: "in_review" },
        { id: TEST_POSTS.creatorDrill, authorId: u("creator"), districtCode: "TN-VELLORE", visibility: "public", content: "Dribbling drills that fix weak handles. Do these daily.", createdAt: hoursAgo(8), youtube: "https://www.youtube.com/watch?v=q-tg_pGEXfU" },
        { id: TEST_POSTS.tnbaNews, authorId: u("tnbaAdmin"), districtCode: "TN-CHENNAI", visibility: "public", content: "State junior championship dates announced soon.", createdAt: hoursAgo(5) },
        { id: TEST_POSTS.juniorPost, authorId: u("minorPlayer"), districtCode: "TN-VELLORE", visibility: "public", content: "First dunk attempt 😅", createdAt: hoursAgo(2), media: [photo("First dunk")] },
      ];
      for (const p of posts) {
        const { media = [], youtube, ...data } = p as typeof p & { media?: string[]; youtube?: string };
        await tx.post.create({
          data: {
            ...data,
            updatedAt: data.createdAt,
            media: {
              create: [
                ...media.map((url, i) => ({ mediaType: "image", url, sortOrder: i, width: 1080, height: 1080 })),
                ...(youtube ? [{ mediaType: "youtube", url: youtube, sortOrder: media.length }] : []),
              ],
            },
          },
        });
      }
      await tx.moderationCase.create({ data: { targetType: "post", targetId: TEST_POSTS.noClubInReview, source: "no_club_review", createdAt: hoursAgo(10) } });

      // Comment thread on the creator's drill (one level of replies; a reply-to-reply carries @Name)
      const top = await tx.postComment.create({ data: { postId: TEST_POSTS.creatorDrill, userId: u("player"), content: "Tried this today — great drill!", createdAt: hoursAgo(7) } });
      await tx.postComment.create({ data: { postId: TEST_POSTS.creatorDrill, userId: u("creator"), parentId: top.id, content: "Thanks Priya! Do it with your weak hand too.", createdAt: hoursAgo(6) } });
      await tx.postComment.create({ data: { postId: TEST_POSTS.creatorDrill, userId: u("minorPlayer"), parentId: top.id, content: "@Hari HoopsCreator how many sets a day?", createdAt: hoursAgo(5) } });
      await tx.postComment.create({ data: { postId: TEST_POSTS.creatorDrill, userId: u("coach"), content: "Good basics for juniors. Sharing with my academy.", createdAt: hoursAgo(4) } });
      // A deleted comment that still has a reply → shows "Comment removed"
      const gone = await tx.postComment.create({ data: { postId: TEST_POSTS.playerPhotos, userId: u("joiner"), content: "(deleted by its author)", createdAt: hoursAgo(28) } });
      await tx.postComment.create({ data: { postId: TEST_POSTS.playerPhotos, userId: u("player"), parentId: gone.id, content: "@Joel Joiner see you at practice", createdAt: hoursAgo(27) } });
      await tx.postComment.update({ where: { id: gone.id }, data: { deletedAt: hoursAgo(26) } });
      await tx.postComment.create({ data: { postId: TEST_POSTS.playerPhotos, userId: u("clubOwner"), content: "Proud of the squad 💪", createdAt: hoursAgo(25) } });

      // Likes (counts update by themselves — database triggers)
      const likes: [string, TestUserKey[]][] = [
        [TEST_POSTS.playerPhotos, ["clubOwner", "captain", "creator"]],
        [TEST_POSTS.clubHighlights, ["player", "captain", "coach", "normalUser"]],
        [TEST_POSTS.creatorDrill, ["player", "minorPlayer", "normalUser", "joiner", "coach"]],
        [TEST_POSTS.juniorPost, ["player", "captain"]],
      ];
      for (const [postId, who] of likes) {
        await tx.postLike.createMany({ data: who.map((k) => ({ postId, userId: u(k) })) });
      }

      // Follows (#64, #73)
      await tx.follow.createMany({
        data: [
          { followerId: u("player"), targetType: "user", targetId: u("creator") },
          { followerId: u("minorPlayer"), targetType: "user", targetId: u("creator") },
          { followerId: u("normalUser"), targetType: "club", targetId: H },
          { followerId: u("normalUser"), targetType: "organization", targetId: TEST_ORGS.velloreDba },
          { followerId: u("joiner"), targetType: "club", targetId: H },
          { followerId: u("creator"), targetType: "club", targetId: H },
          { followerId: u("player"), targetType: "organization", targetId: TEST_ORGS.tnba },
        ],
      });

      // Profile details (#72)
      await tx.user.update({ where: { id: u("player") }, data: { pinnedPostId: TEST_POSTS.playerPhotos, instagram: "priya.hoops", bio: "SF · Vellore Hoopers" } });
      await tx.user.update({ where: { id: u("minorPlayer") }, data: { instagram: "rahul.junior" } }); // hidden on his profile (under 18)
      await tx.user.update({ where: { id: u("creator") }, data: { instagram: "hari.hoops", youtube: "https://www.youtube.com/@harihoops", bio: "Daily drills for Indian ballers" } });
    },
    { timeout: 60_000 },
  );
  return { skipped: false, posts: 8 };
}


// ---- 4. Associations, alerts, courts (Round 3) ---------------------------------------------

export const TEST_ANNOUNCEMENTS = {
  velloreDbaToAffiliated: ID.announcement(1), // Vellore DBA → members of affiliated clubs, also in feed
  hoopersToMembers: ID.announcement(2), // Vellore Hoopers → its members
  baskyToEveryone: ID.announcement(3), // BaskyCLub → everyone
};

export async function seedRound3(prisma: PrismaClient) {
  const already = await prisma.announcement.findUnique({ where: { id: TEST_ANNOUNCEMENTS.velloreDbaToAffiliated } });
  if (already) return { skipped: true };
  const u = (key: TestUserKey) => ID.user(TEST_USERS[key].n);
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);

  await prisma.$transaction(
    async (tx) => {
      // Official card in the feed for the DBA announcement (#75)
      const card = await tx.post.create({
        data: {
          id: TEST_POSTS.officialCard,
          authorId: u("districtAdmin"),
          organizationId: TEST_ORGS.velloreDba,
          districtCode: "TN-VELLORE",
          visibility: "public",
          isPinned: true,
          content: "District league registrations open\n\nAffiliated clubs: register your squads by 15 November.",
          createdAt: hoursAgo(3),
          updatedAt: hoursAgo(3),
        },
      });
      await tx.announcement.createMany({
        data: [
          { id: TEST_ANNOUNCEMENTS.velloreDbaToAffiliated, senderId: u("districtAdmin"), senderOrgId: TEST_ORGS.velloreDba, audience: "affiliated_members", title: "District league registrations open", body: "Affiliated clubs: register your squads by 15 November.", showInFeed: true, feedPostId: card.id, sentAt: hoursAgo(3) },
          { id: TEST_ANNOUNCEMENTS.hoopersToMembers, senderId: u("clubOwner"), senderClubId: TEST_CLUBS.velloreHoopers, audience: "club_members", title: "Jersey fees due", body: "Please pay ₹600 to Divya by Friday.", sentAt: hoursAgo(12) },
          { id: TEST_ANNOUNCEMENTS.baskyToEveryone, senderId: u("baskyTeam"), audience: "everyone", title: "Welcome to BaskyCLub", body: "Follow your district to see basketball near you.", sentAt: hoursAgo(48) },
        ],
      });

      // Phones registered for alerts (fake Expo tokens)
      await tx.deviceToken.createMany({
        data: [
          { userId: u("player"), token: "ExponentPushToken[test-player]", platform: "android" },
          { userId: u("clubOwner"), token: "ExponentPushToken[test-club-owner]", platform: "ios" },
          { userId: u("normalUser"), token: "ExponentPushToken[test-normal-user]", platform: "android" },
        ],
      });

      // Media / Legacy: photos and a history record (#66)
      const record = await tx.legacyRecord.findFirst({ where: { organizationId: TEST_ORGS.velloreDba } });
      if (record) {
        await tx.legacyMedia.createMany({
          data: [
            { legacyRecordId: record.id, mediaType: "image", url: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=1200&q=80&auto=format&fit=crop", sortOrder: 0 },
            { legacyRecordId: record.id, mediaType: "youtube", url: "https://www.youtube.com/watch?v=k4qbryDoJX0", sortOrder: 1 },
          ],
        });
      }
      await tx.legacyRecord.create({
        data: { organizationId: TEST_ORGS.velloreDba, recordType: "history", title: "How basketball came to Vellore", year: 1978, body: "Test history record for the Media section.", createdById: u("districtAdmin") },
      });

      // A court suggested by a user, waiting for approval
      await tx.court.create({
        data: { name: "Katpadi Public Court", districtCode: "TN-VELLORE", indoor: false, surface: "concrete", address: "Katpadi, Vellore", latitude: 12.9693, longitude: 79.1446, status: "pending", createdById: u("normalUser") },
      });
    },
    { timeout: 60_000 },
  );
  return { skipped: false };
}

// ---- Fix links from older seeds (placeholder photos and off-topic sample videos) -------------

export async function fixSampleLinks(prisma: PrismaClient) {
  const swaps: [string, string][] = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=WqqN3wwhqfE"],
    ["https://www.youtube.com/watch?v=9bZkp7q19f0", "https://www.youtube.com/watch?v=q-tg_pGEXfU"],
  ];
  let fixed = 0;
  for (const [from, to] of swaps) {
    fixed += (await prisma.postMedia.updateMany({ where: { url: from }, data: { url: to } })).count;
    fixed += (await prisma.legacyMedia.updateMany({ where: { url: from }, data: { url: to } })).count;
  }
  const photos = ["photo-1546519638-68e109498ffc", "photo-1608245449230-4ac19066d2d0", "photo-1519861531473-9200262188bf", "photo-1504450758481-7338eba7524a"];
  const old = await prisma.postMedia.findMany({ where: { url: { startsWith: "https://placehold.co/" } } });
  for (const [i, m] of old.entries()) {
    await prisma.postMedia.update({ where: { id: m.id }, data: { url: `https://images.unsplash.com/${photos[i % photos.length]}?w=1080&q=80&auto=format&fit=crop` } });
  }
  const oldLegacy = await prisma.legacyMedia.findMany({ where: { url: { startsWith: "https://placehold.co/" } } });
  for (const m of oldLegacy) {
    await prisma.legacyMedia.update({ where: { id: m.id }, data: { url: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=1200&q=80&auto=format&fit=crop" } });
  }
  return fixed + old.length + oldLegacy.length;
}

// ---- Run directly: npm run db:seed ---------------------------------------------------------

async function main() {
  // tsx doesn't read .env, and Prisma only finds it if .env existed when the client was
  // generated (pnpm install). Load it here; variables already set (e.g. in CI) win.
  if (existsSync(".env")) process.loadEnvFile(".env");
  const { prisma } = await import("../src/server/db");
  try {
    const places = await seedPlaces(prisma);
    console.log(`Places ready: ${places.states} states, ${places.districts} districts, ${places.zones} zones.`);

    const allowTestWorld = process.env.NODE_ENV !== "production" || process.env.SEED_TEST_WORLD === "yes";
    if (!allowTestWorld) {
      console.log("Production: test accounts not added (set SEED_TEST_WORLD=yes to add them on purpose).");
      return;
    }
    const world = await seedTestWorld(prisma);
    if (world.skipped) console.log("Test accounts already exist — nothing added. (npm run db:reset starts fresh.)");
    else console.log(`Test world added: ${world.users} accounts, ${world.clubs} clubs, ${world.organizations} associations. Password for all: ${TEST_PASSWORD}`);
    const community = await seedCommunity(prisma);
    console.log(community.skipped ? "Sample posts already exist — nothing added." : `Sample community added: ${community.posts} posts with comments, likes and follows.`);
    const round3 = await seedRound3(prisma);
    console.log(round3.skipped ? "Sample alerts already exist — nothing added." : "Sample alerts, Media/Legacy records and a pending court added.");
    const fixedLinks = await fixSampleLinks(prisma);
    if (fixedLinks) console.log(`Updated ${fixedLinks} sample photo/video links from an older seed.`);
    const { seedDemo } = await import("./demo");
    const demo = await seedDemo(prisma);
    console.log(demo.skipped ? "Demo world already exists — nothing added." : `Demo world added: ${demo.people} people, ${demo.clubs} clubs, ${demo.posts} posts with photos and YouTube videos.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
