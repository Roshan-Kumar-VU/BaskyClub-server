/**
 * Repository: the only place screens read or change data.
 * Now backed by the shared API in baskyclub-server (API_REFERENCE.md). Reads stay
 * synchronous for the screens: they return what's cached and fetch in the
 * background; mutations call the API and refresh what they touch. Shapes match
 * the old mock layer, so screens didn't need to change.
 */
import type {
  Affiliation,
  Club,
  ClubMembership,
  District,
  Follow,
  Organization,
  Post,
  PostComment,
  PostMedia,
  Position,
  User,
  Visibility,
} from '@/types/models';

import {
  youtubeThumbnail,
  type Alert,
  type AlertPage,
  type Audience,
  type ClubCard,
  type ClubMember,
  type Comment,
  type CommentPage,
  type Person,
  type PostCard,
  type ReplyPage,
} from '@baskyclub/shared';

import { ApiError, del, get, patch, post, uploadPhoto } from './api';
import { invalidate, isLoaded, load, peek, put, read, update } from './cache';
import { bump } from './store';

export type Scope = { scope: 'india' | 'district'; districtCode: string | null };

// Shapes coming from the API: packages/shared (the server is type-checked against the same types).

const opt = <T,>(v: T | null | undefined) => (v === null ? undefined : v);

function toUser(p: Person & Partial<{ bio: string | null; coverPhotoUrl: string | null; instagram: string | null; youtube: string | null }>): User {
  return {
    userId: p.id,
    name: p.name,
    email: '',
    dateOfBirth: '',
    status: 'active',
    avatarUrl: opt(p.photoUrl),
    coverUrl: opt(p.coverPhotoUrl),
    bio: opt(p.bio),
    instagram: opt(p.instagram),
    youtube: opt(p.youtube),
    createdAt: '',
  };
}

function toOrg(o: { id: string; name: string; shortName?: string | null; level?: string; pageStatus?: string; parentId?: string | null; stateCode?: string | null; logoUrl?: string | null }): Organization {
  return {
    id: o.id,
    name: o.name,
    shortName: opt(o.shortName),
    level: (o.level as Organization['level']) ?? 'district',
    pageStatus: (o.pageStatus as Organization['pageStatus']) ?? 'published',
    parentId: opt(o.parentId),
    stateCode: opt(o.stateCode),
    logoUrl: opt(o.logoUrl),
  };
}

// ── Places ────────────────────────────────────────────────────────────────
type Places = { states: { code: string; name: string; districtCount: number }[]; districts: District[]; byCode: Map<string, District> };
const EMPTY_PLACES: Places = { states: [], districts: [], byCode: new Map() };

async function fetchPlaces(): Promise<Places> {
  const r = await get<{ states: Places['states']; districts: { code: string; name: string; stateCode: string; altName: string | null; zoneCode: string | null; associationId: string | null }[] }>('/api/places');
  const districts: District[] = r.districts.map((d) => ({
    code: d.code,
    name: d.name,
    stateCode: d.stateCode,
    altNames: d.altName ? d.altName.split(/[;,/]/).map((s) => s.trim()).filter(Boolean) : undefined,
    zoneCode: opt(d.zoneCode),
    associationId: opt(d.associationId),
  }));
  return { states: r.states, districts, byCode: new Map(districts.map((d) => [d.code, d])) };
}
const places = () => read('places', fetchPlaces, EMPTY_PLACES);
export const loadPlaces = () => load('places', fetchPlaces);

export const getDistrict = (code?: string | null): District | undefined => (code ? places().byCode.get(code) : undefined);
export const getStateName = (code?: string) => places().states.find((s) => s.code === code)?.name;

export function getStates() {
  return places().states.map((s) => ({ code: s.code, name: s.name, count: s.districtCount }));
}

export const getDistrictsOfState = (stateCode: string) => places().districts.filter((d) => d.stateCode === stateCode);

/** Match a reverse-geocoded place name against district names and alt names. */
export function matchDistrict(candidates: (string | null | undefined)[]): District | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/district|\s+/g, '');
  const wanted = candidates.filter(Boolean).map((c) => norm(c!));
  return places().districts.find((d) => [d.name, ...(d.altNames ?? [])].some((n) => wanted.includes(norm(n))));
}

