// Super-admin dashboard: users, BaskyCLub roles, change history, zones and districts (#12, #43, #61).
//   Basky team (basky_admin, super_admin): find users, suspend / restore, history, zones, districts
//   Super admin only: give or end BaskyCLub roles
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { paging, uuid } from "../http";
import type { Viewer } from "../auth/viewer";
import { logChange, requireBaskyTeam, requireSuperAdmin } from "../permissions";

export const listUsersQuery = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["active", "limited", "suspended", "deleted"]).optional(),
  ...paging,
});
export const setStatusInput = z.object({
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().min(3).max(500),
});
export const grantPlatformRoleInput = z.object({ userId: uuid, role: z.enum(["super_admin", "basky_admin", "moderator"]) });
export const changeLogQuery = z.object({
  entity: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(60).optional(),
  actorId: uuid.optional(),
  ...paging,
});
export const updateZoneInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    hqDistrictCode: z.string().trim().toUpperCase().nullable(),
    isProvisional: z.boolean(),
  })
  .partial();
export const updateDistrictInput = z
  .object({
    zoneCode: z.string().trim().toUpperCase().nullable(),
    altName: z.string().trim().max(80).nullable(),
    isProvisional: z.boolean(),
  })
  .partial();

// ---- Users -----------------------------------------------------------------------------

export async function listUsers(viewer: Viewer, query: z.infer<typeof listUsersQuery>) {
  requireBaskyTeam(viewer);
  const where: Prisma.UserWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { email: { contains: query.q.toLowerCase() } }, { phone: { contains: query.q.replace(/\s/g, "") } }] }
      : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, status: true, homeDistrictCode: true, createdAt: true,
        platformRoles: { where: { toAt: null }, select: { id: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.user.count({ where }),
  ]);
  return { users, total };
}

export async function setUserStatus(viewer: Viewer, userId: string, input: z.infer<typeof setStatusInput>) {
  requireBaskyTeam(viewer);
  if (userId === viewer.id) throw badRequest("not_yourself", "You can't change your own account status.");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { platformRoles: { where: { toAt: null } } } });
  if (!user || user.status === "deleted") throw notFound("Person");
  if (user.platformRoles.some((r) => r.role === "super_admin") && !viewer.platformRoles.has("super_admin")) {
    throw forbidden("super_admin_only", "Only a super admin can change a super admin's account.");
  }
  if (input.status === "active" && user.status === "limited") {
    throw badRequest("needs_parent", "Under-18 accounts become active when a parent confirms.");
  }
  if (user.status === input.status) return { id: user.id, status: user.status };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { status: input.status } });
    await logChange(tx, viewer.id, "users", user.id, "update", { status: user.status }, { status: input.status, reason: input.reason });
  });
  return { id: user.id, status: input.status };
}

// ---- BaskyCLub roles (super admin only) ---------------------------------------------------------

export async function listPlatformRoles(viewer: Viewer) {
  requireBaskyTeam(viewer);
  const roles = await prisma.platformRole.findMany({
    where: { toAt: null },
    select: { id: true, role: true, fromAt: true, user: { select: { id: true, name: true } }, grantedBy: { select: { id: true, name: true } } },
    orderBy: [{ role: "asc" }, { fromAt: "asc" }],
  });
  return { roles };
}

export async function grantPlatformRole(viewer: Viewer, input: z.infer<typeof grantPlatformRoleInput>) {
  requireSuperAdmin(viewer);
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.status !== "active") throw badRequest("user_not_active", "This person needs an active account.");
  const existing = await prisma.platformRole.findFirst({ where: { userId: input.userId, role: input.role, toAt: null } });
  if (existing) throw conflict("already_has_role", `This person is already ${input.role}.`);
  const row = await prisma.$transaction(async (tx) => {
    const r = await tx.platformRole.create({ data: { userId: input.userId, role: input.role, grantedById: viewer.id } });
    await logChange(tx, viewer.id, "platform_roles", r.id, "create", null, { userId: input.userId, role: input.role });
    return r;
  });
  return { id: row.id, role: row.role };
}

export async function endPlatformRole(viewer: Viewer, roleId: string) {
  requireSuperAdmin(viewer);
  const row = await prisma.platformRole.findUnique({ where: { id: roleId } });
  if (!row || row.toAt) throw notFound("Role");
  if (row.role === "super_admin") {
    const others = await prisma.platformRole.count({ where: { role: "super_admin", toAt: null, id: { not: row.id } } });
    if (others === 0) throw badRequest("last_super_admin", "There must always be at least one super admin.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.platformRole.update({ where: { id: row.id }, data: { toAt: new Date() } });
    await logChange(tx, viewer.id, "platform_roles", row.id, "update", { toAt: null }, { toAt: "now" });
  });
  return { ok: true };
}

// ---- History (#61) ------------------------------------------------------------------------------

export async function changeLog(viewer: Viewer, query: z.infer<typeof changeLogQuery>) {
  requireBaskyTeam(viewer);
  const where: Prisma.ChangeLogWhereInput = {
    ...(query.entity ? { entity: query.entity } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
  };
  const rows = await prisma.changeLog.findMany({
    where,
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { at: "desc" },
    take: query.limit,
    skip: query.offset,
  });
  return { changes: rows };
}

// ---- Zones and districts (#18, #61) --------------------------------------------------------------

export async function updateZone(viewer: Viewer, code: string, input: z.infer<typeof updateZoneInput>) {
  requireBaskyTeam(viewer);
  const zone = await prisma.zone.findUnique({ where: { code: code.toUpperCase() } });
  if (!zone) throw notFound("Zone");
  if (input.hqDistrictCode) {
    const d = await prisma.district.findUnique({ where: { code: input.hqDistrictCode } });
    if (!d || d.stateCode !== zone.stateCode) throw badRequest("unknown_district", "Choose a district in the same state.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.zone.update({ where: { code: zone.code }, data: input });
    await logChange(tx, viewer.id, "zones", zone.code, "update", { name: zone.name, hqDistrictCode: zone.hqDistrictCode, isProvisional: zone.isProvisional }, input);
  });
  return { ok: true };
}

export async function updateDistrict(viewer: Viewer, code: string, input: z.infer<typeof updateDistrictInput>) {
  requireBaskyTeam(viewer);
  const district = await prisma.district.findUnique({ where: { code: code.toUpperCase() } });
  if (!district) throw notFound("District");
  if (input.zoneCode) {
    const z2 = await prisma.zone.findUnique({ where: { code: input.zoneCode } });
    if (!z2 || z2.stateCode !== district.stateCode) throw badRequest("unknown_zone", "Choose a zone in the same state.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.district.update({ where: { code: district.code }, data: input });
    await logChange(tx, viewer.id, "districts", district.code, "update", { zoneCode: district.zoneCode, altName: district.altName, isProvisional: district.isProvisional }, input);
  });
  return { ok: true };
}
