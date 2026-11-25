// Shapes of API replies the website reads that aren't (yet) in packages/shared.
// Kept in step with apps/api services and apps/mobile/src/data (same endpoints).
import type { ClubCard, ClubKind, ClubRoleName, PostCard, Position, PracticeTime } from "@baskyclub/shared";

export type PlatformRole = "super_admin" | "basky_admin" | "moderator";
export type AccessLevel = "owner" | "admin" | "member";

export type CreatorBadge =
  | { status: "none" }
  | { status: "requested" | "active"; since: string; requestId: string }
  | { status: "declined"; decidedAt: string; canAskFrom: string; note: string | null };

/** GET /api/auth/me */
export interface Me {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | null;
  status: "active" | "limited";
  homeDistrictCode: string | null;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  bio: string | null;
  instagram: string | null;
  youtube: string | null;
  pinnedPostId: string | null;
  createdAt: string;
  platformRoles: PlatformRole[];
  isMinor: boolean;
  awaitingParent: boolean;
  canPost: boolean;
  orgMemberships: { organizationId: string; accessLevel: AccessLevel; organization: { name: string; level: string } }[];
  clubRoles: { id: string; clubId: string; role: ClubRoleName }[];
  creatorBadge: CreatorBadge;
}

/** GET /api/places */
export interface Places {
  states: { code: string; name: string; districtCount: number }[];
  districts: { code: string; name: string; stateCode: string; altName: string | null; zoneCode: string | null; associationId: string | null }[];
}

export type OrgRef = { id: string; name: string; shortName?: string | null; level?: string; logoUrl?: string | null; pageStatus?: string; parentId?: string | null; stateCode?: string | null };

/** GET /api/clubs/:id */
export type ClubPage = ClubCard & {
  description: string | null;
  motto: string | null;
  bannerUrl: string | null;
  createdAt: string;
  followerCount: number;
  timings: PracticeTime[];
  staff: { roleId: string; role: ClubRoleName; id: string; name: string; photoUrl: string | null }[];
  coaches: { id: string; name: string; role: "head" | "assistant"; userId: string | null }[];
  viewer: {
    isFollowing: boolean;
    membership: { id: string; status: "pending" | "active"; isPlayer: boolean; primaryPosition: Position | null } | null;
    isOwner: boolean;
    isAdmin: boolean;
    canManage: boolean;
  };
};

/** GET /api/associations/:id */
export interface OrgPage extends OrgRef {
  pageLabel: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  registrationNo: string | null;
  legacyCount: number;
  parent: OrgRef | null;
  children: OrgRef[];
  coveredDistricts: { code: string; name: string }[];
  affiliatedClubs: { id: string; name: string; kind: ClubKind; districtCode: string; logoUrl: string | null; validUntil: string | null; tnbaNumber: string | null }[];
  followerCount: number;
  viewer: { isFollowing: boolean; accessLevel: AccessLevel | null; canManage: boolean; canPostOfficially: boolean };
}

/** GET /api/users/:id */
export interface Profile {
  id: string;
  name: string;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  bio: string | null;
  instagram: string | null;
  youtube: string | null;
  isCreator: boolean;
  homeDistrict: { code: string; name: string } | null;
  clubs: { id: string; name: string; kind: ClubKind; districtCode: string; logoUrl: string | null; affiliatedTo: OrgRef | null; isVerified?: boolean; membershipId: string; isPlayer: boolean; position: Position | null }[];
  pinnedPost: PostCard | null;
  followerCount: number;
  followingCount: number;
  viewer?: { isFollowing: boolean };
}

export type BearerRow = { id: string; name: string; designation: string; photoUrl: string | null; termFrom: string; termTo: string | null; userId: string | null; sortOrder: number; isCurrent: boolean };

export type LegacyRecord = {
  id: string;
  recordType: string;
  title: string;
  year: number | null;
  body: string | null;
  winner: string | null;
  runnerUp: string | null;
  createdAt: string;
  media: { mediaType: "image" | "youtube"; url: string }[];
};

export type MapPin = { id: string; name: string; latitude: number; longitude: number; districtCode: string; distanceKm: number | null; kind?: string; indoor?: boolean; address?: string | null; timings?: PracticeTime[] };

export type AffiliationRow = {
  id: string;
  status: "pending" | "active" | "rejected" | "ended";
  startedBy: "club" | "association";
  tnbaNumber: string | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  club: { id: string; name: string; districtCode: string };
  organization: { id: string; name: string; shortName: string | null; level: string };
  requestedBy: { id: string; name: string } | null;
};

export type OrgMemberRow = { id: string; accessLevel: AccessLevel; fromAt: string; user: { id: string; name: string; photoUrl: string | null } };

export type ModCase = {
  id: string;
  targetType: "post" | "comment" | "user";
  targetId: string;
  source: "ai" | "report" | "no_club_review";
  reason: string | null;
  createdAt: string;
  status?: string;
  reportedBy: { id: string; name: string } | null;
  target: any;
};
