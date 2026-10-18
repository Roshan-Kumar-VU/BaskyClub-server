/**
 * Mock data for the prototype. All people and clubs are made up.
 * Arrays are mutable so the prototype can add posts, match rooms and requests
 * in memory; everything resets when the app reloads.
 */
import type {
  AffiliationInvite,
  Club,
  ClubAffiliation,
  ClubMembership,
  CoachDetail,
  JoinRequest,
  Match,
  PlayerStat,
  Post,
  PostComment,
  Tournament,
  User,
} from '@/types/models';

export { districts, organizations } from './geo';

const now = Date.now();
export const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
export const inHours = (h: number) => new Date(now + h * 3_600_000).toISOString();

/** The website's stock court photo (Local_site-main FALLBACK_IMAGE). */
export const STOCK_COURT = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1400&auto=format&fit=crop';

export const users: User[] = [
  { userId: 'u-roshan', name: 'Roshan Kumar', email: 'roshan@example.com', phone: '+919800000001', gender: 'male', isSuperAdmin: true, homeDistrictCode: 'TN-CHN', createdAt: hoursAgo(2000) },
  { userId: 'u-arjun', name: 'Arjun Selvam', email: 'arjun@example.com', gender: 'male', homeDistrictCode: 'TN-CHN', createdAt: hoursAgo(1800) },
  { userId: 'u-kavya', name: 'Kavya Ramesh', email: 'kavya@example.com', gender: 'female', homeDistrictCode: 'TN-CHN', createdAt: hoursAgo(1700) },
  { userId: 'u-vikram', name: 'Vikram Iyer', email: 'vikram@example.com', gender: 'male', homeDistrictCode: 'TN-CHN', createdAt: hoursAgo(1600) },
  { userId: 'u-meera', name: 'Meera Krishnan', email: 'meera@example.com', gender: 'female', homeDistrictCode: 'TN-CHN', createdAt: hoursAgo(1500) },
  { userId: 'u-sanjay', name: 'Sanjay Prakash', email: 'sanjay@example.com', gender: 'male', homeDistrictCode: 'TN-CHN', createdAt: hoursAgo(1400) },
  { userId: 'u-divya', name: 'Divya Nair', email: 'divya@example.com', gender: 'female', homeDistrictCode: 'TN-CBE', createdAt: hoursAgo(1300) },
  { userId: 'u-karthik', name: 'Karthik Raja', email: 'karthik@example.com', gender: 'male', homeDistrictCode: 'TN-CHN', createdAt: hoursAgo(1200) },
  { userId: 'u-nithya', name: 'Nithya Suresh', email: 'nithya@example.com', gender: 'female', homeDistrictCode: 'TN-CBE', createdAt: hoursAgo(1100) },
  { userId: 'u-hari', name: 'Hari Venkat', email: 'hari@example.com', gender: 'male', homeDistrictCode: 'TN-MDU', createdAt: hoursAgo(1000) },
  { userId: 'u-priya', name: 'Priya Shankar', email: 'priya@example.com', gender: 'female', homeDistrictCode: 'TN-MDU', createdAt: hoursAgo(900) },
  { userId: 'u-rahul', name: 'Rahul Menon', email: 'rahul@example.com', gender: 'male', homeDistrictCode: 'KL-EKM', createdAt: hoursAgo(800) },
];

