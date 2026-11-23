// Associations: BFI → TNBA → district associations, plus league operators (#19, #59, #60, #61).
// Page states (#59): draft = hidden from the public; published = visible, "Managed by BaskyCLub";
// claimed = run by the association's own admin.
// Powers: owner/admin manage the page; any member can post officially and send announcements;
// the Basky team can do everything. A state association has no automatic power over district pages.
import type { Prisma } from "@prisma/client";
import { LIMITS } from "@baskyclub/shared";
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { dateOnly, paging, uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { mediaUrl } from "../lib/media";
import { getOrgPowers, isBaskyTeam, logChange, requireBaskyTeam, requireOrgManager, requireSuperAdmin } from "../permissions";
import { followerCount, isFollowing } from "./follows.service";

export const ORG_LEVELS = ["national", "state", "district", "league_operator"] as const;
const PAGE_STATUSES = ["draft", "published", "claimed"] as const;


const orgDetails = {
  name: z.string().trim().min(3).max(120),
  shortName: z.string().trim().max(30).nullable(),
  registrationNo: z.string().trim().max(60).nullable(),
  logoUrl: mediaUrl.nullable(),
  contactEmail: z.email().nullable(),
  contactPhone: z.string().trim().max(20).nullable(),
  address: z.string().trim().max(300).nullable(),
  website: z.url().nullable(),
};

export const createOrgInput = z.object({
  ...orgDetails,
  shortName: orgDetails.shortName.optional(),
  registrationNo: orgDetails.registrationNo.optional(),
  logoUrl: orgDetails.logoUrl.optional(),
  contactEmail: orgDetails.contactEmail.optional(),
  contactPhone: orgDetails.contactPhone.optional(),
  address: orgDetails.address.optional(),
  website: orgDetails.website.optional(),
  level: z.enum(ORG_LEVELS),
  parentId: uuid.optional(),
  stateCode: z.string().trim().toUpperCase().optional(),
  /** District codes this association covers (district level). */
  districtCodes: z.array(z.string().trim().toUpperCase()).default([]),
});

export const updateOrgInput = z
  .object({ ...orgDetails, pageStatus: z.enum(PAGE_STATUSES) })
  .partial();

export const listOrgsQuery = z.object({
  level: z.enum(ORG_LEVELS).optional(),
  stateCode: z.string().trim().toUpperCase().optional(),
  q: z.string().trim().max(80).optional(),
  ...paging,
});

export const grantOrgMemberInput = z.object({
  userId: uuid,
  accessLevel: z.enum(["owner", "admin", "member"]),
});

export const officeBearerInput = z.object({
  name: z.string().trim().min(LIMITS.officeBearerName.min).max(LIMITS.officeBearerName.max),
  designation: z.string().trim().min(LIMITS.officeBearerDesignation.min).max(LIMITS.officeBearerDesignation.max),
  userId: uuid.nullable().optional(),
  photoUrl: mediaUrl.nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  termFrom: dateOnly,
  termTo: dateOnly.nullable().optional(),
});
export const updateOfficeBearerInput = officeBearerInput.partial();

export const legacyInput = z.object({
  recordType: z.enum(["history", "tournament_record", "achievement"]),
  title: z.string().trim().min(LIMITS.legacyTitle.min).max(LIMITS.legacyTitle.max),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  body: z.string().trim().max(10000).nullable().optional(),
  winner: z.string().trim().max(120).nullable().optional(),
  runnerUp: z.string().trim().max(120).nullable().optional(),
  media: z
    .array(z.object({ mediaType: z.enum(["image", "youtube"]), url: z.string().trim() }))
    .max(20)
    .optional(),
});
export const updateLegacyInput = legacyInput.partial();

export const coverageInput = z.object({ districtCodes: z.array(z.string().trim().toUpperCase()).min(1) });

// ---- Helpers --------------------------------------------------------------------------

const isPublic = (pageStatus: string) => pageStatus === "published" || pageStatus === "claimed";

async function findOrg(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw notFound("Association");
  return org;
}

/** Draft pages are only visible to their own members and the Basky team. */
async function requireVisibleOrg(viewer: Viewer | null, organizationId: string) {
  const org = await findOrg(organizationId);
  const powers = await getOrgPowers(viewer, organizationId);
  if (!isPublic(org.pageStatus) && !powers.isMember && !isBaskyTeam(viewer)) throw notFound("Association");
  return { org, powers };
}

function todayUtc() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Clubs with an active, in-date affiliation (#58). */
function activeAffiliation(organizationId: string): Prisma.AffiliationWhereInput {
  return { organizationId, status: "active", OR: [{ validUntil: null }, { validUntil: { gte: todayUtc() } }] };
}

// ---- List / page ----------------------------------------------------------------------------

export async function listOrgs(viewer: Viewer | null, query: z.infer<typeof listOrgsQuery>) {
  const where: Prisma.OrganizationWhereInput = {
    ...(isBaskyTeam(viewer) ? {} : { pageStatus: { in: ["published", "claimed"] } }),
    ...(query.level ? { level: query.level } : {}),
    ...(query.stateCode ? { stateCode: query.stateCode } : {}),
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { shortName: { contains: query.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      select: { id: true, name: true, shortName: true, level: true, stateCode: true, pageStatus: true, logoUrl: true, parentId: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
      take: query.limit,
      skip: query.offset,
    }),
    prisma.organization.count({ where }),
  ]);
  return { associations: rows, total };
}

export async function getOrg(viewer: Viewer | null, organizationId: string) {
  const { org, powers } = await requireVisibleOrg(viewer, organizationId);
  const today = todayUtc();
  const [parent, children, districts, bearers, affiliations, legacyCount, followers, following] = await Promise.all([
    org.parentId ? prisma.organization.findUnique({ where: { id: org.parentId }, select: { id: true, name: true, shortName: true, level: true } }) : null,
    prisma.organization.findMany({
      where: { parentId: org.id, ...(isBaskyTeam(viewer) ? {} : { pageStatus: { in: ["published", "claimed"] } }) },
      select: { id: true, name: true, shortName: true, level: true, pageStatus: true },
      orderBy: { name: "asc" },
    }),
    prisma.district.findMany({ where: { associationId: org.id }, select: { code: true, name: true, zoneCode: true }, orderBy: { name: "asc" } }),
    prisma.officeBearer.findMany({
      where: { organizationId: org.id, OR: [{ termTo: null }, { termTo: { gte: today } }] },
      select: { id: true, name: true, designation: true, photoUrl: true, termFrom: true, termTo: true, userId: true },
      orderBy: [{ sortOrder: "asc" }, { termFrom: "asc" }],
    }),
    prisma.affiliation.findMany({
      where: activeAffiliation(org.id),
      select: { validUntil: true, tnbaNumber: true, club: { select: { id: true, name: true, kind: true, logoUrl: true, districtCode: true, status: true, deletedAt: true } } },
    }),
    prisma.legacyRecord.count({ where: { organizationId: org.id } }),
    followerCount({ targetType: "organization", targetId: org.id }),
    isFollowing(viewer, { targetType: "organization", targetId: org.id }),
  ]);

  return {
    id: org.id,
    name: org.name,
    shortName: org.shortName,
    level: org.level,
    stateCode: org.stateCode,
    pageStatus: org.pageStatus,
    /** What the app shows under the name (#59) */
    pageLabel: org.pageStatus === "claimed" ? "Official" : org.pageStatus === "published" ? "Managed by BaskyCLub" : "Draft",
    logoUrl: org.logoUrl,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    address: org.address,
    website: org.website,
    registrationNo: org.registrationNo,
    parent,
    children,
    coveredDistricts: districts,
    officeBearers: bearers,
    affiliatedClubs: affiliations
      .filter((a) => a.club.status === "approved" && !a.club.deletedAt)
      .map((a) => ({ id: a.club.id, name: a.club.name, kind: a.club.kind, logoUrl: a.club.logoUrl, districtCode: a.club.districtCode, validUntil: a.validUntil, tnbaNumber: a.tnbaNumber })),
    legacyCount,
    followerCount: followers,
    viewer: { isFollowing: following, accessLevel: powers.accessLevel, canManage: powers.canManage, canPostOfficially: powers.isMember || isBaskyTeam(viewer) },
  };
}

// ---- Create / edit (Basky team creates; staff edit; only the Basky team changes page state) -------

async function checkCoverage(districtCodes: string[]) {
  if (!districtCodes.length) return;
  const found = await prisma.district.count({ where: { code: { in: districtCodes } } });
  if (found !== new Set(districtCodes).size) throw badRequest("unknown_district", "One of the districts doesn't exist.");
}

/** PRD §2/§8: only a super admin creates associations. */
export async function createOrg(viewer: Viewer, input: z.infer<typeof createOrgInput>) {
  requireSuperAdmin(viewer);
  if (input.parentId) await findOrg(input.parentId);
  if ((input.level === "state" || input.level === "district") && !input.stateCode) {
    throw badRequest("state_required", "State and district associations need a state.");
  }
  if (input.stateCode && !(await prisma.state.findUnique({ where: { code: input.stateCode } }))) {
    throw badRequest("unknown_state", "Unknown state.");
  }
  await checkCoverage(input.districtCodes);
  const { districtCodes, ...data } = input;
  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({ data: { ...data, pageStatus: "draft", createdById: viewer.id } });
    if (districtCodes.length) await tx.district.updateMany({ where: { code: { in: districtCodes } }, data: { associationId: created.id } });
    await logChange(tx, viewer.id, "organizations", created.id, "create", null, { name: created.name, level: created.level, districtCodes });
    return created;
  });
  return { id: org.id, name: org.name, pageStatus: org.pageStatus };
}

