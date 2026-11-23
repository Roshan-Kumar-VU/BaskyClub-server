/**
 * Repository: the only place screens read or change data.
 * Today: synchronous reads over mock arrays. Later: API calls with the same shapes.
 */
import * as db from '@/data/mock';
import type {
  Club,
  ClubCategory,
  ClubMembership,
  District,
  Match,
  Organization,
  Post,
  PostComment,
  Position,
  Tournament,
  User,
} from '@/types/models';

import { bump } from './store';

export type Scope = { scope: 'india' | 'district'; districtCode: string | null };

const inScope = (s: Scope, districtCode?: string) => s.scope === 'india' || (!!s.districtCode && districtCode === s.districtCode);
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Geography ─────────────────────────────────────────────────────────────
export const getDistrict = (code?: string | null): District | undefined => (code ? db.districts.find((d) => d.code === code) : undefined);

export function getStates(): { code: string; name: string; count: number }[] {
  const map = new Map<string, { code: string; name: string; count: number }>();
  db.districts.forEach((d) => {
    const s = map.get(d.stateCode) ?? { code: d.stateCode, name: d.stateName, count: 0 };
    s.count++;
    map.set(d.stateCode, s);
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const getDistrictsOfState = (stateCode: string) =>
  db.districts.filter((d) => d.stateCode === stateCode).sort((a, b) => a.name.localeCompare(b.name));

/** Match a reverse-geocoded place name against district names and alt names. */
export function matchDistrict(candidates: (string | null | undefined)[]): District | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/district|\s+/g, '');
  const wanted = candidates.filter(Boolean).map((c) => norm(c!));
  return db.districts.find((d) => [d.name, ...(d.altNames ?? [])].some((n) => wanted.includes(norm(n))));
}

// ── People ────────────────────────────────────────────────────────────────
export const getUser = (id?: string | null): User | undefined => (id ? db.users.find((u) => u.userId === id) : undefined);

export function setHomeDistrict(userId: string, districtCode: string) {
  const u = getUser(userId);
  if (u) u.homeDistrictCode = districtCode;
  bump();
}

// ── Organizations ─────────────────────────────────────────────────────────
export const getOrganization = (id?: string): Organization | undefined => (id ? db.organizations.find((o) => o.id === id) : undefined);

export function getAssociationForDistrict(code?: string | null): Organization | undefined {
  return getOrganization(getDistrict(code)?.basketballAssociationId);
}

export function getAssociationDetail(id: string) {
  const org = getOrganization(id);
  if (!org) return undefined;
  return {
    org,
    parent: getOrganization(org.parentId),
    children: db.organizations.filter((o) => o.parentId === org.id),
    coveredDistricts: db.districts.filter((d) => d.basketballAssociationId === org.id),
    clubs: db.clubs.filter((c) => c.organizationId === org.id).map(toClubSummary),
    posts: db.posts.filter((p) => p.organizationId === org.id).map(toPostView),
  };
}

// ── Posts ─────────────────────────────────────────────────────────────────
export interface PostView extends Post {
  author?: User;
  club?: Club;
  organization?: Organization;
  commentCount: number;
}

function toPostView(p: Post): PostView {
  return {
    ...p,
    author: getUser(p.userId),
    club: db.clubs.find((c) => c.clubId === p.clubId),
    organization: getOrganization(p.organizationId),
    commentCount: db.comments.filter((c) => c.postId === p.postId).length,
  };
}

const newestPinnedFirst = (a: Post, b: Post) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.localeCompare(a.createdAt);

export function getFeed(s: Scope): PostView[] {
  return db.posts
    .filter((p) => p.status === 'published' && inScope(s, p.districtCode))
    .sort((a, b) => (s.scope === 'district' ? newestPinnedFirst(a, b) : b.createdAt.localeCompare(a.createdAt)))
    .map(toPostView);
}

export const getPost = (id: string) => {
  const p = db.posts.find((x) => x.postId === id);
  return p ? toPostView(p) : undefined;
};

export function getComments(postId: string): (PostComment & { user?: User })[] {
  return db.comments.filter((c) => c.postId === postId).map((c) => ({ ...c, user: getUser(c.userId) }));
}

export function addComment(postId: string, userId: string, content: string) {
  db.comments.push({ id: uid(), postId, userId, content, createdAt: new Date().toISOString() });
  bump();
}

export function createPost(input: { userId: string; clubId?: string; content: string; imageUri?: string; aspectRatio?: number }) {
  const user = getUser(input.userId)!;
  const club = db.clubs.find((c) => c.clubId === input.clubId);
  const postId = uid();
  // District is filled automatically (APP_NAV section 6).
  const districtCode = club?.districtCode ?? user.homeDistrictCode;
  db.posts.unshift({
    postId,
    clubId: club?.clubId,
    userId: user.userId,
    districtCode,
    type: 'general',
    content: input.content,
    isPinned: false,
    // Member posts: AI check only (mock = instant). No club: AI + Basky team review.
    status: club ? 'published' : 'pending_review',
    createdAt: new Date().toISOString(),
    media: input.imageUri ? [{ id: `${postId}-m`, postId, url: input.imageUri, type: 'image', sortOrder: 0, aspectRatio: input.aspectRatio ?? 1 }] : [],
    likeCount: 0,
  });
  bump();
  return { postId, status: club ? 'published' : 'pending_review', districtCode };
}

// ── Clubs ─────────────────────────────────────────────────────────────────
export interface ClubSummary extends Club {
  districtName?: string;
  memberCount: number;
  association?: Organization;
}

function toClubSummary(c: Club): ClubSummary {
  return {
    ...c,
    districtName: getDistrict(c.districtCode)?.name,
    memberCount: db.memberships.filter((m) => m.clubId === c.clubId && m.status === 'active').length,
    association: getOrganization(c.organizationId),
  };
}

export type ClubFilter = 'all' | ClubCategory;

export function getClubs(s: Scope, filter: ClubFilter, query = ''): ClubSummary[] {
  const q = query.trim().toLowerCase();
  return db.clubs
    .filter((c) => c.status === 'approved' && inScope(s, c.districtCode))
    .filter((c) => filter === 'all' || c.category === filter)
    .map(toClubSummary)
    .filter((c) => !q || c.clubName.toLowerCase().includes(q) || c.districtName?.toLowerCase().includes(q));
}

export function getMyClubs(userId?: string | null): ClubSummary[] {
  if (!userId) return [];
  const ids = db.memberships.filter((m) => m.userId === userId && m.status === 'active').map((m) => m.clubId);
  return db.clubs.filter((c) => ids.includes(c.clubId)).map(toClubSummary);
}

export interface MemberView {
  user: User;
  membership: ClubMembership;
}

export function getClubDetail(clubId: string) {
  const c = db.clubs.find((x) => x.clubId === clubId);
  if (!c) return undefined;
  const members: MemberView[] = db.memberships
    .filter((m) => m.clubId === clubId && m.status === 'active')
    .map((m) => ({ user: getUser(m.userId)!, membership: m }));
  return {
    club: toClubSummary(c),
    affiliation: db.affiliations.find((a) => a.clubId === clubId),
    captain: getUser(c.captainUserId),
    headCoach: db.coaches.find((x) => x.clubId === clubId && x.role === 'head'),
    assistantCoaches: db.coaches.filter((x) => x.clubId === clubId && x.role === 'assistant'),
    players: members.filter((mv) => mv.membership.isPlayer),
    staff: members.filter((mv) => !mv.membership.isPlayer),
    posts: db.posts.filter((p) => p.clubId === clubId && p.status === 'published').map(toPostView),
    coveringAssociation: getAssociationForDistrict(c.districtCode),
  };
}

export function getMembership(clubId: string, userId?: string | null) {
  return userId ? db.memberships.find((m) => m.clubId === clubId && m.userId === userId && m.status === 'active') : undefined;
}

export const canManageClub = (clubId: string, userId?: string | null) => {
  const m = getMembership(clubId, userId);
  return !!m && (m.isOwner || m.isAdmin);
};

export function getMyJoinRequest(clubId: string, userId?: string | null) {
  return userId ? db.joinRequests.find((r) => r.clubId === clubId && r.userId === userId && r.status === 'pending') : undefined;
}

export function requestToJoin(clubId: string, userId: string) {
  if (getMyJoinRequest(clubId, userId)) return;
  db.joinRequests.push({ id: uid(), clubId, userId, status: 'pending', createdAt: new Date().toISOString() });
  bump();
}

export function cancelJoinRequest(clubId: string, userId: string) {
  const r = getMyJoinRequest(clubId, userId);
  if (r) r.status = 'declined';
  bump();
}

export function getClubRequests(clubId: string) {
  return {
    joinRequests: db.joinRequests.filter((r) => r.clubId === clubId && r.status === 'pending').map((r) => ({ ...r, user: getUser(r.userId)! })),
    invites: db.affiliationInvites.filter((i) => i.clubId === clubId).map((i) => ({ ...i, organization: getOrganization(i.organizationId)! })),
  };
}

export function answerJoinRequest(id: string, accept: boolean, position?: Position) {
  const r = db.joinRequests.find((x) => x.id === id);
  if (!r) return;
  r.status = accept ? 'accepted' : 'declined';
  if (accept) {
    db.memberships.push({ id: uid(), clubId: r.clubId, userId: r.userId, isOwner: false, isAdmin: false, isCoach: false, isPlayer: true, status: 'active', position, joinedAt: new Date().toISOString() });
  }
  bump();
}

/** Club → association link request. Waits as pending while the association is a placeholder. */
export function requestAffiliation(clubId: string, organizationId: string, tnbaMembershipNumber: string) {
  db.affiliationInvites.push({ id: uid(), clubId, organizationId, direction: 'club_to_association', tnbaMembershipNumber, status: 'pending', createdAt: new Date().toISOString() });
  bump();
}

export function answerInvite(id: string, accept: boolean) {
  const i = db.affiliationInvites.find((x) => x.id === id);
  if (!i) return;
  i.status = accept ? 'accepted' : 'declined';
  if (accept) {
    const c = db.clubs.find((x) => x.clubId === i.clubId);
    if (c) {
      c.organizationId = i.organizationId;
      c.category = 'affiliated';
    }
  }
  bump();
}

// ── Tournaments (read-only in Phase 1) ────────────────────────────────────
export const getTournaments = (s: Scope): Tournament[] => db.tournaments.filter((t) => inScope(s, t.districtCode));

// ── Matches ───────────────────────────────────────────────────────────────
export interface MatchView extends Match {
  tournamentName?: string;
  districtName?: string;
}

const toMatchView = (mt: Match): MatchView => ({
  ...mt,
  tournamentName: db.tournaments.find((t) => t.id === mt.tournamentId)?.name,
  districtName: getDistrict(mt.districtCode)?.name,
});

export type MatchFilter = 'live' | 'recent' | 'mine';

export function getMatches(s: Scope, filter: MatchFilter, userId?: string | null): MatchView[] {
  return db.matches
    .filter((mt) => inScope(s, mt.districtCode))
    .filter((mt) => {
      if (filter === 'live') return mt.status === 'live';
      if (filter === 'recent') return mt.status === 'completed';
      return !!userId && (mt.createdByUserId === userId || mt.sideA.playerIds.includes(userId) || mt.sideB.playerIds.includes(userId));
    })
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
    .map(toMatchView);
}

export const getLiveMatches = (s: Scope) => getMatches(s, 'live');

export function getMatch(id: string) {
  const mt = db.matches.find((x) => x.id === id);
  if (!mt) return undefined;
  return {
    match: toMatchView(mt),
    playersA: mt.sideA.playerIds.map((p) => getUser(p)).filter(Boolean) as User[],
    playersB: mt.sideB.playerIds.map((p) => getUser(p)).filter(Boolean) as User[],
    scorer: getUser(mt.scorerUserId),
  };
}

export function scorePoints(matchId: string, side: 'A' | 'B', points: number) {
  const mt = db.matches.find((x) => x.id === matchId);
  if (!mt || mt.status !== 'live') return;
  if (side === 'A') mt.scoreA = Math.max(0, mt.scoreA + points);
  else mt.scoreB = Math.max(0, mt.scoreB + points);
  bump();
}

export function nextQuarter(matchId: string) {
  const mt = db.matches.find((x) => x.id === matchId);
  if (!mt) return;
  if (mt.quarter >= 4) mt.status = 'completed';
  else mt.quarter++;
  bump();
}

export function handOverScoring(matchId: string, userId: string) {
  const mt = db.matches.find((x) => x.id === matchId);
  if (mt) mt.scorerUserId = userId;
  bump();
}

export function createMatch(input: { userId: string; category: 'friendly' | 'practice'; nameA: string; nameB: string; venue: string; playersA: string[]; playersB: string[] }) {
  const user = getUser(input.userId)!;
  const id = uid();
  db.matches.unshift({
    id,
    category: input.category,
    districtCode: user.homeDistrictCode,
    createdByUserId: user.userId,
    scorerUserId: user.userId,
    sideA: { name: input.nameA, playerIds: input.playersA },
    sideB: { name: input.nameB, playerIds: input.playersB },
    scoreA: 0,
    scoreB: 0,
    status: 'live',
    quarter: 1,
    venueText: input.venue,
    scheduledAt: new Date().toISOString(),
  });
  bump();
  return id;
}

/** Players must have accounts (Phase 1): find one by phone or name. */
export function findPlayer(q: string): User | undefined {
  const s = q.trim().toLowerCase();
  if (!s) return undefined;
  const digits = s.replace(/\D/g, '');
  return db.users.find((u) => (digits.length >= 6 && u.phone?.endsWith(digits.slice(-10))) || u.name.toLowerCase().includes(s));
}

// ── Profiles ──────────────────────────────────────────────────────────────
export function getProfile(userId: string) {
  const user = getUser(userId);
  if (!user) return undefined;
  const all = db.matches.filter((mt) => mt.status === 'completed' && (mt.sideA.playerIds.includes(userId) || mt.sideB.playerIds.includes(userId)));
  const playing = db.memberships.find((x) => x.userId === userId && x.isPlayer && x.status === 'active');
  return {
    user,
    district: getDistrict(user.homeDistrictCode),
    position: playing?.position,
    jerseyNumber: db.jerseyNumbers[userId],
    clubs: getMyClubs(userId),
    stats: db.playerStats.find((p) => p.userId === userId),
    matchCounts: {
      tournament: all.filter((x) => x.category === 'tournament').length,
      friendly: all.filter((x) => x.category === 'friendly').length,
      practice: all.filter((x) => x.category === 'practice').length,
    },
    recentMatches: all.slice(0, 3).map(toMatchView),
    posts: db.posts.filter((p) => p.userId === userId).map(toPostView),
  };
}