// ── Me ────────────────────────────────────────────────────────────────────
export type Me = User & {
  platformRoles: string[];
  isMinor: boolean;
  awaitingParent: boolean;
  /** Can post now (PRD §7: current/past club member or staff, account not limited). From the server. */
  canPost: boolean;
  orgMemberships: { organizationId: string; accessLevel: 'owner' | 'admin' | 'member'; organization: { name: string; level: string } }[];
  clubRoles: { id: string; clubId: string; role: 'owner' | 'admin' | 'captain' }[];
  creatorBadge: CreatorBadge;
};

/** Where the person stands with the Creator badge (server: badges.service creatorStatus). */
export type CreatorBadge =
  | { status: 'none' }
  | { status: 'requested' | 'active'; since: string; requestId: string }
  | { status: 'declined'; decidedAt: string; canAskFrom: string; note: string | null };

export async function fetchMe(): Promise<Me> {
  const m = await get<any>('/api/auth/me');
  return {
    userId: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    dateOfBirth: m.dateOfBirth,
    gender: opt(m.gender),
    status: m.status,
    homeDistrictCode: opt(m.homeDistrictCode),
    avatarUrl: opt(m.photoUrl),
    coverUrl: opt(m.coverPhotoUrl),
    bio: opt(m.bio),
    instagram: opt(m.instagram),
    youtube: opt(m.youtube),
    pinnedPostId: opt(m.pinnedPostId),
    createdAt: m.createdAt,
    platformRoles: m.platformRoles,
    isMinor: m.isMinor,
    awaitingParent: m.awaitingParent,
    canPost: !!m.canPost,
    orgMemberships: m.orgMemberships ?? [],
    clubRoles: m.clubRoles ?? [],
    creatorBadge: m.creatorBadge ?? { status: 'none' },
  };
}
export const getMe = () => peek<Me>('me');

let viewer: string | undefined;
/** The session tells the repository who is looking. */
export const setViewer = (id?: string) => {
  viewer = id;
};

export function getUser(id?: string | null): User | undefined {
  if (!id) return undefined;
  if (id === viewer) return getMe();
  return peek<ProfileData>(`profile:${id}`)?.user;
}

export const isPlatformStaff = (_userId?: string | null) => (getMe()?.platformRoles.length ?? 0) > 0;
export const isCreator = (userId?: string) => !!userId && !!peek<ProfileData>(`profile:${userId}`)?.creator;

export async function setHomeDistrict(_userId: string, districtCode: string) {
  try {
    await patch('/api/auth/me', { homeDistrictCode: districtCode });
    invalidate('me', `profile:${viewer}`);
  } catch {
    // keep the scope change on the phone even if saving fails
  }
}

// ── Posts (one shared copy of each post; lists keep ids) ───────────────────
export interface PostView extends Post {
  author?: User;
  club?: ClubSummary;
  organization?: Organization;
  authorIsCreator: boolean;
  liked: boolean;
  official: boolean; // pinned Official card from an announcement (#75)
  shareUrl?: string;
}

const postsById = new Map<string, PostView>();

function toPostView(p: PostCard): PostView {
  const images = p.media.filter((m) => m.mediaType === 'image');
  const media: PostMedia[] = p.media.map((m, i) => ({
    id: `${p.id}-m${i}`,
    postId: p.id,
    mediaType: m.mediaType,
    url: m.url,
    sortOrder: i,
    aspectRatio: m.width && m.height ? m.width / m.height : images.length ? 1 : undefined,
  }));
  return {
    postId: p.id,
    authorId: p.author.id,
    clubId: p.club?.id,
    orgId: p.organization?.id,
    districtCode: opt(p.districtCode),
    visibility: p.visibility,
    moderationStatus: p.moderationStatus,
    content: opt(p.content),
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    createdAt: p.createdAt,
    media,
    author: toUser(p.author),
    club: p.club ? ({ clubId: p.club.id, name: p.club.name, logoUrl: opt(p.club.logoUrl), kind: 'club', status: 'approved', createdAt: '', memberCount: 0, affiliated: false, verified: false } as ClubSummary) : undefined,
    organization: p.organization ? toOrg(p.organization) : undefined,
    authorIsCreator: p.author.isCreator,
    liked: p.likedByMe,
    official: p.isPinned,
    shareUrl: opt(p.shareUrl),
  };
}

function keep(cards: PostCard[]): string[] {
  return cards.map((c) => {
    const v = toPostView(c);
    postsById.set(v.postId, v);
    return v.postId;
  });
}
const posts = (ids: string[]) => ids.map((id) => postsById.get(id)).filter((p): p is PostView => !!p);