export async function updateOrg(viewer: Viewer, organizationId: string, input: z.infer<typeof updateOrgInput>) {
  const org = await findOrg(organizationId);
  await requireOrgManager(viewer, organizationId);
  if (input.pageStatus && input.pageStatus !== org.pageStatus && !isBaskyTeam(viewer)) {
    throw forbidden("basky_team_only", "Only the BaskyCLub team can publish or hand over an association page.");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.organization.update({
      where: { id: org.id },
      data: { ...input, ...(input.pageStatus === "claimed" && org.pageStatus !== "claimed" ? { claimedAt: new Date() } : {}) },
    });
    if (input.pageStatus && input.pageStatus !== org.pageStatus) {
      await logChange(tx, viewer.id, "organizations", org.id, "update", { pageStatus: org.pageStatus }, { pageStatus: input.pageStatus });
    }
    return u;
  });
  return { id: updated.id, name: updated.name, pageStatus: updated.pageStatus };
}

/** Which districts an association covers (#61). Basky team only. */
export async function setCoverage(viewer: Viewer, organizationId: string, input: z.infer<typeof coverageInput>) {
  requireBaskyTeam(viewer);
  const org = await findOrg(organizationId);
  await checkCoverage(input.districtCodes);
  const before = await prisma.district.findMany({ where: { associationId: org.id }, select: { code: true } });
  await prisma.$transaction(async (tx) => {
    await tx.district.updateMany({ where: { associationId: org.id }, data: { associationId: null } });
    await tx.district.updateMany({ where: { code: { in: input.districtCodes } }, data: { associationId: org.id } });
    await logChange(tx, viewer.id, "districts", org.id, "update", { covered: before.map((d) => d.code) }, { covered: input.districtCodes });
  });
  return { coveredDistricts: input.districtCodes };
}

