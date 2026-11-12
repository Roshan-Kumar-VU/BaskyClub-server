// =============================================================================
// BaskyCLub demo world — fills the app with realistic content to click through.
// Runs as part of `npm run db:seed` (not in production). Safe to run twice.
//
// - 24 people across Vellore, Chennai, Coimbatore, Madurai and Tirupathur
// - 10 clubs and academies (some affiliated, some verified), with courts on the map
// - 30+ posts with real basketball YouTube videos and free Unsplash photos,
//   comments with replies, likes, follows, alerts and Media / Legacy records
// All people and clubs are made up. Every demo account uses the password Basky@123.
// =============================================================================
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ID, TEST_ORGS, TEST_PASSWORD, TEST_USERS } from "./seed";

const hex = (prefix: string) => (n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const DEMO_ID = { user: hex("0000001a"), org: hex("0000001b"), club: hex("0000001c"), post: hex("0000001d") };

// Free Unsplash photos (unsplash.com/license) — basketball courts, balls, games
const UNSPLASH = [
  "photo-1546519638-68e109498ffc", "photo-1608245449230-4ac19066d2d0", "photo-1577416412292-747c6607f055",
  "photo-1504450758481-7338eba7524a", "photo-1574623452334-1e0ac2b3ccb4", "photo-1629901925121-8a141c2a42f4",
  "photo-1595795279832-13f0df36fbb9", "photo-1602357280104-742c517a1d82", "photo-1590227632180-80a3bf110871",
  "photo-1474224017046-182ece80b263", "photo-1615174438196-b3538fe68737", "photo-1600534220378-df36338afc40",
  "photo-1519861531473-9200262188bf", "photo-1627627256672-027a4613d028", "photo-1515523110800-9415d13b84a8",
  "photo-1640576905072-8181534f83ae", "photo-1628779238951-be2c9f2a59f4", "photo-1653015503992-347de54a8125",
  "photo-1576438162986-c685b1cfed7a", "photo-1505666287802-931dc83948e9", "photo-1639843091936-bb5fca7b5684",
  "photo-1563506644863-444710df1e03", "photo-1518063319789-7217e6706b04", "photo-1585032083927-c7b26d6c1d07",
];
const img = (i: number, w = 1080) => `https://images.unsplash.com/${UNSPLASH[i % UNSPLASH.length]}?w=${w}&q=80&auto=format&fit=crop`;

// Real basketball videos on YouTube (FIBA channel highlights and coaching channels)
export const VIDEOS = {
  indiaQatar: "https://www.youtube.com/watch?v=7_4XNrHz7to",
  indiaSaudi: "https://www.youtube.com/watch?v=Zi3NP10p9_M",
  indiaLebanon: "https://www.youtube.com/watch?v=WqqN3wwhqfE",
  indiaChina: "https://www.youtube.com/watch?v=wyQx-qlV2aY",
  indiaNewZealand: "https://www.youtube.com/watch?v=ueEnP3yYZas",
  indiaKazakhstan: "https://www.youtube.com/watch?v=k4qbryDoJX0",
  indiaPhilippines: "https://www.youtube.com/watch?v=nYRPud9G2rQ",
  indiaKorea: "https://www.youtube.com/watch?v=y55IJQMC7rE",
  india3x3: "https://www.youtube.com/watch?v=tIN1KTwOdMs",
  india3x3HongKong: "https://www.youtube.com/watch?v=RhA1wbNXhp0",
  soloDrills: "https://www.youtube.com/watch?v=aWuh9lNkMk8",
  weakHandles: "https://www.youtube.com/watch?v=q-tg_pGEXfU",
  aloneDrills: "https://www.youtube.com/watch?v=Hg9HOElJ5ZY",
  youthDrills: "https://www.youtube.com/watch?v=1j8UI8G5RKU",
  beginnerDrills: "https://www.youtube.com/watch?v=YvQMWnNV__8",
  perfectForm: "https://www.youtube.com/watch?v=bEhDuk265Mo",
  formBeginner: "https://www.youtube.com/watch?v=r8s2LKc9H0w",
  nbaFormDrills: "https://www.youtube.com/watch?v=raWzJmdQ7CA",
  practiceStart: "https://www.youtube.com/watch?v=wHZDXV4ztHw",
};

// ---- People -------------------------------------------------------------------------------
type P = { n: number; name: string; district: string; dob: string; gender: "male" | "female"; bio?: string };
const PEOPLE: P[] = [
  { n: 1, name: "Arjun Selvam", district: "TN-VELLORE", dob: "2000-08-03", gender: "male", bio: "Point guard, Fort City Ballers. Fort court regular since 2012." },
  { n: 2, name: "Kavya Ramesh", district: "TN-VELLORE", dob: "2002-01-19", gender: "female", bio: "Small forward. Captain, Fort City women." },
  { n: 3, name: "Vikram Iyer", district: "TN-VELLORE", dob: "1996-11-30", gender: "male", bio: "Owner, Fort City Ballers." },
  { n: 4, name: "Meera Krishnan", district: "TN-VELLORE", dob: "1999-05-07", gender: "female", bio: "Runs the Katpadi Sunday games." },
  { n: 5, name: "Aadhi Prakash", district: "TN-VELLORE", dob: "2011-02-14", gender: "male", bio: "U-16. Training at Vellore Hoop Academy." },
  { n: 6, name: "Divya Nair", district: "TN-VELLORE", dob: "1997-12-10", gender: "female", bio: "Head coach, Vellore Hoop Academy." },
  { n: 7, name: "Hari Venkat", district: "TN-CHENNAI", dob: "1995-09-22", gender: "male", bio: "I break down Indian basketball on video." },
  { n: 8, name: "Sanjay Prakash", district: "TN-CHENNAI", dob: "1993-03-02", gender: "male", bio: "Owner, Marina Ballers." },
  { n: 9, name: "Nithya Suresh", district: "TN-CHENNAI", dob: "2001-07-25", gender: "female", bio: "Shooting guard, Marina Ballers women." },
  { n: 10, name: "Rajesh Kannan", district: "TN-CHENNAI", dob: "1979-04-15", gender: "male", bio: "Secretary, Chennai District Basketball Association." },
  { n: 11, name: "Lakshmi Sundar", district: "TN-CHENNAI", dob: "1988-10-02", gender: "female", bio: "Director, Anna Nagar Basketball Academy." },
  { n: 12, name: "Mohammed Irfan", district: "TN-CHENNAI", dob: "2004-06-11", gender: "male", bio: "Center. 6'7 and still growing." },
  { n: 13, name: "Pooja Venkatesh", district: "TN-CHENNAI", dob: "2009-09-09", gender: "female", bio: "U-18 point guard, Anna Nagar Academy." },
  { n: 14, name: "Karthikeyan R", district: "TN-COIMBATORE", dob: "1994-01-28", gender: "male", bio: "Owner and coach, Kovai Kings." },
  { n: 15, name: "Swetha Balaji", district: "TN-COIMBATORE", dob: "2003-03-17", gender: "female", bio: "Forward, Kovai Kings women." },
  { n: 16, name: "Gokul Narayanan", district: "TN-COIMBATORE", dob: "1999-12-05", gender: "male", bio: "Weekend hooper, weekday engineer." },
  { n: 17, name: "Murugan Pandian", district: "TN-MADURAI", dob: "1990-07-07", gender: "male", bio: "Owner, Madurai Meenakshi Ballers." },
  { n: 18, name: "Anitha Rajan", district: "TN-MADURAI", dob: "2000-02-22", gender: "female", bio: "Power forward." },
  { n: 19, name: "Senthil Kumar", district: "TN-TIRUPATHUR", dob: "1992-11-11", gender: "male", bio: "Started the Tirupathur Tigers in 2019." },
  { n: 20, name: "Ravi Shankar", district: "TN-VELLORE", dob: "1985-05-20", gender: "male", bio: "Fan. Never miss a district final." },
  { n: 21, name: "Deepak Raj", district: "TN-VELLORE", dob: "2003-08-08", gender: "male", bio: "VIT student. Campus hoops captain." },
  { n: 22, name: "Fathima Begum", district: "TN-VELLORE", dob: "2005-04-04", gender: "female", bio: "Guard. Learning every day." },
  { n: 23, name: "Prakash M", district: "TN-CHENNAI", dob: "1998-12-30", gender: "male", bio: "3x3 player. Chasing the national camp." },
  { n: 24, name: "Bhavana S", district: "TN-COIMBATORE", dob: "2001-10-10", gender: "female", bio: "Physio for Kovai Kings." },
];
const U = (n: number) => DEMO_ID.user(n);
const T = (key: keyof typeof TEST_USERS) => ID.user(TEST_USERS[key].n);

// ---- Clubs ----------------------------------------------------------------------------------
type C = { n: number; name: string; kind: "club" | "academy" | "creator_group"; district: string; lat: number; lng: number; motto?: string; description: string; owner: number };
const CLUBS: C[] = [
  { n: 1, name: "Fort City Ballers", kind: "club", district: "TN-VELLORE", lat: 12.9209, lng: 79.1311, motto: "Defend the fort", description: "Men's and women's teams playing out of the Vellore Fort court since 2012.", owner: 3 },
  { n: 2, name: "Katpadi Sunday Hoopers", kind: "club", district: "TN-VELLORE", lat: 12.9692, lng: 79.1446, motto: "Every Sunday, 6 am", description: "Open pickup games every Sunday. Everyone plays.", owner: 4 },
  { n: 3, name: "VIT Campus Hoops", kind: "club", district: "TN-VELLORE", lat: 12.9692, lng: 79.1559, description: "Student club at VIT Vellore. Inter-college league team.", owner: 21 },
  { n: 4, name: "Vellore Hoop Academy", kind: "academy", district: "TN-VELLORE", lat: 12.9345, lng: 79.1366, motto: "Fundamentals first", description: "Coaching for ages 8–18. Weekday evenings and weekend camps.", owner: 6 },
  { n: 5, name: "Marina Ballers", kind: "club", district: "TN-CHENNAI", lat: 13.0500, lng: 80.2824, motto: "Sea breeze, swish", description: "One of Chennai's oldest community clubs, near Marina beach.", owner: 8 },
  { n: 6, name: "Anna Nagar Basketball Academy", kind: "academy", district: "TN-CHENNAI", lat: 13.0850, lng: 80.2101, motto: "Train. Compete. Grow.", description: "Junior and youth programmes with certified coaches.", owner: 11 },
  { n: 7, name: "Chennai Hoops Collective", kind: "creator_group", district: "TN-CHENNAI", lat: 13.0418, lng: 80.2341, description: "Creators covering Indian basketball: breakdowns, drills and court tours.", owner: 7 },
  { n: 8, name: "Kovai Kings", kind: "club", district: "TN-COIMBATORE", lat: 11.0168, lng: 76.9558, motto: "Rule the paint", description: "Coimbatore's weekend league champions.", owner: 14 },
  { n: 9, name: "Madurai Meenakshi Ballers", kind: "club", district: "TN-MADURAI", lat: 9.9252, lng: 78.1198, description: "Temple city hoops. Men's and women's squads.", owner: 17 },
  { n: 10, name: "Tirupathur Tigers", kind: "club", district: "TN-TIRUPATHUR", lat: 12.4955, lng: 78.5730, description: "Growing the game in Tirupathur since 2019.", owner: 19 },
];
const CL = (n: number) => DEMO_ID.club(n);

// Who plays where: [person, club, position | null (non-player), extra role]
const MEMBERS: [number, number, string | null, ("admin" | "captain")?][] = [
  [3, 1, null], [1, 1, "PG", "captain"], [2, 1, "SF", "admin"], [20, 1, null], [22, 1, "SG"], [21, 1, "SF"],
  [4, 2, "PF"], [1, 2, "PG"], [20, 2, null], [16, 2, "C"],
  [21, 3, "PG", "captain"], [22, 3, "SG"],
  [6, 4, null], [5, 4, "SG"], [22, 4, "PG"],
  [8, 5, null], [9, 5, "SG", "captain"], [12, 5, "C"], [23, 5, "PF"], [7, 5, "SF"],
  [11, 6, null], [13, 6, "PG"], [12, 6, "C"],
  [7, 7, null], [23, 7, null],
  [14, 8, "PG"], [15, 8, "SF", "captain"], [16, 8, "PF"], [24, 8, null],
  [17, 9, "SF"], [18, 9, "PF", "captain"],
  [19, 10, "PG"],
];

// ---- Posts ------------------------------------------------------------------------------------
type Post = { n: number; by: number | string; club?: number; org?: string; vis?: "public" | "club_page" | "members"; h: number; text: string; photos?: number[]; video?: string; status?: "in_review" };
const POSTS: Post[] = [
  { n: 1, by: 1, club: 1, h: 2, text: "Morning shootaround at the fort. 200 makes before the sun got hot 🏀", photos: [0, 3] },
  { n: 2, by: 7, h: 3, text: "India end a 27-year losing streak against Kazakhstan. This is the energy we need at every district court.", video: VIDEOS.indiaKazakhstan },
  { n: 3, by: 6, club: 4, h: 4, text: "Week 3 of the U-12 camp: form shooting. Elbow in, follow through, hold it.", photos: [6], video: VIDEOS.formBeginner },
  { n: 4, by: 9, club: 5, h: 5, text: "Marina Ballers women vs Anna Nagar this Saturday, 5 pm. Come support!", photos: [8] },
  { n: 5, by: 14, club: 8, h: 6, text: "Kovai Kings weekend league: 4–0 so far. Big thanks to everyone who came out.", photos: [10, 11, 12] },
  { n: 6, by: 23, h: 7, text: "Studying India's 3x3 team before nationals. Spacing and pace — learn from the pros.", video: VIDEOS.india3x3 },
  { n: 7, by: 3, club: 1, vis: "members", h: 8, text: "Members: jerseys arrive Thursday. Collect from Kavya after practice." },
  { n: 8, by: 4, club: 2, h: 9, text: "Sunday turnout was 26 players! Four full courts of pickup. See you next week, 6 am sharp.", photos: [9] },
  { n: 9, by: 11, club: 6, h: 10, text: "Six drills NBA players use to fix their shooting form. We're adding these to the U-16 programme.", video: VIDEOS.nbaFormDrills },
  { n: 10, by: 7, club: 7, h: 12, text: "India v Lebanon breakdown — watch how the bigs set screens in the second half.", video: VIDEOS.indiaLebanon },
  { n: 11, by: 21, club: 3, h: 13, text: "VIT Campus Hoops trials: Monday 5:30 pm, main court. Bring your own water.", photos: [15] },
  { n: 12, by: 17, club: 9, h: 14, text: "Madurai Meenakshi Ballers new court lights are up! Night games from this week.", photos: [16, 17] },
  { n: 13, by: 2, club: 1, vis: "club_page", h: 15, text: "Fort City women: open trials for ages 15+ on 10 November. All levels welcome.", photos: [18] },
  { n: 14, by: 12, h: 16, text: "Weak handle? These dribbling drills fixed mine. 20 minutes a day.", video: VIDEOS.weakHandles },
  { n: 15, by: 15, club: 8, h: 18, text: "Women's squad practice — defence slides until our legs gave up 😅", photos: [20] },
  { n: 16, by: 19, club: 10, h: 20, text: "Tirupathur Tigers are looking for a coach for the U-14 batch. DM if interested.", photos: [21] },
  { n: 17, by: 10, org: TEST_ORGS.chennaiDba, h: 22, text: "Chennai District Championship 2026: entries open for men, women and U-16. Last date 20 November.", photos: [22] },
  { n: 18, by: 16, h: 24, text: "Best solo drills when you can't find anyone to play with.", video: VIDEOS.soloDrills },
  { n: 19, by: 13, club: 6, h: 26, text: "Won my first U-18 tournament MVP 🥹 Thank you coach Lakshmi!", photos: [13] },
  { n: 20, by: 8, club: 5, h: 28, text: "Throwback: India v China. Still the best atmosphere I've seen.", video: VIDEOS.indiaChina },
  { n: 21, by: 5, club: 4, h: 30, text: "Learning the perfect shooting form. 50 makes from each spot today.", video: VIDEOS.perfectForm },
  { n: 22, by: 9, h: 33, text: "India women vs Korea — so much to learn from this game.", video: VIDEOS.indiaKorea },
  { n: 23, by: 18, club: 9, h: 36, text: "Practice starts with intensity. We tried these three drills tonight — loved them.", video: VIDEOS.practiceStart },
  { n: 24, by: 20, h: 40, text: "Anyone know a good outdoor court near Gandhi Nagar, Vellore?" },
  { n: 25, by: 24, club: 8, h: 44, text: "Physio tip: warm up your ankles before you play on concrete. 5 minutes saves weeks.", photos: [4] },
  { n: 26, by: 7, club: 7, h: 48, text: "India v New Zealand — the comeback quarter. Full highlights.", video: VIDEOS.indiaNewZealand },
  { n: 27, by: 6, club: 4, h: 54, text: "Youth drills for ages 7–15. Parents, try these at home with your kids!", video: VIDEOS.youthDrills },
  { n: 28, by: 22, h: 60, text: "First time playing full court today. Nervous, but scored 6 points!", photos: [5] },
  { n: 29, by: 1, club: 1, h: 72, text: "District semi-final highlights coming soon. Until then, India v Qatar for inspiration.", video: VIDEOS.indiaQatar },
  { n: 30, by: 23, h: 80, text: "3x3 India vs Hong Kong, China — fast, physical, fun.", video: VIDEOS.india3x3HongKong },
  { n: 31, by: 14, club: 8, vis: "members", h: 90, text: "Members: fees for November due by the 5th. Pay Bhavana or Karthik." },
  { n: 32, by: 20, h: 1, text: "Looking for people to play 3v3 near Sathuvachari this evening. Anyone?", status: "in_review" },
];

const COMMENTS: [post: number, by: number, text: string, replies?: [number, string][]][] = [
  [1, 2, "200 makes before 8 am? Respect.", [[1, "@Kavya Ramesh you're next tomorrow 😄"], [22, "Can I join tomorrow?"]]],
  [1, 3, "That's the Fort City spirit."],
  [2, 1, "Goosebumps watching this.", [[7, "Right? The crowd at the end!"]]],
  [2, 23, "Need this energy at nationals."],
  [3, 5, "Elbow in! Coach says this every day 😂", [[6, "And it's working, Aadhi."]]],
  [5, 16, "Unbeaten! Let's keep it going."],
  [6, 12, "The spacing in 3x3 is so different from 5v5."],
  [8, 1, "Best Sunday of the month."],
  [9, 13, "We did drill 4 today, so hard!"],
  [10, 9, "Great breakdown Hari.", [[7, "Thanks Nithya! More coming next week."]]],
  [12, 18, "Finally! Night games are the best."],
  [14, 22, "Doing these every day now."],
  [17, 9, "Marina Ballers women are in!"],
  [19, 11, "So proud of you Pooja!", [[13, "Thank you coach 🙏"]]],
  [24, 21, "Try the Sathuvachari park court, it's good in the evening."],
  [28, 2, "6 points in your first game is great!"],
];

export async function seedDemo(prisma: PrismaClient, rounds = 10) {
  const already = await prisma.club.findUnique({ where: { id: CL(1) } });
  if (already) return { skipped: true };
  const hash = await bcrypt.hash(TEST_PASSWORD, rounds);
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000);
  const daysAgo = (d: number) => hoursAgo(d * 24);

  await prisma.$transaction(
    async (tx) => {
      // People
      await tx.user.createMany({
        data: PEOPLE.map((p) => ({
          id: U(p.n),
          name: p.name,
          email: `${p.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/\.$/, "")}@demo.baskyclub.in`,
          phone: `+9180000${String(p.n).padStart(5, "0")}`,
          passwordHash: hash,
          dateOfBirth: new Date(`${p.dob}T00:00:00Z`),
          gender: p.gender,
          homeDistrictCode: p.district,
          bio: p.bio,
          status: "active",
          createdAt: daysAgo(200 - p.n * 5),
        })),
      });
      // Pooja and Aadhi are under 18 — their parents confirmed
      await tx.parentalConsent.createMany({
        data: [5, 13].map((n) => ({ userId: U(n), parentName: "Parent", parentEmail: `parent${n}@demo.baskyclub.in`, tokenHash: `demo-consent-${n}`, status: "confirmed", confirmedAt: daysAgo(30) })),
      });

      // A Coimbatore association, published but not yet claimed
      await tx.organization.create({
        data: { id: DEMO_ID.org(1), name: "Coimbatore District Basketball Association", shortName: "Coimbatore DBA", level: "district", parentId: TEST_ORGS.tnba, stateCode: "TN", pageStatus: "published", createdById: T("superAdmin") },
      });
      await tx.district.update({ where: { code: "TN-COIMBATORE" }, data: { associationId: DEMO_ID.org(1) } });

      // Chennai DBA: an admin, office bearers, Media / Legacy
      await tx.organization.update({ where: { id: TEST_ORGS.chennaiDba }, data: { pageStatus: "claimed", claimedAt: daysAgo(60), contactEmail: "office@chennaidba.example", address: "Nehru Indoor Stadium, Periamet, Chennai" } });
      await tx.organizationMember.create({ data: { organizationId: TEST_ORGS.chennaiDba, userId: U(10), accessLevel: "owner", grantedById: T("superAdmin") } });
      await tx.officeBearer.createMany({
        data: [
          { organizationId: TEST_ORGS.chennaiDba, name: "Dr. A. Subramanian", designation: "President", termFrom: new Date("2024-04-01"), sortOrder: 1 },
          { organizationId: TEST_ORGS.chennaiDba, userId: U(10), name: "Rajesh Kannan", designation: "Secretary", termFrom: new Date("2024-04-01"), sortOrder: 2 },
          { organizationId: TEST_ORGS.chennaiDba, name: "Ms. Revathi Mohan", designation: "Treasurer", termFrom: new Date("2024-04-01"), sortOrder: 3 },
        ],
      });
      const legacy = [
        { title: "Chennai District Championship — men", year: 2025, winner: "Marina Ballers", runnerUp: "Anna Nagar Basketball Academy", media: [{ mediaType: "image", url: img(3, 1200) }] },
        { title: "Chennai District Championship — women", year: 2025, winner: "Marina Ballers women", runnerUp: "Anna Nagar Academy U-18", media: [{ mediaType: "image", url: img(20, 1200) }] },
        { title: "India v China at home", year: 2024, body: "District players travelled to watch the national team. Highlights on YouTube.", media: [{ mediaType: "youtube", url: VIDEOS.indiaChina }] },
      ];
      for (const r of legacy) {
        await tx.legacyRecord.create({
          data: {
            organizationId: TEST_ORGS.chennaiDba, recordType: r.body ? "history" : "tournament_record", title: r.title, year: r.year, body: r.body, winner: r.winner, runnerUp: r.runnerUp, createdById: U(10),
            media: { create: r.media.map((m, i) => ({ ...m, sortOrder: i })) },
          },
        });
      }

      // Clubs, owners, memberships, roles
      for (const c of CLUBS) {
        await tx.club.create({
          data: { id: CL(c.n), name: c.name, kind: c.kind, districtCode: c.district, status: "approved", motto: c.motto, description: c.description, latitude: c.lat, longitude: c.lng, bannerUrl: img(c.n + 2, 1400), createdById: U(c.owner), createdAt: daysAgo(150 - c.n) },
        });
        await tx.clubRole.create({ data: { clubId: CL(c.n), userId: U(c.owner), role: "owner", grantedById: U(c.owner), fromAt: daysAgo(150 - c.n) } });
      }
      for (const [person, club, position, role] of MEMBERS) {
        await tx.clubMembership.create({
          data: { clubId: CL(club), userId: U(person), status: "active", isPlayer: position !== null, primaryPosition: position, isCoach: person === 6 || person === 11 || person === 14, joinedAt: daysAgo(120 - person), approvedById: U(CLUBS[club - 1].owner) },
        });
        if (role) await tx.clubRole.create({ data: { clubId: CL(club), userId: U(person), role, grantedById: U(CLUBS[club - 1].owner), fromAt: daysAgo(100) } });
      }
      // Test accounts join the demo world too
      await tx.clubMembership.createMany({
        data: [
          { clubId: CL(2), userId: T("player"), status: "active", isPlayer: true, primaryPosition: "SF", joinedAt: daysAgo(40) },
          { clubId: CL(1), userId: T("joiner"), status: "pending", isPlayer: true, primaryPosition: "SG" },
          { clubId: CL(1), userId: T("normalUser"), status: "pending", isPlayer: true, primaryPosition: "PG" },
        ],
      });
      await tx.coach.createMany({
        data: [
          { clubId: CL(4), userId: U(6), name: "Divya Nair", role: "head", isPrimary: true },
          { clubId: CL(6), userId: U(11), name: "Lakshmi Sundar", role: "head", isPrimary: true },
          { clubId: CL(6), name: "Mr. Joseph Antony", role: "assistant" },
          { clubId: CL(8), userId: U(14), name: "Karthikeyan R", role: "head", isPrimary: true },
          { clubId: CL(1), name: "Mr. Balu (no account)", role: "head", isPrimary: true },
        ],
      });
      // Affiliations (#58) and badges (#35, #73)
      const until = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 2, 31));
      await tx.affiliation.createMany({
        data: [
          { clubId: CL(1), organizationId: TEST_ORGS.velloreDba, tnbaNumber: "TNBA/VLR/0007", validFrom: daysAgo(200), validUntil: until, status: "active", startedBy: "club", requestedById: U(3), decidedById: T("districtAdmin"), decidedAt: daysAgo(190) },
          { clubId: CL(4), organizationId: TEST_ORGS.velloreDba, tnbaNumber: "TNBA/VLR/0011", validFrom: daysAgo(200), validUntil: until, status: "active", startedBy: "association", requestedById: T("districtAdmin"), decidedById: U(6), decidedAt: daysAgo(180) },
          { clubId: CL(10), organizationId: TEST_ORGS.velloreDba, tnbaNumber: "TNBA/VLR/0015", validFrom: daysAgo(100), validUntil: until, status: "active", startedBy: "club", requestedById: U(19), decidedById: T("districtAdmin"), decidedAt: daysAgo(95) },
          { clubId: CL(5), organizationId: TEST_ORGS.chennaiDba, tnbaNumber: "TNBA/CHN/0002", validFrom: daysAgo(200), validUntil: until, status: "active", startedBy: "club", requestedById: U(8), decidedById: U(10), decidedAt: daysAgo(190) },
          { clubId: CL(6), organizationId: TEST_ORGS.chennaiDba, tnbaNumber: "TNBA/CHN/0019", validFrom: daysAgo(200), validUntil: until, status: "active", startedBy: "club", requestedById: U(11), decidedById: U(10), decidedAt: daysAgo(185) },
          { clubId: CL(3), organizationId: TEST_ORGS.velloreDba, status: "pending", startedBy: "club", requestedById: U(21) },
        ],
      });
      await tx.verificationBadge.createMany({
        data: [
          { clubId: CL(1), badge: "basky_verified", verifiedById: T("baskyTeam") },
          { clubId: CL(4), badge: "basky_verified", verifiedById: T("baskyTeam") },
          { clubId: CL(6), badge: "basky_verified", verifiedById: T("baskyTeam") },
          { userId: U(7), badge: "creator", verifiedById: T("baskyTeam") },
          { userId: U(23), badge: "creator", verifiedById: T("baskyTeam") },
        ],
      });
      // Courts for the map + practice hours
      await tx.court.createMany({
        data: [
          { clubId: CL(1), name: "Vellore Fort Court", districtCode: "TN-VELLORE", surface: "concrete", address: "Inside Vellore Fort", latitude: 12.9206, longitude: 79.1301, status: "approved", imageUrls: [img(0)] },
          { clubId: CL(5), name: "Marina Beach Courts", districtCode: "TN-CHENNAI", surface: "outdoor_asphalt", address: "Marina Beach Road, Chennai", latitude: 13.0493, longitude: 80.2828, status: "approved", imageUrls: [img(14)] },
          { clubId: CL(6), name: "Anna Nagar Tower Park Court", districtCode: "TN-CHENNAI", indoor: false, surface: "synthetic", address: "Anna Nagar, Chennai", latitude: 13.0870, longitude: 80.2140, status: "approved", imageUrls: [] },
          { name: "Nehru Indoor Stadium", districtCode: "TN-CHENNAI", indoor: true, surface: "hardwood", address: "Periamet, Chennai", latitude: 13.0855, longitude: 80.2717, status: "approved", imageUrls: [] },
          { clubId: CL(8), name: "Codissia Grounds Court", districtCode: "TN-COIMBATORE", surface: "synthetic", address: "Avinashi Road, Coimbatore", latitude: 11.0300, longitude: 77.0250, status: "approved", imageUrls: [] },
          { clubId: CL(9), name: "Race Course Court", districtCode: "TN-MADURAI", surface: "concrete", address: "Race Course Road, Madurai", latitude: 9.9400, longitude: 78.1340, status: "approved", imageUrls: [] },
        ],
      });
      for (const [club, days] of [[1, [1, 3, 5]], [4, [2, 4, 6]], [5, [1, 2, 3, 4, 5]], [8, [6, 7]]] as [number, number[]][]) {
        await tx.clubCourtTiming.createMany({ data: days.map((d) => ({ clubId: CL(club), dayOfWeek: d, morningStart: "06:00", morningEnd: "07:30", eveningStart: "17:30", eveningEnd: "19:30" })) });
      }

      // Posts with photos and real YouTube videos
      for (const p of POSTS) {
        const at = hoursAgo(p.h);
        const club = p.club ? CLUBS[p.club - 1] : null;
        const person = typeof p.by === "number" ? PEOPLE[p.by - 1] : null;
        await tx.post.create({
          data: {
            id: DEMO_ID.post(p.n),
            authorId: typeof p.by === "number" ? U(p.by) : p.by,
            clubId: p.club ? CL(p.club) : undefined,
            organizationId: p.org,
            districtCode: club?.district ?? person?.district ?? null,
            visibility: p.vis ?? "public",
            content: p.text,
            moderationStatus: p.status ?? "published",
            createdAt: at,
            updatedAt: at,
            media: {
              create: [
                ...(p.photos ?? []).map((ph, i) => ({ mediaType: "image", url: img(ph), sortOrder: i, width: 1080, height: 1080 })),
                ...(p.video ? [{ mediaType: "youtube", url: p.video, sortOrder: (p.photos ?? []).length }] : []),
              ],
            },
          },
        });
      }
      await tx.moderationCase.create({ data: { targetType: "post", targetId: DEMO_ID.post(32), source: "no_club_review", createdAt: hoursAgo(1) } });

      // Comments with replies (counts are kept by the database)
      for (const [postN, by, text, replies] of COMMENTS) {
        const at = hoursAgo(POSTS[postN - 1].h - 0.5);
        const top = await tx.postComment.create({ data: { postId: DEMO_ID.post(postN), userId: U(by), content: text, createdAt: at } });
        for (const [i, [rb, rt]] of (replies ?? []).entries()) {
          await tx.postComment.create({ data: { postId: DEMO_ID.post(postN), userId: U(rb), parentId: top.id, content: rt, createdAt: new Date(at.getTime() + (i + 1) * 600_000) } });
        }
      }

      // Likes: a steady spread, more on videos and photos
      const likes: { postId: string; userId: string }[] = [];
      for (const p of POSTS) {
        if (p.status || p.vis === "members") continue;
        const count = (p.video ? 9 : p.photos ? 7 : 3) + (p.n % 5);
        for (let k = 0; k < count; k++) likes.push({ postId: DEMO_ID.post(p.n), userId: U(((p.n * 7 + k * 5) % PEOPLE.length) + 1) });
        if (p.n % 3 === 0) likes.push({ postId: DEMO_ID.post(p.n), userId: T("player") });
      }
      await tx.postLike.createMany({ data: likes, skipDuplicates: true });

      // Follows (#64, #73)
      const follows: { followerId: string; targetType: string; targetId: string }[] = [];
      for (const p of PEOPLE) {
        follows.push({ followerId: U(p.n), targetType: "user", targetId: U(7) }); // the creator
        follows.push({ followerId: U(p.n), targetType: "organization", targetId: p.district === "TN-CHENNAI" ? TEST_ORGS.chennaiDba : TEST_ORGS.velloreDba });
        follows.push({ followerId: U(p.n), targetType: "club", targetId: CL(((p.n * 3) % CLUBS.length) + 1) });
      }
      for (const key of ["player", "normalUser", "coach", "clubOwner", "minorPlayer"] as const) {
        follows.push({ followerId: T(key), targetType: "club", targetId: CL(1) }, { followerId: T(key), targetType: "user", targetId: U(7) }, { followerId: T(key), targetType: "club", targetId: CL(5) });
      }
      await tx.follow.createMany({ data: follows.filter((f) => !(f.targetType === "user" && f.targetId === f.followerId)), skipDuplicates: true });

      // Pinned posts and phones for alerts
      await tx.user.update({ where: { id: U(1) }, data: { pinnedPostId: DEMO_ID.post(1) } });
      await tx.user.update({ where: { id: U(7) }, data: { pinnedPostId: DEMO_ID.post(2) } });

      // Alerts (#65, #75)
      const card = await tx.post.create({
        data: {
          id: DEMO_ID.post(40), authorId: U(10), organizationId: TEST_ORGS.chennaiDba, districtCode: "TN-CHENNAI", visibility: "public", isPinned: true,
          content: "Chennai District Championship 2026\n\nEntries are open for men, women and U-16. Register your squad by 20 November.", createdAt: hoursAgo(2), updatedAt: hoursAgo(2),
        },
      });
      await tx.announcement.createMany({
        data: [
          { senderId: U(10), senderOrgId: TEST_ORGS.chennaiDba, audience: "district_users", districtCode: "TN-CHENNAI", title: "Chennai District Championship 2026", body: "Entries are open for men, women and U-16. Register your squad by 20 November.", showInFeed: true, feedPostId: card.id, sentAt: hoursAgo(2) },
          { senderId: U(3), senderClubId: CL(1), audience: "club_members", title: "Practice moved to 6:30 am", body: "Tomorrow only — the fort court opens late.", sentAt: hoursAgo(5) },
          { senderId: T("districtAdmin"), senderOrgId: TEST_ORGS.velloreDba, audience: "club_admins_in_area", title: "Club heads meeting", body: "Saturday 5 pm at the DBA office, Officer's Line. Agenda: district league fixtures.", sentAt: hoursAgo(20) },
          { senderId: U(8), senderClubId: CL(5), audience: "followers", title: "Marina Ballers merch drop", body: "New jerseys and caps this weekend at the beach courts.", sentAt: hoursAgo(30) },
        ],
      });
    },
    { timeout: 120_000 },
  );
  return { skipped: false, people: PEOPLE.length, clubs: CLUBS.length, posts: POSTS.length };
}