export const clubs: Club[] = [
  { clubId: 'c-hawks', clubName: 'Marina Hawks', category: 'affiliated', organizationId: 'org-TN-CHN', districtCode: 'TN-CHN', captainUserId: 'u-arjun', chairpersonUserId: 'u-roshan', teamMotto: 'Run the floor.', description: 'Evening sessions at the beach court since 2014. Senior men, women and U-16 squads.', isVerified: false, status: 'approved', bannerImageUrl: STOCK_COURT, createdAt: hoursAgo(5000) },
  { clubId: 'c-adyar', clubName: 'Adyar Ballers', category: 'affiliated', organizationId: 'org-TN-CHN', districtCode: 'TN-CHN', captainUserId: 'u-sanjay', teamMotto: 'Defence wins.', description: 'Community-rooted club with a strong 3x3 programme.', isVerified: false, status: 'approved', createdAt: hoursAgo(4500) },
  { clubId: 'c-sunday', clubName: 'Besant Nagar Sunday Run', category: 'community', districtCode: 'TN-CHN', teamMotto: 'Show up, run five.', description: 'Weekend pickup group. All levels welcome, 6:30 am every Sunday.', isVerified: false, status: 'approved', createdAt: hoursAgo(1200) },
  { clubId: 'c-hoopschool', clubName: 'Chennai Hoop School', category: 'academy', districtCode: 'TN-CHN', teamMotto: 'Fundamentals first.', description: 'Coaching centre for ages 8–18. FIBA Level 1 coaches.', isVerified: true, status: 'approved', createdAt: hoursAgo(3000) },
  { clubId: 'c-kovai', clubName: 'Kovai Rimrockers', category: 'affiliated', organizationId: 'org-TN-CBE', districtCode: 'TN-CBE', captainUserId: 'u-divya', teamMotto: 'Every rebound counts.', description: 'Coimbatore club training at an indoor hardwood court.', isVerified: false, status: 'approved', createdAt: hoursAgo(4000) },
  { clubId: 'c-temple', clubName: 'Temple City Hoopers', category: 'community', districtCode: 'TN-MDU', teamMotto: 'Play together.', description: "Madurai's newest club. Open trials every Sunday.", isVerified: false, status: 'approved', createdAt: hoursAgo(900) },
  { clubId: 'c-madurai-acad', clubName: 'Vaigai Basketball Academy', category: 'academy', districtCode: 'TN-MDU', teamMotto: 'Train like a pro.', isVerified: true, status: 'approved', createdAt: hoursAgo(1500) },
  { clubId: 'c-kochi', clubName: 'Kochi Tide', category: 'community', districtCode: 'KL-EKM', teamMotto: 'Ride the tide.', isVerified: false, status: 'approved', createdAt: hoursAgo(700) },
];

export const affiliations: ClubAffiliation[] = [
  { clubId: 'c-hawks', organizationId: 'org-TN-CHN', tnbaMembershipNumber: 'TNBA/CHN/0142', validUntil: '2027-03-31', status: 'active' },
  { clubId: 'c-adyar', organizationId: 'org-TN-CHN', tnbaMembershipNumber: 'TNBA/CHN/0178', validUntil: '2027-03-31', status: 'active' },
  { clubId: 'c-kovai', organizationId: 'org-TN-CBE', tnbaMembershipNumber: 'TNBA/CBE/0031', validUntil: '2026-12-31', status: 'active' },
];

const m = (id: string, clubId: string, userId: string, extra: Partial<ClubMembership> = {}): ClubMembership => ({
  id, clubId, userId, isOwner: false, isAdmin: false, isCoach: false, isPlayer: true, status: 'active', joinedAt: hoursAgo(3000), ...extra,
});

export const memberships: ClubMembership[] = [
  m('m1', 'c-hawks', 'u-roshan', { isOwner: true, isAdmin: true, position: 'SG' }),
  m('m2', 'c-hawks', 'u-arjun', { position: 'PG' }),
  m('m3', 'c-hawks', 'u-vikram', { position: 'C' }),
  m('m4', 'c-hawks', 'u-kavya', { position: 'SF' }),
  m('m5', 'c-hawks', 'u-karthik', { isCoach: true, isPlayer: false }),
  m('m6', 'c-adyar', 'u-sanjay', { isOwner: true, position: 'PF' }),
  m('m7', 'c-adyar', 'u-meera', { position: 'PG' }),
  m('m8', 'c-sunday', 'u-roshan', { position: 'SG' }),
  m('m9', 'c-sunday', 'u-meera', { isOwner: true, position: 'PG' }),
  m('m10', 'c-kovai', 'u-divya', { isOwner: true, position: 'SG' }),
  m('m11', 'c-kovai', 'u-nithya', { position: 'C' }),
  m('m12', 'c-temple', 'u-hari', { isOwner: true, position: 'SF' }),
  m('m13', 'c-temple', 'u-priya', { position: 'PG' }),
  m('m14', 'c-kochi', 'u-rahul', { isOwner: true, position: 'PF' }),
];

export const coaches: CoachDetail[] = [
  { id: 'co1', clubId: 'c-hawks', userId: 'u-karthik', name: 'Karthik Raja', role: 'head' },
  { id: 'co2', clubId: 'c-hawks', name: 'S. Balaji', role: 'assistant' },
  { id: 'co3', clubId: 'c-adyar', name: 'Anand Kumar', role: 'head' },
  { id: 'co4', clubId: 'c-hoopschool', name: 'Coach Daniel', role: 'head' },
  { id: 'co5', clubId: 'c-hoopschool', name: 'R. Lakshmi', role: 'assistant' },
  { id: 'co6', clubId: 'c-kovai', name: 'P. Murugan', role: 'head' },
];

