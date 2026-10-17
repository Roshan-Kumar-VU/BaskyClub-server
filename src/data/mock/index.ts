/**
 * Mock data for the first draft. All names are made up.
 * Shapes follow src/types/models.ts (Database Guide), so swapping to the API
 * later only changes the repositories, not the screens.
 */
import type {
  Club,
  ClubMembership,
  District,
  Match,
  Organization,
  PlayerStat,
  Post,
  Team,
  Tournament,
  User,
} from '@/types/models';

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const inHours = (h: number) => new Date(now + h * 3_600_000).toISOString();

export const districts: District[] = [
  { code: 'TN-CHN', name: 'Chennai', stateCode: 'TN', stateName: 'Tamil Nadu' },
  { code: 'TN-CBE', name: 'Coimbatore', stateCode: 'TN', stateName: 'Tamil Nadu' },
  { code: 'TN-MDU', name: 'Madurai', stateCode: 'TN', stateName: 'Tamil Nadu' },
  { code: 'TN-TRY', name: 'Tiruchirappalli', stateCode: 'TN', stateName: 'Tamil Nadu' },
];

export const organizations: Organization[] = [
  { id: 'org-tn', name: 'Tamil Nadu State Basketball Body', shortName: 'TN State', level: 'state', stateCode: 'TN', isPartner: false },
  { id: 'org-chn', name: 'Chennai District Basketball Association', shortName: 'CDBA', level: 'district', parentId: 'org-tn', districtCode: 'TN-CHN', isPartner: true },
  { id: 'org-cbe', name: 'Coimbatore District Basketball Association', shortName: 'CbDBA', level: 'district', parentId: 'org-tn', districtCode: 'TN-CBE', isPartner: false },
];

export const users: User[] = [
  { userId: 'u-roshan', name: 'Roshan Kumar', email: 'roshan@example.com', gender: 'male', createdAt: hoursAgo(2000) },
  { userId: 'u-arjun', name: 'Arjun Selvam', email: 'arjun@example.com', gender: 'male', createdAt: hoursAgo(1800) },
  { userId: 'u-kavya', name: 'Kavya Ramesh', email: 'kavya@example.com', gender: 'female', createdAt: hoursAgo(1700) },
  { userId: 'u-vikram', name: 'Vikram Iyer', email: 'vikram@example.com', gender: 'male', createdAt: hoursAgo(1600) },
  { userId: 'u-meera', name: 'Meera Krishnan', email: 'meera@example.com', gender: 'female', createdAt: hoursAgo(1500) },
  { userId: 'u-sanjay', name: 'Sanjay Prakash', email: 'sanjay@example.com', gender: 'male', createdAt: hoursAgo(1400) },
  { userId: 'u-divya', name: 'Divya Nair', email: 'divya@example.com', gender: 'female', createdAt: hoursAgo(1300) },
  { userId: 'u-karthik', name: 'Karthik Raja', email: 'karthik@example.com', gender: 'male', createdAt: hoursAgo(1200) },
  { userId: 'u-nithya', name: 'Nithya Suresh', email: 'nithya@example.com', gender: 'female', createdAt: hoursAgo(1100) },
  { userId: 'u-hari', name: 'Hari Venkat', email: 'hari@example.com', gender: 'male', createdAt: hoursAgo(1000) },
];

export const clubs: Club[] = [
  { clubId: 'c-hawks', clubName: 'Marina Hawks', kind: 'sports', organizationId: 'org-chn', districtCode: 'TN-CHN', teamMotto: 'Run the floor.', description: 'Evening sessions at the beach court since 2014. Senior men, women and U-16 squads.', isVerified: true, status: 'approved', createdAt: hoursAgo(5000) },
  { clubId: 'c-adyar', clubName: 'Adyar Ballers', kind: 'sports', organizationId: 'org-chn', districtCode: 'TN-CHN', teamMotto: 'Defence wins.', description: 'Community club with a strong 3x3 programme.', isVerified: true, status: 'approved', createdAt: hoursAgo(4500) },
  { clubId: 'c-kovai', clubName: 'Kovai Rimrockers', kind: 'sports', organizationId: 'org-cbe', districtCode: 'TN-CBE', teamMotto: 'Every rebound counts.', description: 'Coimbatore club training at an indoor hardwood court.', isVerified: true, status: 'approved', createdAt: hoursAgo(4000) },
  { clubId: 'c-temple', clubName: 'Temple City Hoopers', kind: 'sports', districtCode: 'TN-MDU', teamMotto: 'Play together.', description: 'Madurai\'s newest club. Open trials every Sunday.', isVerified: false, status: 'approved', createdAt: hoursAgo(900) },
  { clubId: 'c-rock', clubName: 'Rockfort Dribblers', kind: 'sports', districtCode: 'TN-TRY', teamMotto: 'Hard work, hard court.', isVerified: false, status: 'approved', createdAt: hoursAgo(700) },
  { clubId: 'c-creators', clubName: 'Creator Club', kind: 'creator', teamMotto: 'Basketball stories from India.', description: 'Verified creators covering Indian basketball.', isVerified: true, status: 'approved', createdAt: hoursAgo(600) },
];

