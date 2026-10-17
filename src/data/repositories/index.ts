/**
 * Repositories: the only place screens get data from.
 * Today they read mock data. Later each function becomes a fetch() to the
 * Next.js API with the same return type, and no screen has to change.
 */
import * as db from '@/data/mock';
import type { Club, Match, Organization, Post, PlayerStat, Team, User, ClubMembership, Position } from '@/types/models';

const resolve = <T,>(value: T): Promise<T> => Promise.resolve(value);

export const CURRENT_USER_ID = 'u-roshan';

// ── View models (joined data the screens need) ────────────────────────────

export interface PostView extends Post {
  author?: User;
  club?: Club;
  organization?: Organization;
}

export interface ClubSummary extends Club {
  districtName?: string;
  memberCount: number;
  teamCount: number;
}

export interface MemberView {
  user: User;
  membership: ClubMembership;
  role: string;
}

export interface ClubDetail extends ClubSummary {
  organization?: Organization;
  members: MemberView[];
  teams: Team[];
  highlights: PostView[];
}

export interface MatchView extends Match {
  teamA: Team;
  teamB: Team;
  tournamentName?: string;
}

export interface PlayerProfile {
  user: User;
  club?: Club;
  position?: Position;
  districtName?: string;
  stats?: PlayerStat;
  posts: PostView[];
  matches: MatchView[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

const byId = <T, K extends keyof T>(list: T[], key: K, id: T[K]) => list.find((x) => x[key] === id);

function toPostView(p: Post): PostView {
  return {
    ...p,
    author: p.userId ? byId(db.users, 'userId', p.userId) : undefined,
    club: p.clubId ? byId(db.clubs, 'clubId', p.clubId) : undefined,
    organization: p.organizationId ? byId(db.organizations, 'id', p.organizationId) : undefined,
  };
}

function toClubSummary(c: Club): ClubSummary {
  return {
    ...c,
    districtName: c.districtCode ? byId(db.districts, 'code', c.districtCode)?.name : undefined,
    memberCount: db.memberships.filter((m) => m.clubId === c.clubId && m.status === 'active').length,
    teamCount: db.teams.filter((t) => t.clubId === c.clubId).length,
  };
}

function toMatchView(mt: Match): MatchView {
  return {
    ...mt,
    teamA: byId(db.teams, 'teamId', mt.teamAId)!,
    teamB: byId(db.teams, 'teamId', mt.teamBId)!,
    tournamentName: mt.tournamentId ? byId(db.tournaments, 'id', mt.tournamentId)?.name : undefined,
  };
}

function roleLabel(m: ClubMembership): string {
  if (m.isOwner) return 'Owner';
  if (m.isCoach) return 'Coach';
  if (m.isAdmin) return 'Admin';
  return m.position ?? 'Player';
}

// ── Public API ────────────────────────────────────────────────────────────

export type FeedFilter = 'all' | 'official' | 'clubs' | 'creators' | 'achievements';

export function getFeed(filter: FeedFilter = 'all'): Promise<PostView[]> {
  const visible = db.posts.filter((p) => p.status === 'published').map(toPostView);
  const filtered = visible.filter((p) => {
    switch (filter) {
      case 'official': return p.type === 'official';
      case 'clubs': return p.club?.kind === 'sports';
      case 'creators': return p.club?.kind === 'creator';
      case 'achievements': return p.type === 'achievement';
      default: return true;
    }
  });
  // Official pinned posts first, then newest.
  filtered.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.localeCompare(a.createdAt));
  return resolve(filtered);
}

export function getClubs(query = ''): Promise<ClubSummary[]> {
  const q = query.trim().toLowerCase();
  const list = db.clubs
    .filter((c) => c.status === 'approved')
    .map(toClubSummary)
    .filter((c) => !q || c.clubName.toLowerCase().includes(q) || c.districtName?.toLowerCase().includes(q));
  return resolve(list);
}

export function getClub(clubId: string): Promise<ClubDetail | undefined> {
  const c = byId(db.clubs, 'clubId', clubId);
  if (!c) return resolve(undefined);
  const members = db.memberships
    .filter((m) => m.clubId === clubId && m.status === 'active')
    .map((m) => ({ user: byId(db.users, 'userId', m.userId)!, membership: m, role: roleLabel(m) }));
  return resolve({
    ...toClubSummary(c),
    organization: c.organizationId ? byId(db.organizations, 'id', c.organizationId) : undefined,
    members,
    teams: db.teams.filter((t) => t.clubId === clubId),
    highlights: db.posts.filter((p) => p.clubId === clubId && p.showOnClubPage).map(toPostView),
  });
}

export type MatchFilter = 'live' | 'upcoming' | 'results';

export function getMatches(filter: MatchFilter): Promise<MatchView[]> {
  const status = filter === 'live' ? 'live' : filter === 'upcoming' ? 'scheduled' : 'completed';
  const list = db.matches.filter((x) => x.status === status).map(toMatchView);
  list.sort((a, b) => (filter === 'results' ? b.scheduledAt.localeCompare(a.scheduledAt) : a.scheduledAt.localeCompare(b.scheduledAt)));
  return resolve(list);
}

export function getPlayer(userId: string): Promise<PlayerProfile | undefined> {
  const user = byId(db.users, 'userId', userId);
  if (!user) return resolve(undefined);
  const membership = db.memberships.find((m) => m.userId === userId && m.status === 'active' && m.isPlayer)
    ?? db.memberships.find((m) => m.userId === userId && m.status === 'active');
  const club = membership ? byId(db.clubs, 'clubId', membership.clubId) : undefined;
  const clubTeamIds = new Set(db.teams.filter((t) => t.clubId === club?.clubId).map((t) => t.teamId));
  return resolve({
    user,
    club,
    position: membership?.position,
    districtName: club?.districtCode ? byId(db.districts, 'code', club.districtCode)?.name : undefined,
    stats: byId(db.playerStats, 'userId', userId),
    posts: db.posts.filter((p) => p.userId === userId).map(toPostView),
    matches: db.matches
      .filter((x) => x.status === 'completed' && (clubTeamIds.has(x.teamAId) || clubTeamIds.has(x.teamBId)))
      .map(toMatchView),
  });
}
