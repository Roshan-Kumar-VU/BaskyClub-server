// API response shapes, shared by the server (which builds them) and the apps (which read them).
//
// Each shape is written once as `XxxData` — what the server builds, with real Date objects —
// and `Xxx = Json<XxxData>` is what arrives over HTTP (dates become ISO strings).
// The server annotates its mappers with the Data type, so changing a field here breaks the
// server build and every app that reads it, instead of drifting silently.
//
// The string unions are the only values the API writes (checked by Zod on the way in).
// The database stores them as plain text, so the server casts them once, in its mappers.

/** Date → ISO string, recursively: the JSON form of a server value. */
export type Json<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Json<U>[]
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;

// ---- Values ----------------------------------------------------------------------------------

export type Visibility = "members" | "club_page" | "public";
export type ModerationStatus = "in_review" | "published" | "hidden" | "removed";
export type MediaType = "image" | "youtube";
export type ClubKind = "club" | "academy" | "creator_group" | "franchise";
export type ClubStatus = "pending" | "approved" | "suspended";
export type Position = "PG" | "SG" | "SF" | "PF" | "C";
export type ClubRoleName = "owner" | "admin" | "captain";

// ---- People ----------------------------------------------------------------------------------

/** The public face of a person: everywhere a name and photo are shown. */
export interface Person {
  id: string;
  name: string;
  photoUrl: string | null;
}

// ---- Posts -----------------------------------------------------------------------------------

export interface PostMediaItem {
  mediaType: MediaType;
  url: string;
  width: number | null;
  height: number | null;
}

/** A post as shown in feeds, on pages and on its own (posts.service → toCards). */
export interface PostCardData {
  id: string;
  content: string | null;
  visibility: Visibility;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  edited: boolean;
  districtCode: string | null;
  isPinned: boolean;
  author: Person & { isCreator: boolean };
  club: { id: string; name: string; logoUrl: string | null } | null;
  organization: { id: string; name: string; shortName: string | null; logoUrl: string | null } | null;
  media: PostMediaItem[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  /** null for members-only posts: they can't be shared. */
  shareUrl: string | null;
  canEdit: boolean;
  canDelete: boolean;
}
export type PostCard = Json<PostCardData>;

/** A comment or reply (engagement.service → toComment). Removed ones keep their place with no text. */
export interface CommentData {
  id: string;
  parentId: string | null;
  createdAt: Date;
  isRemoved: boolean;
  content: string | null;
  user: Person | null;
  /** Only on top-level comments. */
  replyCount?: number;
  canDelete: boolean;
}
export type Comment = Json<CommentData>;

/** GET /api/posts/:id/comments — top-level comments, oldest first; pass nextCursor for the next page. */
export interface CommentPageData {
  comments: CommentData[];
  commentCount: number;
  nextCursor: string | null;
}
export type CommentPage = Json<CommentPageData>;

/** GET /api/comments/:id/replies — replies to one top-level comment, oldest first. */
export interface ReplyPageData {
  replies: CommentData[];
  nextCursor: string | null;
}
export type ReplyPage = Json<ReplyPageData>;

// ---- Clubs -----------------------------------------------------------------------------------

/** A club in lists, search and the map (clubs.service → toClubCard). */
export interface ClubCardData {
  id: string;
  name: string;
  kind: ClubKind;
  status: ClubStatus;
  districtCode: string;
  districtName: string;
  stateCode: string;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  /** null → "Community club" */
  affiliatedTo: {
    id: string;
    name: string;
    shortName: string | null;
    validUntil: Date | null;
    tnbaNumber: string | null;
  } | null;
  memberCount: number;
}
export type ClubCard = Json<ClubCardData>;

/** An active member on the club's member list (memberships.service → listMembers). */
export interface ClubMemberData {
  id: string;
  isPlayer: boolean;
  isCoach: boolean;
  isReferee: boolean;
  primaryPosition: Position | null;
  joinedAt: Date | null;
  user: Person;
  roles: ClubRoleName[];
}
export type ClubMember = Json<ClubMemberData>;

// ---- Alerts (the bell) -------------------------------------------------------------------------

export type Audience = "club_admins_in_area" | "affiliated_members" | "district_users" | "followers" | "club_members" | "everyone";

/**
 * One item in the Alerts inbox (GET /api/alerts). Two kinds:
 *   announcement — from an association, a club or the BaskyCLub team, to an audience
 *   reply        — someone replied in a comment thread you started (PRD §6)
 */
export interface AlertData {
  id: string;
  type: "announcement" | "reply";
  title: string;
  body: string;
  sentAt: Date;
  /** The post to open when the alert is tapped (an announcement's feed card, or the replied post). */
  postId: string | null;
  /** Announcements only: who it was sent to. */
  audience: Audience | null;
  districtCode: string | null;
  /** @deprecated use postId; kept for app versions that read it. */
  feedPostId: string | null;
  from:
    | { type: "organization"; id: string; name: string; shortName: string | null; logoUrl: string | null }
    | { type: "club"; id: string; name: string; logoUrl: string | null }
    | { type: "basky"; id: null; name: string }
    | { type: "user"; id: string; name: string; photoUrl: string | null };
  sentBy: string;
}
export type Alert = Json<AlertData>;

export interface AlertPageData {
  alerts: AlertData[];
  nextCursor: string | null;
}
export type AlertPage = Json<AlertPageData>;