const m = (id: string, clubId: string, userId: string, extra: Partial<ClubMembership> = {}): ClubMembership => ({
  id, clubId, userId, isOwner: false, isAdmin: false, isCoach: false, isPlayer: true, status: 'active', joinedAt: hoursAgo(3000), ...extra,
});

export const memberships: ClubMembership[] = [
  m('m1', 'c-hawks', 'u-roshan', { isOwner: true, isAdmin: true, position: 'SG' }),
  m('m2', 'c-hawks', 'u-arjun', { position: 'PG' }),
  m('m3', 'c-hawks', 'u-vikram', { position: 'C' }),
  m('m4', 'c-hawks', 'u-karthik', { isCoach: true, isPlayer: false }),
  m('m5', 'c-hawks', 'u-kavya', { position: 'SF' }),
  m('m6', 'c-adyar', 'u-sanjay', { isOwner: true, position: 'PF' }),
  m('m7', 'c-adyar', 'u-meera', { position: 'PG' }),
  m('m8', 'c-adyar', 'u-hari', { position: 'SF' }),
  m('m9', 'c-kovai', 'u-divya', { isOwner: true, position: 'SG' }),
  m('m10', 'c-kovai', 'u-nithya', { position: 'C' }),
  m('m11', 'c-creators', 'u-hari', { isPlayer: false }),
];

export const teams: Team[] = [
  { teamId: 't-hawks-sr', clubId: 'c-hawks', teamName: 'Hawks Senior', gameSize: '5v5', ageCategory: 'Senior', gender: 'men' },
  { teamId: 't-hawks-w', clubId: 'c-hawks', teamName: 'Hawks Women', gameSize: '5v5', ageCategory: 'Senior', gender: 'women' },
  { teamId: 't-adyar-sr', clubId: 'c-adyar', teamName: 'Adyar Senior', gameSize: '5v5', ageCategory: 'Senior', gender: 'men' },
  { teamId: 't-adyar-3', clubId: 'c-adyar', teamName: 'Adyar 3x3', gameSize: '3v3', ageCategory: 'Senior', gender: 'men' },
  { teamId: 't-kovai-sr', clubId: 'c-kovai', teamName: 'Rimrockers', gameSize: '5v5', ageCategory: 'Senior', gender: 'men' },
  { teamId: 't-temple', clubId: 'c-temple', teamName: 'Temple City', gameSize: '5v5', ageCategory: 'Senior', gender: 'men' },
  { teamId: 't-rock', clubId: 'c-rock', teamName: 'Rockfort', gameSize: '5v5', ageCategory: 'Senior', gender: 'men' },
  { teamId: 't-pickup-a', teamName: 'Sunday Whites', gameSize: '5v5' },
  { teamId: 't-pickup-b', teamName: 'Sunday Darks', gameSize: '5v5' },
];

export const tournaments: Tournament[] = [
  { id: 'tr-chn-league', name: 'Chennai District Open 2026', gameSize: '5v5', location: 'Nehru Indoor Stadium', startDate: hoursAgo(72), endDate: inHours(96), status: 'ongoing' },
  { id: 'tr-tn-3x3', name: 'TN 3x3 Summer Series', gameSize: '3v3', location: 'Coimbatore', startDate: inHours(240), endDate: inHours(288), status: 'upcoming' },
];