export const joinRequests: JoinRequest[] = [
  { id: 'jr1', clubId: 'c-hawks', userId: 'u-meera', status: 'pending', createdAt: hoursAgo(6) },
  { id: 'jr2', clubId: 'c-hawks', userId: 'u-hari', status: 'pending', createdAt: hoursAgo(30) },
];

export const affiliationInvites: AffiliationInvite[] = [];

export const tournaments: Tournament[] = [
  { id: 'tr-chn-open', name: 'Chennai District Open 2026', gameSize: '5v5', districtCode: 'TN-CHN', organizerOrgId: 'org-TN-CHN', location: 'Nehru Indoor Stadium', startDate: hoursAgo(72), endDate: inHours(96), status: 'ongoing' },
  { id: 'tr-chn-u16', name: 'Chennai U-16 Championship', gameSize: '5v5', districtCode: 'TN-CHN', organizerOrgId: 'org-TN-CHN', location: 'YMCA Nandanam', startDate: inHours(400), endDate: inHours(470), status: 'upcoming' },
  { id: 'tr-cbe-3x3', name: 'Coimbatore 3x3 Series', gameSize: '3v3', districtCode: 'TN-CBE', organizerOrgId: 'org-TN-CBE', location: 'Codissia Grounds', startDate: inHours(240), endDate: inHours(288), status: 'upcoming' },
];

export const matches: Match[] = [
  { id: 'mt-1', category: 'tournament', tournamentId: 'tr-chn-open', districtCode: 'TN-CHN', createdByUserId: 'u-karthik', scorerUserId: 'u-karthik', sideA: { name: 'Marina Hawks', playerIds: ['u-arjun', 'u-vikram', 'u-kavya', 'u-roshan'] }, sideB: { name: 'Adyar Ballers', playerIds: ['u-sanjay', 'u-meera'] }, scoreA: 58, scoreB: 54, status: 'live', quarter: 4, venueText: 'Nehru Indoor Stadium', scheduledAt: hoursAgo(1) },
  { id: 'mt-2', category: 'friendly', districtCode: 'TN-CHN', createdByUserId: 'u-meera', scorerUserId: 'u-meera', sideA: { name: 'Whites', playerIds: ['u-meera', 'u-roshan'] }, sideB: { name: 'Darks', playerIds: ['u-vikram', 'u-karthik'] }, scoreA: 21, scoreB: 19, status: 'live', quarter: 2, venueText: 'Besant Nagar beach court', scheduledAt: hoursAgo(0.5) },
  { id: 'mt-3', category: 'friendly', districtCode: 'TN-MDU', createdByUserId: 'u-hari', scorerUserId: 'u-hari', sideA: { name: 'Temple City', playerIds: ['u-hari'] }, sideB: { name: 'Vaigai Juniors', playerIds: ['u-priya'] }, scoreA: 12, scoreB: 15, status: 'live', quarter: 1, venueText: 'Race Course Stadium', scheduledAt: hoursAgo(0.3) },
  { id: 'mt-4', category: 'tournament', tournamentId: 'tr-chn-open', districtCode: 'TN-CHN', createdByUserId: 'u-karthik', scorerUserId: 'u-karthik', sideA: { name: 'Marina Hawks', playerIds: ['u-arjun', 'u-roshan'] }, sideB: { name: 'Kovai Rimrockers', playerIds: ['u-divya', 'u-nithya'] }, scoreA: 71, scoreB: 66, status: 'completed', quarter: 4, venueText: 'Nehru Indoor Stadium', scheduledAt: hoursAgo(48) },
  { id: 'mt-5', category: 'practice', districtCode: 'TN-CHN', createdByUserId: 'u-roshan', scorerUserId: 'u-roshan', sideA: { name: 'Hawks A', playerIds: ['u-roshan', 'u-arjun'] }, sideB: { name: 'Hawks B', playerIds: ['u-vikram', 'u-kavya'] }, scoreA: 40, scoreB: 44, status: 'completed', quarter: 4, venueText: 'Marina beach court', scheduledAt: hoursAgo(80) },
  { id: 'mt-6', category: 'friendly', districtCode: 'TN-CBE', createdByUserId: 'u-divya', scorerUserId: 'u-divya', sideA: { name: 'Rimrockers', playerIds: ['u-divya'] }, sideB: { name: 'Guests', playerIds: ['u-nithya'] }, scoreA: 33, scoreB: 35, status: 'completed', quarter: 4, venueText: 'PSG Tech court', scheduledAt: hoursAgo(170) },
  { id: 'mt-7', category: 'friendly', districtCode: 'KL-EKM', createdByUserId: 'u-rahul', scorerUserId: 'u-rahul', sideA: { name: 'Kochi Tide', playerIds: ['u-rahul'] }, sideB: { name: 'Fort Kochi', playerIds: [] }, scoreA: 48, scoreB: 41, status: 'completed', quarter: 4, venueText: 'Regional Sports Centre', scheduledAt: hoursAgo(26) },
];