// ---- Association members (who has power in the app) ---------------------------------------------

export async function listOrgMembers(viewer: Viewer, organizationId: string) {
  await requireOrgManager(viewer, organizationId);
  const rows = await prisma.organizationMember.findMany({
    where: { organizationId, toAt: null },
    select: { id: true, accessLevel: true, fromAt: true, user: { select: { id: true, name: true, photoUrl: true } } },
    orderBy: { fromAt: "asc" },
  });
  return { members: rows };
}

/** Owners are set by the Basky team; owners (or Basky team) add admins and members. */
export async function grantOrgMember(viewer: Viewer, organizationId: string, input: z.infer<typeof grantOrgMemberInput>) {
  requireActive(viewer);
  await findOrg(organizationId);
  const powers = await requireOrgManager(viewer, organizationId);
  const basky = isBaskyTeam(viewer);
  if (input.accessLevel === "owner" && !basky) throw forbidden("basky_team_only", "Only the BaskyCLub team can make someone an owner.");
  if (input.accessLevel === "admin" && powers.accessLevel !== "owner" && !basky) {
    throw forbidden("owner_only", "Only the association's owner can add admins.");
  }
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { status: true } });
  if (!user || user.status !== "active") throw badRequest("user_not_active", "This person needs an active account.");

  const current = await prisma.organizationMember.findFirst({ where: { organizationId, userId: input.userId, toAt: null } });
  if (current?.accessLevel === input.accessLevel) throw conflict("already_has_role", `This person is already ${input.accessLevel}.`);

  const row = await prisma.$transaction(async (tx) => {
    const now = new Date();
    // Changing level = end the old row, start a new one (history kept)
    if (current) await tx.organizationMember.update({ where: { id: current.id }, data: { toAt: now } });
    const created = await tx.organizationMember.create({
      data: { organizationId, userId: input.userId, accessLevel: input.accessLevel, grantedById: viewer.id, fromAt: now },
    });
    await logChange(tx, viewer.id, "organization_members", created.id, "create", current ? { accessLevel: current.accessLevel } : null, { userId: input.userId, accessLevel: input.accessLevel });
    return created;
  });
  return { id: row.id, accessLevel: row.accessLevel };
}