export const matches: Match[] = [
  { id: 'mt-1', tournamentId: 'tr-chn-league', category: 'tournament', teamAId: 't-hawks-sr', teamBId: 't-adyar-sr', scoreA: 58, scoreB: 54, status: 'live', quarter: 4, venueText: 'Nehru Indoor Stadium', scheduledAt: hoursAgo(1) },
  { id: 'mt-2', category: 'friendly', teamAId: 't-pickup-a', teamBId: 't-pickup-b', scoreA: 21, scoreB: 19, status: 'live', quarter: 2, venueText: 'Marina beach court', scheduledAt: hoursAgo(0.5) },
  { id: 'mt-3', tournamentId: 'tr-chn-league', category: 'tournament', teamAId: 't-kovai-sr', teamBId: 't-temple', scoreA: 0, scoreB: 0, status: 'scheduled', venueText: 'Nehru Indoor Stadium', scheduledAt: inHours(20) },
  { id: 'mt-4', tournamentId: 'tr-chn-league', category: 'tournament', teamAId: 't-rock', teamBId: 't-hawks-sr', scoreA: 0, scoreB: 0, status: 'scheduled', venueText: 'Nehru Indoor Stadium', scheduledAt: inHours(44) },
  { id: 'mt-5', category: 'practice', teamAId: 't-hawks-sr', teamBId: 't-hawks-w', scoreA: 0, scoreB: 0, status: 'scheduled', venueText: 'Marina beach court', scheduledAt: inHours(30) },
  { id: 'mt-6', tournamentId: 'tr-chn-league', category: 'tournament', teamAId: 't-hawks-sr', teamBId: 't-kovai-sr', scoreA: 71, scoreB: 66, status: 'completed', venueText: 'Nehru Indoor Stadium', scheduledAt: hoursAgo(48), winnerId: 't-hawks-sr' },
  { id: 'mt-7', tournamentId: 'tr-chn-league', category: 'tournament', teamAId: 't-adyar-sr', teamBId: 't-temple', scoreA: 80, scoreB: 62, status: 'completed', venueText: 'Nehru Indoor Stadium', scheduledAt: hoursAgo(50), winnerId: 't-adyar-sr' },
  { id: 'mt-8', category: 'friendly', teamAId: 't-pickup-b', teamBId: 't-pickup-a', scoreA: 33, scoreB: 35, status: 'completed', venueText: 'Marina beach court', scheduledAt: hoursAgo(170), winnerId: 't-pickup-a' },
];

export const playerStats: PlayerStat[] = [
  { userId: 'u-roshan', matchesPlayed: 24, totalPoints: 342, totalRebounds: 98, totalAssists: 121 },
  { userId: 'u-arjun', matchesPlayed: 31, totalPoints: 496, totalRebounds: 87, totalAssists: 204 },
  { userId: 'u-vikram', matchesPlayed: 28, totalPoints: 389, totalRebounds: 301, totalAssists: 40 },
  { userId: 'u-kavya', matchesPlayed: 19, totalPoints: 261, totalRebounds: 112, totalAssists: 66 },
];

const img = (postId: string, aspectRatio: number) => [{ id: `${postId}-m`, postId, type: 'image' as const, sortOrder: 0, aspectRatio }];

export const posts: Post[] = [
  { postId: 'p-1', organizationId: 'org-chn', type: 'official', content: 'Quarter-final fixtures for the Chennai District Open are out. Teams, please report 45 minutes before tip-off with player ID cards.', isPinned: true, showOnClubPage: false, status: 'published', createdAt: hoursAgo(3), media: [], likeCount: 214, commentCount: 18 },
  { postId: 'p-2', clubId: 'c-hawks', userId: 'u-arjun', type: 'achievement', content: 'Career high tonight: 31 points and 9 assists against Kovai. Thank you coach and the whole Hawks family.', isPinned: false, showOnClubPage: true, status: 'published', createdAt: hoursAgo(5), media: img('p-2', 4 / 5), likeCount: 386, commentCount: 42 },
  { postId: 'p-3', clubId: 'c-adyar', userId: 'u-meera', type: 'highlight', content: 'Morning 3x3 run at Adyar. Who is joining us on Saturday?', isPinned: false, showOnClubPage: true, status: 'published', createdAt: hoursAgo(9), media: img('p-3', 1), likeCount: 97, commentCount: 11 },
  { postId: 'p-4', clubId: 'c-creators', userId: 'u-hari', type: 'general', content: 'Five drills every guard in Tamil Nadu should be doing this off-season. Full breakdown on the club page.', isPinned: false, showOnClubPage: true, status: 'published', createdAt: hoursAgo(20), media: img('p-4', 16 / 9), likeCount: 512, commentCount: 63 },
  { postId: 'p-5', clubId: 'c-kovai', userId: 'u-divya', type: 'achievement', content: 'Selected for the state camp. Two years of 6 am sessions paid off.', isPinned: false, showOnClubPage: true, status: 'published', createdAt: hoursAgo(30), media: img('p-5', 4 / 5), likeCount: 841, commentCount: 120 },
  { postId: 'p-6', clubId: 'c-hawks', userId: 'u-kavya', type: 'highlight', content: 'Hawks Women are 4–0 this season. Next up: Adyar on Friday.', isPinned: false, showOnClubPage: true, status: 'published', createdAt: hoursAgo(50), media: img('p-6', 1), likeCount: 230, commentCount: 19 },
];
