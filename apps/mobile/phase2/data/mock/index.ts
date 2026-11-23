/**
 * Sample data shaped like the Phase 1 schema (SCHEMA_PHASE1.md). All people
 * and clubs are made up. Arrays are mutable so the prototype can add posts,
 * comments, follows and memberships in memory; a reload resets everything.
 */
import type {
  Affiliation,
  Announcement,
  Club,
  ClubMembership,
  ClubRole,
  Coach,
  Follow,
  LegacyRecord,
  OfficeBearer,
  OrganizationMember,
  PlatformRole,
  Post,
  PostComment,
  PostLike,
  User,
  VerificationBadge,
} from '@/types/models';

export { districts, organizations, states } from './geo';

const now = Date.now();
export const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

/** The website's stock court photo (Local_site-main FALLBACK_IMAGE). */
export const STOCK_COURT = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1400&auto=format&fit=crop';

const VLR = 'TN-VELLORE';
const CHN = 'TN-CHENNAI';
const ORG_VLR = 'org-TN-VELLORE';
const ORG_CHN = 'org-TN-CHENNAI';

export const users: User[] = [
  { userId: 'u-roshan', name: 'Roshan Kumar', email: 'roshan@example.com', phone: '+919800000001', dateOfBirth: '1998-04-12', gender: 'male', status: 'active', homeDistrictCode: VLR, bio: 'Shooting guard. Building BaskyCLub for every court in India.', instagram: 'roshan.hoops', createdAt: hoursAgo(2000) },
  { userId: 'u-arjun', name: 'Arjun Selvam', email: 'arjun@example.com', dateOfBirth: '2000-08-03', gender: 'male', status: 'active', homeDistrictCode: VLR, bio: 'Point guard, Fort City Ballers. Fort court regular since 2012.', instagram: 'arjun.23', youtube: 'ArjunHoops', createdAt: hoursAgo(1800) },
  { userId: 'u-kavya', name: 'Kavya Ramesh', email: 'kavya@example.com', dateOfBirth: '2002-01-19', gender: 'female', status: 'active', homeDistrictCode: VLR, bio: 'Small forward. Captain, Fort City women.', createdAt: hoursAgo(1700) },
  { userId: 'u-vikram', name: 'Vikram Iyer', email: 'vikram@example.com', dateOfBirth: '1996-11-30', gender: 'male', status: 'active', homeDistrictCode: VLR, createdAt: hoursAgo(1600) },
  { userId: 'u-meera', name: 'Meera Krishnan', email: 'meera@example.com', dateOfBirth: '1999-05-07', gender: 'female', status: 'active', homeDistrictCode: VLR, bio: 'Runs the Katpadi Sunday games.', createdAt: hoursAgo(1500) },
  { userId: 'u-aadhi', name: 'Aadhi Prakash', email: 'aadhi@example.com', dateOfBirth: '2011-02-14', gender: 'male', status: 'active', homeDistrictCode: VLR, bio: 'U-16. Training at Vellore Hoop Academy.', instagram: 'aadhi.u16', createdAt: hoursAgo(900) },
  { userId: 'u-hari', name: 'Hari Venkat', email: 'hari@example.com', dateOfBirth: '1995-09-22', gender: 'male', status: 'active', homeDistrictCode: CHN, bio: 'I break down Indian basketball on YouTube.', youtube: 'HoopsTamil', instagram: 'hoopstamil', createdAt: hoursAgo(1000) },
  { userId: 'u-sanjay', name: 'Sanjay Prakash', email: 'sanjay@example.com', dateOfBirth: '1993-03-02', gender: 'male', status: 'active', homeDistrictCode: CHN, createdAt: hoursAgo(1400) },
  { userId: 'u-divya', name: 'Divya Nair', email: 'divya@example.com', dateOfBirth: '1997-12-10', gender: 'female', status: 'active', homeDistrictCode: VLR, bio: 'Coach, Vellore Hoop Academy.', createdAt: hoursAgo(1300) },
  { userId: 'u-karthik', name: 'Karthik Raja', email: 'karthik@example.com', dateOfBirth: '1990-06-18', gender: 'male', status: 'active', homeDistrictCode: VLR, bio: 'Secretary, Vellore District Basketball Association.', createdAt: hoursAgo(1200) },
  { userId: 'u-nithya', name: 'Nithya Suresh', email: 'nithya@example.com', dateOfBirth: '2001-07-25', gender: 'female', status: 'active', homeDistrictCode: CHN, createdAt: hoursAgo(1100) },
  { userId: 'u-fan', name: 'Prakash M', email: 'prakash@example.com', dateOfBirth: '1988-10-01', gender: 'male', status: 'active', homeDistrictCode: VLR, bio: 'Fan. Never miss a district final.', createdAt: hoursAgo(300) },
];

