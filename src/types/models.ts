/**
 * Types mirror the BaskyCLub Database Guide (tables + column names).
 * Only decided columns are included. When the API is ready, these stay the same
 * and the repositories switch from mock data to fetch calls.
 */

export type UUID = string;
export type ISODate = string;

/** users */
export interface User {
  userId: UUID;
  name: string;
  email: string;
  phone?: string; // +91XXXXXXXXXX
  dateOfBirth?: ISODate;
  gender?: 'male' | 'female';
  avatarUrl?: string; // not in schema yet — mock only, falls back to initials
  createdAt: ISODate;
}

/** districts (natural key: code) */
export interface District {
  code: string; // e.g. TN-CHN
  name: string;
  stateCode: string;
  stateName: string;
}

/** organizations */
export interface Organization {
  id: UUID;
  name: string;
  shortName?: string;
  level: 'district' | 'state' | 'national';
  parentId?: UUID;
  stateCode?: string;
  districtCode?: string;
  logoUrl?: string;
  isPartner: boolean;
}

/** clubs */
export interface Club {
  clubId: UUID;
  clubName: string;
  kind: 'sports' | 'creator';
  organizationId?: UUID;
  districtCode?: string;
  teamMotto?: string;
  description?: string;
  isVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  bannerImageUrl?: string;
  logoUrl?: string;
  createdAt: ISODate;
}

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

/** club_management — one person's membership in one club */
export interface ClubMembership {
  id: UUID;
  clubId: UUID;
  userId: UUID;
  isOwner: boolean;
  isAdmin: boolean;
  isCoach: boolean;
  isPlayer: boolean;
  status: 'pending' | 'active' | 'left' | 'removed' | 'rejected';
  position?: Position;
  joinedAt: ISODate;
  leftAt?: ISODate;
}

/** teams */
export interface Team {
  teamId: UUID;
  clubId?: UUID;
  teamName?: string;
  gameSize: '3v3' | '5v5';
  ageCategory?: string;
  gender?: 'men' | 'women' | 'mixed';
}

/** tournaments */
export interface Tournament {
  id: UUID;
  name: string;
  gameSize: '3v3' | '5v5';
  location?: string;
  startDate: ISODate;
  endDate: ISODate;
  status: 'upcoming' | 'ongoing' | 'completed';
}

/**
 * matches. `category` follows the handoff (tournament / friendly / practice);
 * friendly match rooms are still being designed, so tournamentId is optional here.
 */
export interface Match {
  id: UUID;
  tournamentId?: UUID;
  category: 'tournament' | 'friendly' | 'practice';
  teamAId: UUID;
  teamBId: UUID;
  scoreA: number;
  scoreB: number;
  status: 'scheduled' | 'live' | 'completed';
  quarter?: number;
  venueText?: string;
  scheduledAt: ISODate;
  winnerId?: UUID;
}

/** player_stats — career totals, one row per user */
export interface PlayerStat {
  userId: UUID;
  matchesPlayed: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
}

/** posts + post_media */
export interface PostMedia {
  id: UUID;
  postId: UUID;
  url?: string;
  type: 'image' | 'video';
  sortOrder: number;
  aspectRatio: number; // width / height, reserves space before load
}

export interface Post {
  postId: UUID;
  clubId?: UUID;
  organizationId?: UUID;
  userId?: UUID;
  type: 'achievement' | 'highlight' | 'official' | 'general';
  content?: string;
  isPinned: boolean;
  showOnClubPage: boolean;
  status: 'published' | 'pending_review' | 'hidden';
  createdAt: ISODate;
  media: PostMedia[];
  likeCount: number; // computed from post_likes
  commentCount: number; // computed from post_comments
}