/** Feed: pinned Official cards first, then the newest posts. */
export function getFeed(s: Scope): PostView[] {
  const district = s.scope === 'district' && s.districtCode ? s.districtCode : null;
  const key = district ? `feed:district:${district}` : 'feed:all';
  const ids = read(key, async () => {
    const r = await get<{ pinned: PostCard[]; posts: PostCard[] }>(district ? `/api/feed?scope=district&districtCode=${district}&limit=30` : '/api/feed?limit=30');
    const pinned = keep(r.pinned ?? []);
    return [...pinned, ...keep(r.posts).filter((id) => !pinned.includes(id))];
  }, [] as string[]);
  return posts(ids);
}

export const refreshFeed = (s: Scope) => {
  const district = s.scope === 'district' && s.districtCode ? s.districtCode : null;
  invalidate(district ? `feed:district:${district}` : 'feed:all', 'alerts');
};

export function getPost(id: string): PostView | undefined {
  read(`post:${id}`, async () => keep([await get<PostCard>(`/api/posts/${id}`)])[0], undefined as string | undefined);
  return postsById.get(id);
}
export const isPostLoaded = (id: string) => postsById.has(id) || isLoaded(`post:${id}`);

function changePost(postId: string, change: (p: PostView) => Partial<PostView>) {
  const p = postsById.get(postId);
  if (p) {
    postsById.set(postId, { ...p, ...change(p) });
    bump();
  }
}

/** Instant heart; the server's count replaces it a moment later. */
export async function togglePostLike(postId: string, _userId: string) {
  const p = postsById.get(postId);
  if (!p) return;
  const liked = !p.liked;
  changePost(postId, (x) => ({ liked, likeCount: Math.max(0, x.likeCount + (liked ? 1 : -1)) }));
  try {
    const r = liked ? await post<{ likeCount: number }>(`/api/posts/${postId}/like`) : await del<{ likeCount: number }>(`/api/posts/${postId}/like`);
    changePost(postId, () => ({ liked, likeCount: r.likeCount }));
  } catch (e) {
    changePost(postId, (x) => ({ liked: !liked, likeCount: Math.max(0, x.likeCount + (liked ? -1 : 1)) }));
    throw e;
  }
}

export async function sharePost(postId: string) {
  try {
    const r = await post<{ shareUrl: string; shareCount: number }>(`/api/posts/${postId}/share`);
    return r.shareUrl;
  } catch {
    return postsById.get(postId)?.shareUrl;
  }
}

// ── Comments ──────────────────────────────────────────────────────────────
// Top-level comments load a page at a time (oldest first, like the server). Replies load
// only when someone opens them ("View N replies"), one request per opened thread.

export type CommentRow = PostComment & { user?: User };
export interface CommentView extends CommentRow {
  /** Visible replies on the server (what "View N replies" counts). */
  replyCount: number;
}
type Paged<T> = { items: T[]; nextCursor: string | null };

const COMMENTS_PAGE = 20;

function toComment(postId: string, c: Comment): CommentRow {
  return {
    id: c.id,
    postId,
    userId: c.user?.id ?? '',
    parentId: opt(c.parentId),
    content: c.content ?? '',
    createdAt: c.createdAt,
    deletedAt: c.isRemoved ? c.createdAt : undefined,
    user: c.user ? toUser(c.user) : undefined,
  };
}
const toCommentView = (postId: string, c: Comment): CommentView => ({ ...toComment(postId, c), replyCount: c.replyCount ?? 0 });