export const platformRoles: PlatformRole[] = [{ userId: 'u-roshan', role: 'super_admin' }];

export const orgMembers: OrganizationMember[] = [{ orgId: ORG_VLR, userId: 'u-karthik', accessLevel: 'owner' }];

export const officeBearers: OfficeBearer[] = [
  { id: 'ob1', orgId: ORG_VLR, name: 'S. Rajendran', title: 'President', startDate: '2023-04-01' },
  { id: 'ob2', orgId: ORG_VLR, name: 'Karthik Raja', userId: 'u-karthik', title: 'Secretary', startDate: '2023-04-01' },
  { id: 'ob3', orgId: ORG_VLR, name: 'M. Latha', title: 'Treasurer', startDate: '2023-04-01' },
  { id: 'ob4', orgId: ORG_VLR, name: 'P. Govindan', title: 'President', startDate: '2015-04-01', endDate: '2023-03-31' },
];

export const legacyRecords: LegacyRecord[] = [
  { id: 'lg1', orgId: ORG_VLR, year: 2025, title: 'Vellore District Senior Championship', body: 'Fort City Ballers beat Palar Riders 71–66 in the final at the Fort court. 14 teams took part.', media: [{ id: 'lm1', recordId: 'lg1', url: STOCK_COURT, caption: 'Final night at the Fort court' }] },
  { id: 'lg2', orgId: ORG_VLR, year: 2019, title: 'Inter-school championship, 25th edition', body: '32 schools from across the district. Girls title to St. Mary’s, boys title to Katpadi Higher Secondary.', media: [] },
  { id: 'lg3', orgId: ORG_VLR, year: 1998, title: 'First floodlit court in the district', body: 'Evening games began at the Fort court, the start of Vellore’s night basketball culture.', media: [] },
];

export const clubs: Club[] = [
  { clubId: 'c-fortcity', name: 'Fort City Ballers', kind: 'club', status: 'approved', districtCode: VLR, motto: 'Defend the Fort.', description: 'Evening sessions at the Fort court since 2009. Senior men, women and U-16.', bannerUrl: STOCK_COURT, latitude: 12.9206, longitude: 79.1306, createdAt: hoursAgo(5000) },
  { clubId: 'c-palar', name: 'Palar Riders', kind: 'club', status: 'approved', districtCode: VLR, motto: 'Run with the river.', description: 'Riverside club with a strong 3x3 group.', createdAt: hoursAgo(4500) },
  { clubId: 'c-katpadi', name: 'Katpadi Sunday Run', kind: 'club', status: 'approved', districtCode: VLR, motto: 'Show up, run five.', description: 'Weekend pickup group. All levels, 6:30 am every Sunday.', createdAt: hoursAgo(1200) },
  { clubId: 'c-vha', name: 'Vellore Hoop Academy', kind: 'academy', status: 'approved', districtCode: VLR, motto: 'Fundamentals first.', description: 'Coaching for ages 8–18. Batches on weekday evenings and weekend mornings.', createdAt: hoursAgo(3000) },
  { clubId: 'c-hoopstamil', name: 'Hoops Tamil', kind: 'creator_group', status: 'approved', districtCode: CHN, motto: 'Basketball stories in Tamil.', description: 'Creators covering basketball across Tamil Nadu.', createdAt: hoursAgo(800) },
  { clubId: 'c-hawks', name: 'Marina Hawks', kind: 'club', status: 'approved', districtCode: CHN, motto: 'Run the floor.', description: 'Beach court club with senior and U-16 squads.', createdAt: hoursAgo(5200) },
];

export const affiliations: Affiliation[] = [
  { id: 'af1', clubId: 'c-fortcity', orgId: ORG_VLR, tnbaNumber: 'TNBA/VLR/0021', validUntil: '2027-03-31', status: 'active', startedBy: 'club' },
  // Expired card → shown as Community club (#58)
  { id: 'af2', clubId: 'c-palar', orgId: ORG_VLR, tnbaNumber: 'TNBA/VLR/0034', validUntil: '2026-03-31', status: 'active', startedBy: 'club' },
  { id: 'af3', clubId: 'c-hawks', orgId: ORG_CHN, tnbaNumber: 'TNBA/CHN/0142', validUntil: '2027-03-31', status: 'active', startedBy: 'association' },
];

const m = (id: string, clubId: string, userId: string, extra: Partial<ClubMembership> = {}): ClubMembership => ({
  id, clubId, userId, status: 'active', isPlayer: true, requestedAt: hoursAgo(3000), joinedAt: hoursAgo(2990), ...extra,
});