export async function endOrgMember(viewer: Viewer, memberRowId: string) {
  const row = await prisma.organizationMember.findUnique({ where: { id: memberRowId } });
  if (!row || row.toAt) throw notFound("Association role");
  const isSelf = row.userId === viewer.id;
  if (!isSelf) {
    const powers = await requireOrgManager(viewer, row.organizationId);
    const basky = isBaskyTeam(viewer);
    if (row.accessLevel === "owner" && !basky) throw forbidden("basky_team_only", "Only the BaskyCLub team can remove an owner.");
    if (row.accessLevel === "admin" && powers.accessLevel !== "owner" && !basky) throw forbidden("owner_only", "Only the owner can remove an admin.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.organizationMember.update({ where: { id: row.id }, data: { toAt: new Date() } });
    await logChange(tx, viewer.id, "organization_members", row.id, "update", { toAt: null }, { toAt: "now" });
  });
  return { ok: true };
}

// ---- Office bearers (#16, #45, #62) -----------------------------------------------------------------

export async function listOfficeBearers(viewer: Viewer | null, organizationId: string, includePast: boolean) {
  await requireVisibleOrg(viewer, organizationId);
  const today = todayUtc();
  const rows = await prisma.officeBearer.findMany({
    where: { organizationId, ...(includePast ? {} : { OR: [{ termTo: null }, { termTo: { gte: today } }] }) },
    select: { id: true, name: true, designation: true, photoUrl: true, termFrom: true, termTo: true, userId: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { termFrom: "desc" }],
  });
  return {
    officeBearers: rows.map((r) => ({ ...r, isCurrent: !r.termTo || r.termTo >= today })),
  };
}

async function checkBearer(input: { userId?: string | null; termFrom?: Date; termTo?: Date | null }) {
  if (input.userId && !(await prisma.user.findUnique({ where: { id: input.userId } }))) throw notFound("Person");
  if (input.termFrom && input.termTo && input.termTo < input.termFrom) throw badRequest("bad_term", "The term can't end before it starts.");
}

export async function addOfficeBearer(viewer: Viewer, organizationId: string, input: z.infer<typeof officeBearerInput>) {
  await findOrg(organizationId);
  await requireOrgManager(viewer, organizationId);
  await checkBearer(input);
  const row = await prisma.officeBearer.create({ data: { ...input, organizationId, enteredById: viewer.id } });
  return { id: row.id };
}

