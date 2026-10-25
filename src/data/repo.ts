/**
 * Repository: the only place screens read or change data.
 * Today: synchronous reads over the mock arrays. Later: calls to the shared
 * API in baskyclub-server with the same shapes. Rules come from
 * SCHEMA_PHASE1.md section 4.
 */
import * as db from '@/data/mock';
import type {
  Affiliation,
  Announcement,
  Club,
  ClubMembership,
  District,
  Follow,
  Organization,
  Post,
  PostComment,
  Position,
  User,
  Visibility,
} from '@/types/models';

import { bump } from './store';

export type Scope = { scope: 'india' | 'district'; districtCode: string | null };

const inScope = (s: Scope, districtCode?: string) => s.scope === 'india' || (!!s.districtCode && districtCode === s.districtCode);
const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();
const isCurrent = (r: { endDate?: string }) => !r.endDate || new Date(r.endDate) > new Date();

// ── Places ────────────────────────────────────────────────────────────────
export const getDistrict = (code?: string | null): District | undefined => (code ? db.districts.find((d) => d.code === code) : undefined);
export const getStateName = (code?: string) => db.states.find((s) => s.code === code)?.name;

export function getStates() {
  return db.states
    .map((s) => ({ ...s, count: db.districts.filter((d) => d.stateCode === s.code).length }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

export function ageOf(dob: string): number {
  const d = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}
export const isMinor = (u?: User) => !!u && ageOf(u.dateOfBirth) < 18;

export const isPlatformStaff = (userId?: string | null) => !!userId && db.platformRoles.some((r) => r.userId === userId);
export const isCreator = (userId?: string) => db.badges.some((b) => b.badge === 'creator' && b.userId === userId);

export function setHomeDistrict(userId: string, districtCode: string) {
  const u = getUser(userId);
  if (u) u.homeDistrictCode = districtCode;
  bump();
}

// ── Follows (#73) ─────────────────────────────────────────────────────────
export const isFollowing = (viewerId: string | undefined, targetType: Follow['targetType'], targetId: string) =>
  !!viewerId && db.follows.some((f) => f.followerId === viewerId && f.targetType === targetType && f.targetId === targetId);

export const followerCount = (targetType: Follow['targetType'], targetId: string) =>
  db.follows.filter((f) => f.targetType === targetType && f.targetId === targetId).length;

export function toggleFollow(viewerId: string, targetType: Follow['targetType'], targetId: string) {
  const i = db.follows.findIndex((f) => f.followerId === viewerId && f.targetType === targetType && f.targetId === targetId);
  if (i >= 0) db.follows.splice(i, 1);
  else db.follows.push({ followerId: viewerId, targetType, targetId });
  bump();
}

// ── Organisations ─────────────────────────────────────────────────────────
export const getOrganization = (id?: string): Organization | undefined => (id ? db.organizations.find((o) => o.id === id) : undefined);

/** Draft pages are visible only to the Basky team (#59). */
export const canSeeOrg = (o: Organization | undefined, viewerId?: string | null) => !!o && (o.pageStatus !== 'draft' || isPlatformStaff(viewerId));

export const getAssociationForDistrict = (code?: string | null) => getOrganization(getDistrict(code)?.associationId);

export function getAssociationDetail(id: string, viewerId?: string | null) {
  const org = getOrganization(id);
  if (!org || !canSeeOrg(org, viewerId)) return undefined;
  const coveredDistricts = db.districts.filter((d) => d.associationId === org.id);
  return {
    org,
    parent: getOrganization(org.parentId),
    children: db.organizations.filter((o) => o.parentId === org.id && canSeeOrg(o, viewerId)),
    coveredDistricts,
    officeBearers: db.officeBearers.filter((b) => b.orgId === org.id && isCurrent(b)),
    pastOfficeBearers: db.officeBearers.filter((b) => b.orgId === org.id && !isCurrent(b)),
    legacy: db.legacyRecords.filter((r) => r.orgId === org.id).sort((a, b) => b.year - a.year),
    clubs: db.clubs.filter((c) => activeAffiliation(c.clubId)?.orgId === org.id).map(toClubSummary),
    posts: db.posts.filter((p) => p.orgId === org.id && isVisible(p, viewerId)).map(toPostView),
    followers: followerCount('organization', org.id),
  };
}

// ── Clubs ─────────────────────────────────────────────────────────────────
/** "Affiliated" is worked out, never stored: active record with valid_until in the future (#58). */
export function activeAffiliation(clubId: string): Affiliation | undefined {
  return db.affiliations.find((a) => a.clubId === clubId && a.status === 'active' && (!a.validUntil || new Date(a.validUntil) > new Date()));
}

export interface ClubSummary extends Club {
  districtName?: string;
  memberCount: number;
  affiliated: boolean;
  verified: boolean;
  association?: Organization;
}

function toClubSummary(c: Club): ClubSummary {
  const aff = activeAffiliation(c.clubId);
  return {
    ...c,
    districtName: getDistrict(c.districtCode)?.name,
    memberCount: db.memberships.filter((m) => m.clubId === c.clubId && m.status === 'active').length,
    affiliated: !!aff,
    verified: db.badges.some((b) => b.badge === 'basky_verified' && b.clubId === c.clubId),
    association: aff ? getOrganization(aff.orgId) : undefined,
  };
}

export type ClubFilter = 'all' | 'affiliated' | 'community' | 'academy';

export function getClubs(s: Scope, filter: ClubFilter, query = ''): ClubSummary[] {
  const q = query.trim().toLowerCase();
  return db.clubs
    .filter((c) => c.status === 'approved' && inScope(s, c.districtCode))
    .map(toClubSummary)
    .filter((c) => {
      if (filter === 'affiliated') return c.kind === 'club' && c.affiliated;
      if (filter === 'community') return c.kind === 'club' && !c.affiliated;
      if (filter === 'academy') return c.kind === 'academy';
      return true;
    })
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.districtName?.toLowerCase().includes(q));
}

export const getMembership = (clubId: string, userId?: string | null) =>
  userId ? db.memberships.find((m) => m.clubId === clubId && m.userId === userId && m.status === 'active') : undefined;

export const getPendingMembership = (clubId: string, userId?: string | null) =>
  userId ? db.memberships.find((m) => m.clubId === clubId && m.userId === userId && m.status === 'pending') : undefined;

export function getMyClubs(userId?: string | null): (ClubSummary & { membership: ClubMembership })[] {
  if (!userId) return [];
  return db.memberships
    .filter((m) => m.userId === userId && m.status === 'active')
    .map((m) => ({ ...toClubSummary(db.clubs.find((c) => c.clubId === m.clubId)!), membership: m }));
}

const currentRoles = (clubId: string) => db.clubRoles.filter((r) => r.clubId === clubId && isCurrent(r));

export const canManageClub = (clubId: string, userId?: string | null) =>
  !!userId && currentRoles(clubId).some((r) => r.userId === userId && (r.role === 'owner' || r.role === 'admin'));

export function getClubDetail(clubId: string, viewerId?: string | null) {
  const c = db.clubs.find((x) => x.clubId === clubId);
  if (!c) return undefined;
  const roles = currentRoles(clubId);
  const roleOf = (userId: string) => roles.filter((r) => r.userId === userId).map((r) => r.role);
  const active = db.memberships.filter((m) => m.clubId === clubId && m.status === 'active');
  const isMember = !!getMembership(clubId, viewerId);
  return {
    club: toClubSummary(c),
    affiliation: activeAffiliation(clubId),
    owners: roles.filter((r) => r.role === 'owner').map((r) => getUser(r.userId)!),
    admins: roles.filter((r) => r.role === 'admin').map((r) => getUser(r.userId)!),
    captain: getUser(roles.find((r) => r.role === 'captain')?.userId),
    coaches: db.coaches.filter((x) => x.clubId === clubId),
    // "Plays for the club" = active membership with player ticked + position
    players: active.filter((m) => m.isPlayer).map((m) => ({ user: getUser(m.userId)!, membership: m, roles: roleOf(m.userId) })),
    others: active.filter((m) => !m.isPlayer).map((m) => ({ user: getUser(m.userId)!, membership: m, roles: roleOf(m.userId) })),
    posts: db.posts
      .filter((p) => p.clubId === clubId && p.moderationStatus === 'published' && (p.visibility !== 'members' || isMember))
      .map(toPostView),
    followers: followerCount('club', clubId),
    coveringAssociation: getAssociationForDistrict(c.districtCode),
  };
}

/** "Join" creates a pending membership (#63). */
export function requestToJoin(clubId: string, userId: string) {
  if (getPendingMembership(clubId, userId) || getMembership(clubId, userId)) return;
  db.memberships.push({ id: uid(), clubId, userId, status: 'pending', isPlayer: true, requestedAt: nowIso() });
  bump();
}

export function cancelJoinRequest(clubId: string, userId: string) {
  const i = db.memberships.findIndex((m) => m.clubId === clubId && m.userId === userId && m.status === 'pending');
  if (i >= 0) db.memberships.splice(i, 1);
  bump();
}

export function getJoinRequests(clubId: string) {
  return db.memberships.filter((m) => m.clubId === clubId && m.status === 'pending').map((m) => ({ ...m, user: getUser(m.userId)! }));
}

export function answerJoinRequest(membershipId: string, accept: boolean, position?: Position) {
  const m = db.memberships.find((x) => x.id === membershipId);
  if (!m) return;
  m.status = accept ? 'active' : 'rejected';
  if (accept) {
    m.joinedAt = nowIso();
    m.primaryPosition = position ?? m.primaryPosition;
  }
  bump();
}

// ── Posts ─────────────────────────────────────────────────────────────────
/** Who can see a post: published public posts for everyone; members-only for club members; own posts always. */
export function isVisible(p: Post, viewerId?: string | null) {
  if (viewerId && p.authorId === viewerId) return p.moderationStatus !== 'removed';
  if (p.moderationStatus !== 'published') return false;
  if (p.visibility === 'members') return !!p.clubId && !!getMembership(p.clubId, viewerId);
  return true;
}

export interface PostView extends Post {
  author?: User;
  club?: ClubSummary;
  organization?: Organization;
  authorIsCreator: boolean;
  liked: boolean;
  official: boolean; // linked from an announcement → pinned Official card (#75)
}

let viewer: string | undefined;
/** The session tells the repository who is looking (for likes and visibility). */
export const setViewer = (id?: string) => {
  viewer = id;
};

function toPostView(p: Post): PostView {
  const club = db.clubs.find((c) => c.clubId === p.clubId);
  return {
    ...p,
    author: getUser(p.authorId),
    club: club ? toClubSummary(club) : undefined,
    organization: getOrganization(p.orgId),
    authorIsCreator: isCreator(p.authorId),
    liked: !!viewer && db.postLikes.some((l) => l.postId === p.postId && l.userId === viewer),
    official: db.announcements.some((a) => a.feedPostId === p.postId),
  };
}

/** Feed: public posts (club_page posts stay on the club page); official cards pinned first. */
export function getFeed(s: Scope): PostView[] {
  return db.posts
    .filter((p) => p.visibility === 'public' && isVisible(p, viewer) && inScope(s, p.districtCode))
    .map(toPostView)
    .sort((a, b) => Number(b.official) - Number(a.official) || b.createdAt.localeCompare(a.createdAt));
}

export function getPost(id: string) {
  const p = db.posts.find((x) => x.postId === id);
  return p && isVisible(p, viewer) ? toPostView(p) : undefined;
}

export function togglePostLike(postId: string, userId: string) {
  const p = db.posts.find((x) => x.postId === postId);
  if (!p) return;
  const i = db.postLikes.findIndex((l) => l.postId === postId && l.userId === userId);
  if (i >= 0) {
    db.postLikes.splice(i, 1);
    p.likeCount--;
  } else {
    db.postLikes.push({ postId, userId });
    p.likeCount++;
  }
  bump();
}

export interface CommentView extends PostComment {
  user?: User;
  replies: (PostComment & { user?: User })[];
}

/** Top-level comments with one level of replies. */
export function getComments(postId: string): CommentView[] {
  const all = db.comments.filter((c) => c.postId === postId).map((c) => ({ ...c, user: getUser(c.userId) }));
  return all
    .filter((c) => !c.parentId)
    .map((c) => ({ ...c, replies: all.filter((r) => r.parentId === c.id) }));
}

/** A reply to a reply attaches to the same top-level comment (one level only). */
export function addComment(postId: string, userId: string, content: string, replyTo?: PostComment) {
  const parentId = replyTo ? replyTo.parentId ?? replyTo.id : undefined;
  db.comments.push({ id: uid(), postId, userId, parentId, content, createdAt: nowIso() });
  const p = db.posts.find((x) => x.postId === postId);
  if (p) p.commentCount++;
  bump();
}

export function deleteComment(id: string) {
  const c = db.comments.find((x) => x.id === id);
  if (c) c.deletedAt = nowIso();
  bump();
}

export function createPost(input: { userId: string; clubId?: string; content: string; visibility: Visibility; images: { uri: string; ratio: number }[]; youtube?: string }) {
  const user = getUser(input.userId)!;
  const club = db.clubs.find((c) => c.clubId === input.clubId);
  const postId = uid();
  const media = [
    ...input.images.map((im, i) => ({ id: `${postId}-m${i}`, postId, mediaType: 'image' as const, url: im.uri, sortOrder: i, aspectRatio: im.ratio })),
    ...(input.youtube ? [{ id: `${postId}-y`, postId, mediaType: 'youtube' as const, url: input.youtube, sortOrder: input.images.length }] : []),
  ];
  // Club/academy members → AI check → published; no club → in_review (#41).
  const moderationStatus = club && getMembership(club.clubId, user.userId) ? 'published' : 'in_review';
  db.posts.unshift({
    postId,
    authorId: user.userId,
    clubId: club?.clubId,
    districtCode: club?.districtCode ?? user.homeDistrictCode,
    visibility: club ? input.visibility : 'public',
    moderationStatus,
    content: input.content,
    likeCount: 0,
    commentCount: 0,
    createdAt: nowIso(),
    media,
  });
  bump();
  return { postId, moderationStatus };
}

// ── Announcements (#65, #75) ──────────────────────────────────────────────
export interface AlertView extends Announcement {
  senderName: string;
  senderKind: 'association' | 'club' | 'basky';
}

/** Which announcements reach this user, by audience. */
export function getAlerts(userId?: string | null): AlertView[] {
  const user = getUser(userId);
  if (!user) return [];
  const myClubs = db.memberships.filter((m) => m.userId === user.userId && m.status === 'active').map((m) => m.clubId);
  const reaches = (a: Announcement) => {
    if (a.audience === 'everyone') return true;
    if (a.clubId) return a.audience === 'club_members' && myClubs.includes(a.clubId);
    if (!a.orgId) return false;
    const areaDistricts = db.districts.filter((d) => d.associationId === a.orgId).map((d) => d.code);
    switch (a.audience) {
      case 'district_users':
        return !!user.homeDistrictCode && areaDistricts.includes(user.homeDistrictCode);
      case 'followers':
        return isFollowing(user.userId, 'organization', a.orgId);
      case 'affiliated_members':
        return myClubs.some((c) => activeAffiliation(c)?.orgId === a.orgId);
      case 'club_admins_in_area':
        return db.clubs.some((c) => areaDistricts.includes(c.districtCode ?? '') && canManageClub(c.clubId, user.userId));
      default:
        return false;
    }
  };
  return db.announcements
    .filter(reaches)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((a) => ({
      ...a,
      senderName: a.orgId ? getOrganization(a.orgId)?.name ?? 'Association' : a.clubId ? db.clubs.find((c) => c.clubId === a.clubId)?.name ?? 'Club' : 'BaskyCLub team',
      senderKind: a.orgId ? 'association' : a.clubId ? 'club' : 'basky',
    }));
}

// ── Profiles (#72) ────────────────────────────────────────────────────────
export function getProfile(userId: string) {
  const user = getUser(userId);
  if (!user || user.status === 'deleted') return undefined;
  const userPosts = db.posts.filter((p) => p.authorId === userId && isVisible(p, viewer) && p.visibility !== 'members');
  const pinned = user.pinnedPostId ? db.posts.find((p) => p.postId === user.pinnedPostId) : userPosts[0];
  return {
    user,
    minor: isMinor(user), // hides Instagram / YouTube
    creator: isCreator(userId),
    district: getDistrict(user.homeDistrictCode),
    clubs: getMyClubs(userId),
    pinned: pinned && isVisible(pinned, viewer) ? toPostView(pinned) : undefined,
    posts: userPosts.filter((p) => p.postId !== pinned?.postId).map(toPostView),
    followers: followerCount('user', userId),
    following: db.follows.filter((f) => f.followerId === userId).length,
  };
}