export const memberships: ClubMembership[] = [
  m('m1', 'c-fortcity', 'u-roshan', { primaryPosition: 'SG' }),
  m('m2', 'c-fortcity', 'u-arjun', { primaryPosition: 'PG' }),
  m('m3', 'c-fortcity', 'u-vikram', { primaryPosition: 'C' }),
  m('m4', 'c-fortcity', 'u-kavya', { primaryPosition: 'SF' }),
  m('m5', 'c-katpadi', 'u-roshan', { primaryPosition: 'SG' }),
  m('m6', 'c-katpadi', 'u-meera', { primaryPosition: 'PG' }),
  m('m7', 'c-vha', 'u-aadhi', { primaryPosition: 'PG' }),
  m('m8', 'c-vha', 'u-divya', { isPlayer: false }),
  m('m9', 'c-palar', 'u-vikram', { status: 'left', endedAt: hoursAgo(3100), joinedAt: hoursAgo(9000), primaryPosition: 'C' }),
  m('m10', 'c-hoopstamil', 'u-hari', { isPlayer: false }),
  m('m11', 'c-hawks', 'u-sanjay', { primaryPosition: 'PF' }),
  m('m12', 'c-hawks', 'u-nithya', { primaryPosition: 'C' }),
  // Join requests = pending memberships (#63)
  m('m13', 'c-fortcity', 'u-meera', { status: 'pending', joinedAt: undefined, requestedAt: hoursAgo(6) }),
  m('m14', 'c-fortcity', 'u-aadhi', { status: 'pending', joinedAt: undefined, requestedAt: hoursAgo(30) }),
];

export const clubRoles: ClubRole[] = [
  { id: 'r1', clubId: 'c-fortcity', userId: 'u-roshan', role: 'owner', startDate: '2024-01-01' },
  { id: 'r2', clubId: 'c-fortcity', userId: 'u-arjun', role: 'captain', startDate: '2026-04-01' },
  { id: 'r3', clubId: 'c-fortcity', userId: 'u-vikram', role: 'captain', startDate: '2023-04-01', endDate: '2026-03-31' },
  { id: 'r4', clubId: 'c-katpadi', userId: 'u-meera', role: 'owner', startDate: '2025-06-01' },
  { id: 'r5', clubId: 'c-vha', userId: 'u-divya', role: 'owner', startDate: '2024-06-01' },
  { id: 'r6', clubId: 'c-hoopstamil', userId: 'u-hari', role: 'owner', startDate: '2025-09-01' },
  { id: 'r7', clubId: 'c-hawks', userId: 'u-sanjay', role: 'owner', startDate: '2022-01-01' },
  { id: 'r8', clubId: 'c-fortcity', userId: 'u-kavya', role: 'admin', startDate: '2025-01-01' },
];

export const coaches: Coach[] = [
  { id: 'co1', clubId: 'c-fortcity', name: 'S. Balaji', role: 'head' },
  { id: 'co2', clubId: 'c-vha', userId: 'u-divya', name: 'Divya Nair', role: 'head' },
  { id: 'co3', clubId: 'c-vha', name: 'R. Lakshmi', role: 'assistant' },
];

export const badges: VerificationBadge[] = [
  { id: 'b1', badge: 'basky_verified', clubId: 'c-vha' },
  { id: 'b2', badge: 'creator', userId: 'u-hari' },
];