export const playerStats: PlayerStat[] = [
  { userId: 'u-roshan', matchesPlayed: 24, totalPoints: 342, totalRebounds: 98, totalAssists: 121 },
  { userId: 'u-arjun', matchesPlayed: 31, totalPoints: 496, totalRebounds: 87, totalAssists: 204 },
  { userId: 'u-vikram', matchesPlayed: 28, totalPoints: 389, totalRebounds: 301, totalAssists: 40 },
  { userId: 'u-kavya', matchesPlayed: 19, totalPoints: 261, totalRebounds: 112, totalAssists: 66 },
];

const img = (postId: string, aspectRatio: number, url?: string) => [{ id: `${postId}-m`, postId, url, type: 'image' as const, sortOrder: 0, aspectRatio }];

export const posts: Post[] = [
  { postId: 'p-1', organizationId: 'org-TN-CHN', districtCode: 'TN-CHN', type: 'official', content: 'Quarter-final fixtures for the Chennai District Open are out. Teams, please report 45 minutes before tip-off with player ID cards.', isPinned: true, status: 'published', createdAt: hoursAgo(3), media: [], likeCount: 214 },
  { postId: 'p-2', clubId: 'c-hawks', userId: 'u-arjun', districtCode: 'TN-CHN', type: 'achievement', content: 'Career high tonight: 31 points and 9 assists against Kovai. Thank you coach and the whole Hawks family.', isPinned: false, status: 'published', createdAt: hoursAgo(5), media: img('p-2', 4 / 5, STOCK_COURT), likeCount: 386 },
  { postId: 'p-3', clubId: 'c-sunday', userId: 'u-meera', districtCode: 'TN-CHN', type: 'highlight', content: 'Sunday run had 22 players today. Two full courts going. See you next week at 6:30.', isPinned: false, status: 'published', createdAt: hoursAgo(9), media: img('p-3', 1), likeCount: 97 },
  { postId: 'p-4', clubId: 'c-hoopschool', userId: 'u-karthik', districtCode: 'TN-CHN', type: 'general', content: 'New batch for ages 10–14 starts 1 November. Footwork and shooting form every Saturday.', isPinned: false, status: 'published', createdAt: hoursAgo(20), media: img('p-4', 16 / 9), likeCount: 152 },
  { postId: 'p-5', clubId: 'c-kovai', userId: 'u-divya', districtCode: 'TN-CBE', type: 'achievement', content: 'Selected for the state camp. Two years of 6 am sessions paid off.', isPinned: false, status: 'published', createdAt: hoursAgo(30), media: img('p-5', 4 / 5), likeCount: 841 },
  { postId: 'p-6', organizationId: 'org-TN-CBE', districtCode: 'TN-CBE', type: 'official', content: 'Registrations for the Coimbatore 3x3 Series open next week. Club secretaries will get the entry form by email.', isPinned: true, status: 'published', createdAt: hoursAgo(40), media: [], likeCount: 76 },
  { postId: 'p-7', clubId: 'c-temple', userId: 'u-hari', districtCode: 'TN-MDU', type: 'highlight', content: 'First friendly as a club. We lost by three but the crowd at Race Course was amazing.', isPinned: false, status: 'published', createdAt: hoursAgo(50), media: img('p-7', 1), likeCount: 230 },
  { postId: 'p-8', clubId: 'c-kochi', userId: 'u-rahul', districtCode: 'KL-EKM', type: 'general', content: 'Looking for two more players for our Saturday evening run in Kadavanthra.', isPinned: false, status: 'published', createdAt: hoursAgo(60), media: [], likeCount: 41 },
];

export const comments: PostComment[] = [
  { id: 'cm1', postId: 'p-2', userId: 'u-vikram', content: 'What a game. That fourth quarter!', createdAt: hoursAgo(4) },
  { id: 'cm2', postId: 'p-2', userId: 'u-kavya', content: 'Captain things 🔥', createdAt: hoursAgo(3.5) },
  { id: 'cm3', postId: 'p-5', userId: 'u-nithya', content: 'So proud of you!', createdAt: hoursAgo(28) },
  { id: 'cm4', postId: 'p-1', userId: 'u-sanjay', content: 'Adyar will be there early.', createdAt: hoursAgo(2) },
];
