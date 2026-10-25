/**
 * Types mirror the BaskyCLub Database Guide (tables + column names).
 * Fields marked "PROPOSAL" come from APP_NAV_STRUCTURE.md section 9 and are not
 * decided yet — they exist only in mock data until the database chat adds them.
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
  isSuperAdmin?: boolean;
  homeDistrictCode?: string; // PROPOSAL users.home_district_code
  avatarUrl?: string;
  createdAt: ISODate;
}

/** districts (natural key: code) */
export interface District {
  code: string;
  name: string;
  altNames?: string[]; // spellings used by reverse geocoding
  stateCode: string;
  stateName: string;
  basketballAssociationId?: UUID; // PROPOSAL districts.basketball_association_id
}

/** organizations — association tree */
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
  /** Placeholder page until the real body claims it. */
  isPlaceholder: boolean;
}

export type ClubCategory = 'community' | 'affiliated' | 'academy'; // PROPOSAL club kind

/** clubs */
export interface Club {
  clubId: UUID;
  clubName: string;
  category: ClubCategory;
  organizationId?: UUID; // set once affiliated
  districtCode?: string;
  chairpersonUserId?: UUID;
  captainUserId?: UUID;
  teamMotto?: string;
  description?: string;
  isVerified: boolean; // academies: "Verified by BaskyCLub"
  status: 'pending' | 'approved' | 'rejected';
  bannerImageUrl?: string;
  logoUrl?: string;
  createdAt: ISODate;
}

/** PROPOSAL club_affiliations */
export interface ClubAffiliation {
  clubId: UUID;
  organizationId: UUID;
  tnbaMembershipNumber: string;
  validUntil: ISODate;
  status: 'pending' | 'active' | 'expired';
}

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

/** club_management */
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
}

/** coach_details */
export interface CoachDetail {
  id: UUID;
  clubId: UUID;
  userId?: UUID;
  name: string;
  role: 'head' | 'assistant';
}

/** PROPOSAL club_join_requests */
export interface JoinRequest {
  id: UUID;
  clubId: UUID;
  userId: UUID;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: ISODate;
}

/** PROPOSAL affiliation_invites */
export interface AffiliationInvite {
  id: UUID;
  clubId: UUID;
  organizationId: UUID;
  direction: 'association_to_club' | 'club_to_association';
  tnbaMembershipNumber?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: ISODate;
}

/** tournaments — Phase 1: read-only listings added by the Basky team */
export interface Tournament {
  id: UUID;
  name: string;
  gameSize: '3v3' | '5v5';
  districtCode?: string;
  location?: string;
  organizerOrgId?: UUID;
  startDate: ISODate;
  endDate: ISODate;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface MatchSide {
  name: string;
  playerIds: UUID[];
}

/** matches — match rooms (tournament / friendly / practice) */
export interface Match {
  id: UUID;
  category: 'tournament' | 'friendly' | 'practice';
  tournamentId?: UUID;
  districtCode?: string;
  createdByUserId: UUID;
  scorerUserId: UUID; // only this device scores; can be handed over
  sideA: MatchSide;
  sideB: MatchSide;
  scoreA: number;
  scoreB: number;
  status: 'scheduled' | 'live' | 'completed';
  quarter: number;
  venueText?: string;
  scheduledAt: ISODate;
}

/** player_stats */
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
  aspectRatio: number;
}

export interface PostComment {
  id: UUID;
  postId: UUID;
  userId: UUID;
  content: string;
  createdAt: ISODate;
}

export interface Post {
  postId: UUID;
  clubId?: UUID;
  organizationId?: UUID;
  userId?: UUID;
  districtCode?: string; // PROPOSAL posts.district_code (auto-filled)
  type: 'achievement' | 'highlight' | 'official' | 'general';
  content?: string;
  isPinned: boolean;
  status: 'published' | 'pending_review' | 'hidden';
  createdAt: ISODate;
  media: PostMedia[];
  likeCount: number;
}