const img = (postId: string, n: number, ratio: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${postId}-m${i}`, postId, mediaType: 'image' as const, url: i === 0 ? STOCK_COURT : undefined, sortOrder: i, aspectRatio: ratio }));

export const posts: Post[] = [
  { postId: 'p-official', authorId: 'u-karthik', orgId: ORG_VLR, districtCode: VLR, visibility: 'public', moderationStatus: 'published', content: 'Vellore District Senior Championship: registration opens Monday. Affiliated clubs, send your squad list to the Secretary by 5 December.', likeCount: 182, commentCount: 2, createdAt: hoursAgo(3), media: [] },
  { postId: 'p-2', authorId: 'u-arjun', clubId: 'c-fortcity', districtCode: VLR, visibility: 'public', moderationStatus: 'published', content: 'Fort court under the lights tonight. Full run, 20 players, two courts going.', likeCount: 386, commentCount: 4, createdAt: hoursAgo(5), media: img('p-2', 3, 4 / 5) },
  { postId: 'p-3', authorId: 'u-hari', clubId: 'c-hoopstamil', districtCode: CHN, visibility: 'public', moderationStatus: 'published', content: 'New video: five footwork drills every guard in Tamil Nadu should be doing this off-season.', likeCount: 512, commentCount: 1, createdAt: hoursAgo(9), media: [{ id: 'p-3-y', postId: 'p-3', mediaType: 'youtube', url: 'https://www.youtube.com/watch?v=BASKYDEMO01', sortOrder: 0 }] },
  { postId: 'p-4', authorId: 'u-divya', clubId: 'c-vha', districtCode: VLR, visibility: 'public', moderationStatus: 'published', content: 'New U-12 batch starts 1 November. Saturday and Sunday mornings, 7–9 am.', likeCount: 97, commentCount: 0, createdAt: hoursAgo(20), media: img('p-4', 1, 16 / 9) },
  { postId: 'p-5', authorId: 'u-kavya', clubId: 'c-fortcity', districtCode: VLR, visibility: 'members', moderationStatus: 'published', content: 'Members: practice moves to 6 am this Saturday. Bring both jerseys.', likeCount: 14, commentCount: 0, createdAt: hoursAgo(26), media: [] },
  { postId: 'p-6', authorId: 'u-fan', districtCode: VLR, visibility: 'public', moderationStatus: 'in_review', content: 'What a final last year at the Fort court. Can’t wait for this season.', likeCount: 0, commentCount: 0, createdAt: hoursAgo(2), media: [] },
  { postId: 'p-7', authorId: 'u-meera', clubId: 'c-katpadi', districtCode: VLR, visibility: 'public', moderationStatus: 'published', content: 'Sunday run had 22 players. Two full courts. Same time next week.', likeCount: 64, commentCount: 0, createdAt: hoursAgo(40), media: img('p-7', 1, 1) },
  { postId: 'p-8', authorId: 'u-sanjay', clubId: 'c-hawks', districtCode: CHN, visibility: 'club_page', moderationStatus: 'published', content: 'Hawks trials for U-16 this Sunday at the beach court.', likeCount: 41, commentCount: 0, createdAt: hoursAgo(50), media: [] },
  { postId: 'p-9', authorId: 'u-aadhi', clubId: 'c-vha', districtCode: VLR, visibility: 'public', moderationStatus: 'published', content: 'Made 40 free throws in a row at practice today.', likeCount: 230, commentCount: 0, createdAt: hoursAgo(60), media: [] },
];

export const postLikes: PostLike[] = [{ postId: 'p-2', userId: 'u-roshan' }];

export const comments: PostComment[] = [
  { id: 'cm1', postId: 'p-2', userId: 'u-vikram', content: 'Best run of the month.', createdAt: hoursAgo(4.5) },
  { id: 'cm2', postId: 'p-2', userId: 'u-kavya', parentId: 'cm1', content: '@Vikram Iyer and you hit everything from the corner.', createdAt: hoursAgo(4) },
  { id: 'cm3', postId: 'p-2', userId: 'u-meera', content: 'Same time Thursday?', createdAt: hoursAgo(3.5) },
  { id: 'cm4', postId: 'p-2', userId: 'u-fan', parentId: 'cm3', content: 'removed', createdAt: hoursAgo(3.2), deletedAt: hoursAgo(3) },
  { id: 'cm5', postId: 'p-official', userId: 'u-roshan', content: 'Fort City will send the list this week.', createdAt: hoursAgo(2) },
  { id: 'cm6', postId: 'p-official', userId: 'u-meera', content: 'Can community clubs enter?', createdAt: hoursAgo(1.5) },
  { id: 'cm7', postId: 'p-3', userId: 'u-arjun', content: 'The drop-step one is gold.', createdAt: hoursAgo(8) },
];

export const follows: Follow[] = [
  { followerId: 'u-roshan', targetType: 'organization', targetId: ORG_VLR },
  { followerId: 'u-roshan', targetType: 'club', targetId: 'c-hoopstamil' },
  { followerId: 'u-arjun', targetType: 'user', targetId: 'u-hari' },
  { followerId: 'u-fan', targetType: 'club', targetId: 'c-fortcity' },
  { followerId: 'u-fan', targetType: 'organization', targetId: ORG_VLR },
];

export const announcements: Announcement[] = [
  { id: 'an1', senderUserId: 'u-karthik', orgId: ORG_VLR, audience: 'district_users', title: 'District championship registration opens Monday', body: 'Affiliated clubs, send your squad list to the Secretary by 5 December.', feedPostId: 'p-official', createdAt: hoursAgo(3) },
  { id: 'an2', senderUserId: 'u-karthik', orgId: ORG_VLR, audience: 'club_admins_in_area', title: 'Affiliation renewal due 31 March', body: 'Club owners and admins: renew your TNBA card before 31 March to keep the Affiliated badge.', createdAt: hoursAgo(28) },
  { id: 'an3', senderUserId: 'u-kavya', clubId: 'c-fortcity', audience: 'club_members', title: 'Saturday practice at 6 am', body: 'Practice moves to 6 am this Saturday. Bring both jerseys.', createdAt: hoursAgo(26) },
  { id: 'an4', senderUserId: 'u-roshan', audience: 'everyone', title: 'Welcome to BaskyCLub', body: 'Join your club, follow your district association and share your basketball.', createdAt: hoursAgo(200) },
];