/** Union by id (newer copy wins), in the server's order: oldest first, then by id. */
function merge<T extends { id: string; createdAt: string }>(older: T[], newer: T[]): T[] {
  const byId = new Map(older.map((x) => [x.id, x]));
  for (const x of newer) byId.set(x.id, x);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/**
 * First page of a paged list. When the cache refreshes it, pages loaded with "load more"
 * are kept (merged), so a refresh never shrinks what the person is reading.
 */
function readPaged<T extends { id: string; createdAt: string }>(key: string, fetchFirst: () => Promise<Paged<T>>) {
  const page = read<Paged<T> | undefined>(
    key,
    async () => {
      const fresh = await fetchFirst();
      const old = peek<Paged<T>>(key);
      if (!old || old.items.length <= fresh.items.length) return fresh;
      return { items: merge(old.items, fresh.items), nextCursor: old.nextCursor };
    },
    undefined,
  );
  return { items: page?.items ?? [], hasMore: !!page?.nextCursor, loaded: isLoaded(key) };
}

const loadingMore = new Set<string>();
async function loadMorePaged<T extends { id: string; createdAt: string }>(key: string, fetchNext: (cursor: string) => Promise<Paged<T>>) {
  const page = peek<Paged<T>>(key);
  if (!page?.nextCursor || loadingMore.has(key)) return;
  loadingMore.add(key);
  try {
    const next = await fetchNext(page.nextCursor);
    const latest = peek<Paged<T>>(key) ?? page;
    put(key, { items: merge(latest.items, next.items), nextCursor: next.nextCursor });
  } finally {
    loadingMore.delete(key);
  }
}

const commentsKey = (postId: string) => `comments:${postId}`;
const repliesKey = (commentId: string) => `replies:${commentId}`;
const pageQuery = (cursor?: string) => `limit=${COMMENTS_PAGE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;

async function fetchComments(postId: string, cursor?: string): Promise<Paged<CommentView>> {
  const r = await get<CommentPage>(`/api/posts/${postId}/comments?${pageQuery(cursor)}`);
  return { items: r.comments.map((c) => toCommentView(postId, c)), nextCursor: r.nextCursor };
}
async function fetchReplies(postId: string, commentId: string, cursor?: string): Promise<Paged<CommentRow>> {
  const r = await get<ReplyPage>(`/api/comments/${commentId}/replies?${pageQuery(cursor)}`);
  return { items: r.replies.map((c) => toComment(postId, c)), nextCursor: r.nextCursor };
}

/** Top-level comments loaded so far, and whether there are more. */
export function getComments(postId: string): { comments: CommentView[]; hasMore: boolean } {
  const p = readPaged(commentsKey(postId), () => fetchComments(postId));
  return { comments: p.items, hasMore: p.hasMore };
}
export const loadMoreComments = (postId: string) => loadMorePaged(commentsKey(postId), (cursor) => fetchComments(postId, cursor));

/** Replies to one top-level comment; the first call starts loading them. */
export function getReplies(postId: string, commentId: string): { replies: CommentRow[]; hasMore: boolean; loaded: boolean } {
  const p = readPaged(repliesKey(commentId), () => fetchReplies(postId, commentId));
  return { replies: p.items, hasMore: p.hasMore, loaded: p.loaded };
}
export const loadMoreReplies = (postId: string, commentId: string) =>
  loadMorePaged(repliesKey(commentId), (cursor) => fetchReplies(postId, commentId, cursor));

function changeComments(postId: string, change: (items: CommentView[]) => CommentView[]) {
  update<Paged<CommentView>>(commentsKey(postId), (p) => ({ ...p, items: change(p.items) }));
}
function changeReplies(commentId: string, change: (items: CommentRow[]) => CommentRow[]) {
  update<Paged<CommentRow>>(repliesKey(commentId), (p) => ({ ...p, items: change(p.items) }));
}

async function refreshPost(postId: string) {
  try {
    keep([await get<PostCard>(`/api/posts/${postId}`)]);
    bump();
  } catch {
    // ignore
  }
}

/**
 * Adds the server's copy of the new comment to what's on screen (no list refetch).
 * A reply to a reply attaches to the same top-level comment (the server keeps one level).
 */
export async function addComment(postId: string, _userId: string, content: string, replyTo?: PostComment) {
  const created = await post<Comment>(`/api/posts/${postId}/comments`, { content, ...(replyTo ? { parentId: replyTo.id } : {}) });
  const topId = created.parentId;
  if (topId) {
    changeComments(postId, (items) => items.map((c) => (c.id === topId ? { ...c, replyCount: c.replyCount + 1 } : c)));
    changeReplies(topId, (items) => merge(items, [toComment(postId, created)]));
  } else {
    changeComments(postId, (items) => merge(items, [toCommentView(postId, created)]));
  }
  await refreshPost(postId);
}

/**
 * Same rules as the server's lists: a removed reply disappears; a removed top-level comment
 * stays as "Comment removed" only while it has replies.
 */
export async function deleteComment(postId: string, comment: CommentRow) {
  await del(`/api/comments/${comment.id}`);
  const topId = comment.parentId;
  if (topId) {
    changeReplies(topId, (items) => items.filter((r) => r.id !== comment.id));
    changeComments(postId, (items) => items.map((c) => (c.id === topId ? { ...c, replyCount: Math.max(0, c.replyCount - 1) } : c)));
  } else {
    changeComments(postId, (items) =>
      items.flatMap((c) => {
        if (c.id !== comment.id) return [c];
        return c.replyCount > 0 ? [{ ...c, content: '', user: undefined, userId: '', deletedAt: new Date().toISOString() }] : [];
      }),
    );
  }
  await refreshPost(postId);
}

export async function createPost(input: { userId: string; clubId?: string; content: string; visibility: Visibility; images: { uri: string; ratio: number }[]; youtube?: string }) {
  const images = [];
  for (const im of input.images) {
    const url = /^https?:\/\//.test(im.uri) ? im.uri : await uploadPhoto(im.uri);
    images.push({ url, width: Math.round(1000 * im.ratio), height: 1000 });
  }
  const created = await post<PostCard>('/api/posts', {
    content: input.content || undefined,
    clubId: input.clubId,
    visibility: input.clubId ? input.visibility : 'public',
    images,
    youtubeUrl: input.youtube,
  });
  keep([created]);
  invalidate('feed:', `profile:${input.userId}`, 'userposts:', ...(input.clubId ? [`club:posts:${input.clubId}`] : []));
  return { postId: created.id, moderationStatus: created.moderationStatus };
}

// ── Follows (#73) ─────────────────────────────────────────────────────────
type Follows = Set<string>;
const followKey = (t: Follow['targetType'], id: string) => `${t}:${id}`;

function follows(): Follows {
  if (!viewer) return new Set();
  return read('follows', async () => {
    const r = await get<{ users: { id: string }[]; clubs: { id: string }[]; organizations: { id: string }[] }>('/api/follows');
    return new Set([...r.users.map((x) => followKey('user', x.id)), ...r.clubs.map((x) => followKey('club', x.id)), ...r.organizations.map((x) => followKey('organization', x.id))]);
  }, new Set<string>());
}

export const isFollowing = (viewerId: string | undefined, targetType: Follow['targetType'], targetId: string) =>
  !!viewerId && follows().has(followKey(targetType, targetId));

export async function toggleFollow(_viewerId: string, targetType: Follow['targetType'], targetId: string) {
  const k = followKey(targetType, targetId);
  const on = follows().has(k);
  update<Follows>('follows', (s) => {
    const n = new Set(s);
    if (on) n.delete(k);
    else n.add(k);
    return n;
  });
  try {
    if (on) await del(`/api/follows?targetType=${targetType}&targetId=${targetId}`);
    else await post('/api/follows', { targetType, targetId });
  } finally {
    invalidate('follows', `club:detail:${targetId}`, `org:detail:${targetId}`, `profile:${targetId}`, `profile:${viewer}`, 'feed:', 'alerts');
  }
}

// ── Associations ──────────────────────────────────────────────────────────
function orgList(): Map<string, Organization> {
  return read('orgs', async () => {
    const r = await get<{ associations: any[] }>('/api/associations?limit=50');
    return new Map(r.associations.map((o) => [o.id, toOrg(o)]));
  }, new Map<string, Organization>());
}

export const getOrganization = (id?: string): Organization | undefined => (id ? orgList().get(id) : undefined);

/** Draft pages never reach the app unless you're allowed to see them (#59). */
export const canSeeOrg = (o: Organization | undefined, _viewerId?: string | null) => !!o;

export const getAssociationForDistrict = (code?: string | null) => getOrganization(getDistrict(code)?.associationId);

const youtubeThumb = (url: string) => youtubeThumbnail(url) ?? undefined;

export function getAssociationDetail(id: string, _viewerId?: string | null) {
  const d = read<any>(`org:detail:${id}`, () => get(`/api/associations/${id}`), undefined);
  const bearers = read<any[]>(`org:bearers:${id}`, async () => (await get(`/api/associations/${id}/office-bearers?past=1`)).officeBearers, []);
  const legacy = read<any[]>(`org:legacy:${id}`, async () => (await get(`/api/associations/${id}/legacy`)).records, []);
  const postIds = read(`org:posts:${id}`, async () => keep((await get<{ posts: PostCard[] }>(`/api/associations/${id}/posts`)).posts), [] as string[]);
  if (!d) return undefined;
  const toBearer = (b: any) => ({ id: b.id, orgId: id, name: b.name, userId: opt(b.userId), title: b.designation, startDate: b.termFrom, endDate: opt(b.termTo) });
  return {
    org: toOrg(d),
    parent: d.parent ? toOrg(d.parent) : undefined,
    children: (d.children as any[]).map(toOrg),
    coveredDistricts: (d.coveredDistricts as any[]).map((x) => ({ code: x.code, name: x.name, stateCode: d.stateCode ?? '' }) as District),
    officeBearers: bearers.filter((b) => b.isCurrent).map(toBearer),
    pastOfficeBearers: bearers.filter((b) => !b.isCurrent).map(toBearer),
    legacy: legacy.map((r) => ({
      id: r.id,
      orgId: id,
      year: r.year ?? new Date(r.createdAt).getFullYear(),
      title: r.title,
      body: [r.body, r.winner && `Winner: ${r.winner}`, r.runnerUp && `Runner-up: ${r.runnerUp}`].filter(Boolean).join('\n') || undefined,
      media: (r.media as any[]).map((m, i) => ({ id: `${r.id}-${i}`, recordId: r.id, url: m.mediaType === 'youtube' ? youtubeThumb(m.url) : m.url, caption: m.mediaType === 'youtube' ? 'Video on YouTube' : undefined })),
    })),
    clubs: (d.affiliatedClubs as any[]).map((cl) => ({ clubId: cl.id, name: cl.name, kind: cl.kind, status: 'approved', districtCode: cl.districtCode, districtName: getDistrict(cl.districtCode)?.name, logoUrl: opt(cl.logoUrl), createdAt: '', memberCount: 0, affiliated: true, verified: false }) as ClubSummary),
    posts: posts(postIds),
    followers: d.followerCount as number,
    viewer: d.viewer as { isFollowing: boolean; accessLevel: string | null; canManage: boolean; canPostOfficially: boolean },
  };
}

// ── Clubs ─────────────────────────────────────────────────────────────────
export interface ClubSummary extends Club {
  districtName?: string;
  memberCount: number;
  affiliated: boolean;
  verified: boolean;
  association?: Organization;
}

function toClubSummary(c: ClubCard & Partial<{ description: string | null; motto: string | null; bannerUrl: string | null; createdAt: string }>): ClubSummary {
  return {
    clubId: c.id,
    name: c.name,
    kind: c.kind,
    status: c.status,
    districtCode: c.districtCode,
    districtName: c.districtName ?? getDistrict(c.districtCode)?.name,
    logoUrl: opt(c.logoUrl),
    latitude: opt(c.latitude),
    longitude: opt(c.longitude),
    description: opt(c.description),
    motto: opt(c.motto),
    bannerUrl: opt(c.bannerUrl),
    createdAt: c.createdAt ?? '',
    memberCount: c.memberCount,
    affiliated: !!c.affiliatedTo,
    verified: c.isVerified,
    association: c.affiliatedTo ? toOrg({ ...c.affiliatedTo, level: 'district', pageStatus: 'claimed' }) : undefined,
  };
}

export type ClubFilter = 'all' | 'affiliated' | 'community' | 'academy';

export function getClubs(s: Scope, filter: ClubFilter, query = ''): ClubSummary[] {
  const district = s.scope === 'district' && s.districtCode ? s.districtCode : '';
  const q = query.trim();
  const params = new URLSearchParams({ limit: '50', ...(district ? { districtCode: district } : {}), ...(q ? { q } : {}), ...(filter === 'academy' ? { kind: 'academy' } : {}) });
  const list = read(`clubs:${params}`, async () => (await get<{ clubs: ClubCard[] }>(`/api/clubs?${params}`)).clubs.map(toClubSummary), [] as ClubSummary[]);
  return list.filter((c) => {
    if (filter === 'affiliated') return c.kind === 'club' && c.affiliated;
    if (filter === 'community') return c.kind === 'club' && !c.affiliated;
    return true;
  });
}

type ClubPage = ClubCard & {
  description: string | null; motto: string | null; bannerUrl: string | null; createdAt: string; followerCount: number;
  staff: { roleId: string; role: 'owner' | 'admin' | 'captain'; id: string; name: string; photoUrl: string | null }[];
  coaches: { id: string; name: string; role: 'head' | 'assistant'; userId: string | null }[];
  viewer: { isFollowing: boolean; membership: { id: string; status: 'pending' | 'active'; isPlayer: boolean; primaryPosition: Position | null } | null; isOwner: boolean; isAdmin: boolean; canManage: boolean };
};

const clubPage = (clubId: string) => read<ClubPage | undefined>(`club:detail:${clubId}`, () => get(`/api/clubs/${clubId}`), undefined);
/** Raw club page from the API (staff with role ids, viewer powers) — for manage screens. */
export const getClubRaw = clubPage;
export type { ClubPage };
/** Raw member rows (membership ids, roles) — for manage screens. */
export const getClubMembersRaw = (clubId: string) =>
  read(`club:members:${clubId}`, async () => (await get<{ members: ClubMember[] }>(`/api/clubs/${clubId}/members?limit=50`)).members, [] as ClubMember[]);
/** Raw association page (viewer powers, covered districts). */
export const getOrgRaw = (id: string) => read<any>(`org:detail:${id}`, () => get(`/api/associations/${id}`), undefined);

function membershipFrom(clubId: string, userId: string, m: { id: string; status: string; isPlayer: boolean; primaryPosition: Position | null }): ClubMembership {
  return { id: m.id, clubId, userId, status: m.status as ClubMembership['status'], isPlayer: m.isPlayer, primaryPosition: opt(m.primaryPosition), requestedAt: '' };
}

export const getMembership = (clubId: string, userId?: string | null) => {
  const m = userId ? clubPage(clubId)?.viewer.membership : null;
  return m && m.status === 'active' ? membershipFrom(clubId, userId!, m) : undefined;
};

export const getPendingMembership = (clubId: string, userId?: string | null) => {
  const m = userId ? clubPage(clubId)?.viewer.membership : null;
  return m && m.status === 'pending' ? membershipFrom(clubId, userId!, m) : undefined;
};

export const canManageClub = (clubId: string, userId?: string | null) => !!userId && !!clubPage(clubId)?.viewer.canManage;

export function getMyClubs(userId?: string | null): (ClubSummary & { membership: ClubMembership })[] {
  if (!userId) return [];
  return getProfile(userId)?.clubs ?? [];
}

export function getClubDetail(clubId: string, _viewerId?: string | null) {
  const c = clubPage(clubId);
  const members = read(`club:members:${clubId}`, async () => (await get<{ members: ClubMember[] }>(`/api/clubs/${clubId}/members?limit=50`)).members, [] as ClubMember[]);
  const postIds = read(`club:posts:${clubId}`, async () => keep((await get<{ posts: PostCard[] }>(`/api/clubs/${clubId}/posts?limit=30`)).posts), [] as string[]);
  if (!c) return undefined;
  const club = toClubSummary(c);
  const staff = (role: string) => c.staff.filter((s) => s.role === role).map((s) => toUser(s));
  const row = (m: ClubMember) => ({ user: toUser(m.user), membership: membershipFrom(clubId, m.user.id, { ...m, status: 'active' }), roles: m.roles as ('owner' | 'admin' | 'captain')[] });
  return {
    club,
    affiliation: c.affiliatedTo
      ? ({ id: '', clubId, orgId: c.affiliatedTo.id, tnbaNumber: opt(c.affiliatedTo.tnbaNumber), validUntil: opt(c.affiliatedTo.validUntil), status: 'active', startedBy: 'club' } as Affiliation)
      : undefined,
    owners: staff('owner'),
    admins: staff('admin'),
    captain: staff('captain')[0],
    coaches: c.coaches.map((co) => ({ id: co.id, clubId, name: co.name, role: co.role, userId: opt(co.userId) })),
    // "Plays for the club" = active membership with player ticked + position
    players: members.filter((m) => m.isPlayer).map(row),
    others: members.filter((m) => !m.isPlayer).map(row),
    posts: posts(postIds),
    followers: c.followerCount,
    coveringAssociation: getAssociationForDistrict(c.districtCode),
  };
}

const refreshClub = (clubId: string) => invalidate(`club:detail:${clubId}`, `club:members:${clubId}`, `club:requests:${clubId}`, `club:posts:${clubId}`, 'clubs:', `profile:${viewer}`);

/** "Join" creates a pending membership (#63). */
export async function requestToJoin(clubId: string, _userId: string) {
  try {
    await post(`/api/clubs/${clubId}/join`, { isPlayer: true });
  } finally {
    refreshClub(clubId);
  }
}

export async function cancelJoinRequest(clubId: string, _userId: string) {
  try {
    await del(`/api/clubs/${clubId}/join`);
  } finally {
    refreshClub(clubId);
  }
}

export function getJoinRequests(clubId: string) {
  if (!canManageClub(clubId, viewer)) return [];
  return read(`club:requests:${clubId}`, async () => (await get<{ requests: { id: string; requestedAt: string; isPlayer: boolean; primaryPosition: Position | null; user: Person }[] }>(`/api/clubs/${clubId}/requests`)).requests, []).map((r) => ({
    ...membershipFrom(clubId, r.user.id, { ...r, status: 'pending' }),
    requestedAt: r.requestedAt,
    user: toUser(r.user),
  }));
}

export async function answerJoinRequest(membershipId: string, accept: boolean, position?: Position) {
  await post(`/api/memberships/${membershipId}/${accept ? 'approve' : 'reject'}`);
  if (accept && position) await patch(`/api/memberships/${membershipId}`, { primaryPosition: position }).catch(() => {});
  invalidate('club:', 'clubs:');
}

// ── Alerts: announcements (#65, #75) and replies to your comments (PRD §6) ──
export interface AlertView {
  id: string;
  kind: Alert['type'];
  title: string;
  body: string;
  /** Announcements only. */
  audience?: Audience;
  /** The post a tap opens. */
  postId?: string;
  createdAt: string;
  senderName: string;
  senderKind: 'association' | 'club' | 'basky' | 'user';
}

export function getAlerts(userId?: string | null): AlertView[] {
  if (!userId) return [];
  return read('alerts', async () => {
    const r = await get<AlertPage>('/api/alerts?limit=50');
    return r.alerts.map(
      (a): AlertView => ({
        id: a.id,
        kind: a.type,
        title: a.title,
        body: a.body,
        audience: opt(a.audience),
        postId: opt(a.postId),
        createdAt: a.sentAt,
        senderName: a.from.type === 'basky' ? 'BaskyCLub team' : a.from.name,
        senderKind: a.from.type === 'organization' ? 'association' : a.from.type,
      }),
    );
  }, [] as AlertView[]);
}

// ── Profiles (#72) ────────────────────────────────────────────────────────
type ProfileData = {
  user: User;
  minor: boolean;
  creator: boolean;
  district?: District;
  clubs: (ClubSummary & { membership: ClubMembership })[];
  pinned?: PostView;
  posts: PostView[];
  followers: number;
  following: number;
  viewerIsFollowing: boolean;
};

export function getProfile(userId: string): ProfileData | undefined {
  const p = read<any>(`profile:${userId}`, () => get(`/api/users/${userId}`), undefined);
  const postIds = read(`userposts:${userId}`, async () => keep((await get<{ posts: PostCard[] }>(`/api/users/${userId}/posts?limit=30`)).posts), [] as string[]);
  if (!p) return undefined;
  const pinnedId: string | undefined = p.pinnedPost?.id;
  if (p.pinnedPost) keep([p.pinnedPost]);
  return {
    user: toUser(p),
    minor: false, // the server already hides Instagram/YouTube for under-18s
    creator: p.isCreator,
    district: p.homeDistrict ? (getDistrict(p.homeDistrict.code) ?? ({ code: p.homeDistrict.code, name: p.homeDistrict.name, stateCode: '' } as District)) : undefined,
    clubs: (p.clubs as any[]).map((cl) => ({
      clubId: cl.id,
      name: cl.name,
      kind: cl.kind,
      status: 'approved',
      districtCode: cl.districtCode,
      districtName: getDistrict(cl.districtCode)?.name,
      logoUrl: opt(cl.logoUrl),
      createdAt: '',
      memberCount: 0,
      affiliated: !!cl.affiliatedTo,
      verified: !!cl.isVerified,
      association: cl.affiliatedTo ? toOrg(cl.affiliatedTo) : undefined,
      membership: { id: cl.membershipId, clubId: cl.id, userId, status: 'active', isPlayer: cl.isPlayer, primaryPosition: opt(cl.position), requestedAt: '' },
    })),
    pinned: pinnedId ? postsById.get(pinnedId) : undefined,
    posts: posts(postIds).filter((x) => x.postId !== pinnedId),
    followers: p.followerCount,
    following: p.followingCount,
    viewerIsFollowing: p.viewer?.isFollowing ?? false,
  };
}

export { ApiError };