export async function updateOfficeBearer(viewer: Viewer, bearerId: string, input: z.infer<typeof updateOfficeBearerInput>) {
  const row = await prisma.officeBearer.findUnique({ where: { id: bearerId } });
  if (!row) throw notFound("Office bearer");
  await requireOrgManager(viewer, row.organizationId);
  await checkBearer({ ...input, termFrom: input.termFrom ?? row.termFrom, termTo: input.termTo === undefined ? row.termTo : input.termTo });
  await prisma.officeBearer.update({ where: { id: row.id }, data: input });
  return { ok: true };
}

/** For typing mistakes. To end a term normally, set termTo instead (history stays). */
export async function deleteOfficeBearer(viewer: Viewer, bearerId: string) {
  const row = await prisma.officeBearer.findUnique({ where: { id: bearerId } });
  if (!row) throw notFound("Office bearer");
  await requireOrgManager(viewer, row.organizationId);
  await prisma.$transaction(async (tx) => {
    await tx.officeBearer.delete({ where: { id: row.id } });
    await logChange(tx, viewer.id, "office_bearers", row.id, "delete", { name: row.name, designation: row.designation }, null);
  });
  return { ok: true };
}

// ---- Media / Legacy (#66) -----------------------------------------------------------------------------

export async function checkLegacyMedia(media: { mediaType: string; url: string }[] | undefined) {
  const { normalizeYouTubeUrl } = await import("@baskyclub/shared");
  return (media ?? []).map((m, i) => {
    if (m.mediaType === "youtube") {
      const url = normalizeYouTubeUrl(m.url);
      if (!url) throw badRequest("bad_youtube_link", "That doesn't look like a YouTube link.");
      return { mediaType: m.mediaType, url, sortOrder: i };
    }
    const parsed = mediaUrl.safeParse(m.url);
    if (!parsed.success) throw badRequest("bad_photo_link", "Use an https:// link or upload the photo first.");
    return { mediaType: m.mediaType, url: parsed.data, sortOrder: i };
  });
}

export async function listLegacy(viewer: Viewer | null, organizationId: string) {
  await requireVisibleOrg(viewer, organizationId);
  const records = await prisma.legacyRecord.findMany({
    where: { organizationId },
    select: {
      id: true, recordType: true, title: true, year: true, body: true, winner: true, runnerUp: true, createdAt: true,
      media: { orderBy: { sortOrder: "asc" }, select: { mediaType: true, url: true } },
    },
    orderBy: [{ year: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  return { records };
}

export async function addLegacy(viewer: Viewer, organizationId: string, input: z.infer<typeof legacyInput>) {
  await findOrg(organizationId);
  await requireOrgManager(viewer, organizationId);
  const media = await checkLegacyMedia(input.media);
  const { media: _m, ...data } = input;
  const row = await prisma.legacyRecord.create({ data: { ...data, organizationId, createdById: viewer.id, media: { create: media } } });
  return { id: row.id };
}

export async function updateLegacy(viewer: Viewer, recordId: string, input: z.infer<typeof updateLegacyInput>) {
  const row = await prisma.legacyRecord.findUnique({ where: { id: recordId } });
  if (!row) throw notFound("Record");
  await requireOrgManager(viewer, row.organizationId);
  const { media, ...data } = input;
  const newMedia = media ? await checkLegacyMedia(media) : null;
  await prisma.$transaction(async (tx) => {
    await tx.legacyRecord.update({ where: { id: row.id }, data });
    if (newMedia) {
      await tx.legacyMedia.deleteMany({ where: { legacyRecordId: row.id } });
      await tx.legacyMedia.createMany({ data: newMedia.map((m) => ({ ...m, legacyRecordId: row.id })) });
    }
  });
  return { ok: true };
}

export async function deleteLegacy(viewer: Viewer, recordId: string) {
  const row = await prisma.legacyRecord.findUnique({ where: { id: recordId } });
  if (!row) throw notFound("Record");
  await requireOrgManager(viewer, row.organizationId);
  await prisma.$transaction(async (tx) => {
    await tx.legacyRecord.delete({ where: { id: row.id } });
    await logChange(tx, viewer.id, "legacy_records", row.id, "delete", { title: row.title, year: row.year }, null);
  });
  return { ok: true };
}
