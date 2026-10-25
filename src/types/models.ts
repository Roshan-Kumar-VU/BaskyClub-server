/**
 * Types mirror the approved Phase 1 schema (project doc SCHEMA_PHASE1.md,
 * baskyclub-server/prisma/schema.prisma). String values are the exact ones in
 * section 3 of that doc. Fields marked MOCK are not columns — they only help
 * the sample data and must be checked with the database chat before the API.
 */

export type UUID = string;
export type ISODate = string;

// ── People ────────────────────────────────────────────────────────────────
export type UserStatus = 'active' | 'limited' | 'suspended' | 'deleted';

/** users — email, phone and date of birth are never shown publicly (#72). */
export interface User {
  userId: UUID;
  name: string;
  email: string;
  phone?: string; // +91XXXXXXXXXX
  dateOfBirth: ISODate;
  gender?: 'male' | 'female';
  status: UserStatus;
  homeDistrictCode?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  instagram?: string; // hidden for under-18 users
  youtube?: string; // hidden for under-18 users
  pinnedPostId?: UUID;
  createdAt: ISODate;
}

/** platform_roles */
export interface PlatformRole {
  userId: UUID;
  role: 'super_admin' | 'basky_admin' | 'moderator';
}

// ── Places ────────────────────────────────────────────────────────────────
/** states */
export interface State {
  code: string; // e.g. TN
  name: string;
}

/** districts — code format TN-VELLORE */
export interface District {
  code: string;
  name: string;
  altNames?: string[];
  stateCode: string;
  zoneCode?: string; // e.g. TN-Z-VLR
  associationId?: UUID; // which association covers this district (#61)
}

/** zones */
export interface Zone {
  code: string;
  name: string;
  stateCode: string;
}

// ── Organisations ─────────────────────────────────────────────────────────
export type OrgLevel = 'national' | 'state' | 'district' | 'league_operator';
export type PageStatus = 'draft' | 'published' | 'claimed';

/** organizations */
export interface Organization {
  id: UUID;
  name: string;
  shortName?: string;
  level: OrgLevel;
  parentId?: UUID;
  stateCode?: string;
  pageStatus: PageStatus;
  logoUrl?: string;
  about?: string;
}

/** organization_members */
export interface OrganizationMember {
  orgId: UUID;
  userId: UUID;
  accessLevel: 'owner' | 'admin' | 'member';
}

/** office_bearers — dated terms */
export interface OfficeBearer {
  id: UUID;
  orgId: UUID;
  name: string;
  userId?: UUID;
  title: string;
  startDate: ISODate;
  endDate?: ISODate;
}

/** legacy_records + legacy_media — the association's Media / Legacy section (#66) */
export interface LegacyMedia {
  id: UUID;
  recordId: UUID;
  url?: string;
  caption?: string;
}

export interface LegacyRecord {
  id: UUID;
  orgId: UUID;
  year: number;
  title: string;
  body?: string;
  media: LegacyMedia[];
}

// ── Clubs ─────────────────────────────────────────────────────────────────
export type ClubKind = 'club' | 'academy' | 'creator_group' | 'franchise';
export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

/** clubs — "affiliated" is never stored here (#58) */
export interface Club {
  clubId: UUID;
  name: string;
  kind: ClubKind;
  status: 'pending' | 'approved' | 'suspended';
  districtCode?: string;
  motto?: string;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: ISODate;
}

/** club_memberships — a join request is the pending start of this row (#63) */
export interface ClubMembership {
  id: UUID;
  clubId: UUID;
  userId: UUID;
  status: 'pending' | 'active' | 'left' | 'removed' | 'rejected';
  isPlayer: boolean;
  primaryPosition?: Position;
  requestedAt: ISODate;
  joinedAt?: ISODate;
  endedAt?: ISODate;
}

/** club_roles — dated history (#44, #62) */
export interface ClubRole {
  id: UUID;
  clubId: UUID;
  userId: UUID;
  role: 'owner' | 'admin' | 'captain';
  startDate: ISODate;
  endDate?: ISODate;
}

/** affiliations — badge shows only while active and valid (#58) */
export interface Affiliation {
  id: UUID;
  clubId: UUID;
  orgId: UUID;
  tnbaNumber?: string;
  validUntil?: ISODate;
  status: 'pending' | 'active' | 'rejected' | 'ended';
  startedBy: 'club' | 'association';
}

/** coaches */
export interface Coach {
  id: UUID;
  clubId: UUID;
  userId?: UUID;
  name: string;
  role: 'head' | 'assistant';
}

/** verification_badges */
export interface VerificationBadge {
  id: UUID;
  badge: 'basky_verified' | 'creator';
  clubId?: UUID; // basky_verified
  userId?: UUID; // creator
}

// ── Community ─────────────────────────────────────────────────────────────
export type Visibility = 'members' | 'club_page' | 'public';
export type ModerationStatus = 'in_review' | 'published' | 'hidden' | 'removed';

/** post_media */
export interface PostMedia {
  id: UUID;
  postId: UUID;
  mediaType: 'image' | 'youtube';
  url?: string; // image URL or YouTube link
  sortOrder: number;
  aspectRatio?: number; // MOCK: reserves space before an image loads
}

/** posts — like/comment counts are kept on the row by the database */
export interface Post {
  postId: UUID;
  authorId: UUID;
  clubId?: UUID;
  orgId?: UUID;
  districtCode?: string; // filled automatically (#10 in SCHEMA_PHASE1 section 4)
  visibility: Visibility;
  moderationStatus: ModerationStatus;
  content?: string;
  likeCount: number;
  commentCount: number;
  createdAt: ISODate;
  media: PostMedia[];
}

/** post_likes */
export interface PostLike {
  postId: UUID;
  userId: UUID;
}

/** post_comments — one level of replies */
export interface PostComment {
  id: UUID;
  postId: UUID;
  userId: UUID;
  parentId?: UUID;
  content: string;
  createdAt: ISODate;
  deletedAt?: ISODate;
}

/** follows — one-way, no approval (#73) */
export interface Follow {
  followerId: UUID;
  targetType: 'club' | 'organization' | 'user';
  targetId: UUID;
}

export type Audience =
  | 'club_admins_in_area'
  | 'affiliated_members'
  | 'district_users'
  | 'followers'
  | 'club_members'
  | 'everyone';

/** announcements — Alerts inbox + push, no likes/comments (#75) */
export interface Announcement {
  id: UUID;
  senderUserId: UUID;
  orgId?: UUID; // sent by an association
  clubId?: UUID; // sent by a club
  audience: Audience;
  title: string;
  body: string;
  feedPostId?: UUID; // "also show in feed" → pinned Official card
  createdAt: ISODate;
}
