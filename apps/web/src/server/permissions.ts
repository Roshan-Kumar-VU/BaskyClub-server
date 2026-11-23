// =============================================================================
// Who can do what. Every service asks these helpers; no screen decides powers.
// Powers come from dated rows (to_at empty = current), read fresh every request.
// =============================================================================
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { forbidden } from "./errors";
import type { PlatformRoleName, Viewer } from "./auth/viewer";

type Db = Prisma.TransactionClient | typeof prisma;

// ---- BaskyCLub team -------------------------------------------------------

/** super_admin counts as every platform role. */
export function hasPlatformRole(viewer: Viewer | null, ...roles: PlatformRoleName[]): boolean {
  if (!viewer) return false;
  if (viewer.platformRoles.has("super_admin")) return true;
  return roles.some((r) => viewer.platformRoles.has(r));
}

/** Basky team = super admin or basky admin: approves clubs, manages users. */
export const isBaskyTeam = (viewer: Viewer | null) => hasPlatformRole(viewer, "basky_admin");

/** Moderators review posts and comments; the Basky team and super admins can too. */
export const isModerator = (viewer: Viewer | null) => hasPlatformRole(viewer, "moderator", "basky_admin");

export function requireModerator(viewer: Viewer): void {
  if (!isModerator(viewer)) throw forbidden("moderators_only", "Only BaskyCLub moderators can do this.");
}

export function requireBaskyTeam(viewer: Viewer): void {
  if (!isBaskyTeam(viewer)) throw forbidden("basky_team_only", "Only the BaskyCLub team can do this.");
}

export function requireSuperAdmin(viewer: Viewer): void {
  if (!viewer.platformRoles.has("super_admin")) throw forbidden("super_admin_only", "Only a super admin can do this.");
}

// ---- Clubs ----------------------------------------------------------------

export interface ClubPowers {
  isOwner: boolean;
  isAdmin: boolean;
  isCaptain: boolean;
  /** Active member (membership status "active"). */
  isMember: boolean;
  /** Owner or admin of the club. */
  isStaff: boolean;
  /** Club staff, or the Basky team acting on any club. */
  canManage: boolean;
}

export async function getClubPowers(viewer: Viewer | null, clubId: string, db: Db = prisma): Promise<ClubPowers> {
  if (!viewer) {
    return { isOwner: false, isAdmin: false, isCaptain: false, isMember: false, isStaff: false, canManage: false };
  }
  const [roles, membership] = await Promise.all([
    db.clubRole.findMany({ where: { clubId, userId: viewer.id, toAt: null }, select: { role: true } }),
    db.clubMembership.findFirst({ where: { clubId, userId: viewer.id, status: "active" }, select: { id: true } }),
  ]);
  const has = (r: string) => roles.some((x) => x.role === r);
  const isOwner = has("owner");
  const isAdmin = has("admin");
  const isStaff = isOwner || isAdmin;
  return {
    isOwner,
    isAdmin,
    isCaptain: has("captain"),
    isMember: !!membership,
    isStaff,
    canManage: isStaff || isBaskyTeam(viewer),
  };
}

export async function requireClubManager(viewer: Viewer, clubId: string, db: Db = prisma): Promise<ClubPowers> {
  const powers = await getClubPowers(viewer, clubId, db);
  if (!powers.canManage) throw forbidden("club_staff_only", "Only the club's owner or admins can do this.");
  return powers;
}

// ---- Associations (organizations) ---------------------------------------------

export interface OrgPowers {
  accessLevel: "owner" | "admin" | "member" | null;
  /** Any current association role: can post officially and send announcements. */
  isMember: boolean;
  /** Owner or admin: edits the page, office bearers, Media/Legacy, affiliations. */
  isStaff: boolean;
  /** Staff, or the Basky team acting on any association. */
  canManage: boolean;
}

export async function getOrgPowers(viewer: Viewer | null, organizationId: string, db: Db = prisma): Promise<OrgPowers> {
  if (!viewer) return { accessLevel: null, isMember: false, isStaff: false, canManage: false };
  const row = await db.organizationMember.findFirst({
    where: { organizationId, userId: viewer.id, toAt: null },
    select: { accessLevel: true },
  });
  const accessLevel = (row?.accessLevel ?? null) as OrgPowers["accessLevel"];
  const isStaff = accessLevel === "owner" || accessLevel === "admin";
  return { accessLevel, isMember: !!accessLevel, isStaff, canManage: isStaff || isBaskyTeam(viewer) };
}

export async function requireOrgManager(viewer: Viewer, organizationId: string, db: Db = prisma): Promise<OrgPowers> {
  const powers = await getOrgPowers(viewer, organizationId, db);
  if (!powers.canManage) throw forbidden("association_staff_only", "Only the association's owner or admins can do this.");
  return powers;
}

/** Clubs where this person is an active member (for members-only posts). */
export async function activeClubIds(viewer: Viewer | null, db: Db = prisma): Promise<string[]> {
  if (!viewer) return [];
  const rows = await db.clubMembership.findMany({
    where: { userId: viewer.id, status: "active", club: { deletedAt: null } },
    select: { clubId: true },
  });
  return rows.map((r) => r.clubId);
}

// ---- Admin history (#61) -------------------------------------------------

/** Records who changed what. Call inside the same transaction as the change. */
export function logChange(
  db: Db,
  actorId: string,
  entity: string,
  entityId: string,
  action: "create" | "update" | "delete",
  beforeValue?: unknown,
  afterValue?: unknown,
) {
  return db.changeLog.create({
    data: {
      actorId,
      entity,
      entityId,
      action,
      beforeValue: (beforeValue ?? undefined) as Prisma.InputJsonValue | undefined,
      afterValue: (afterValue ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
