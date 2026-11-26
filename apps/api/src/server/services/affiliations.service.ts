// A club's yearly link to its association (#58, #69).
// Either side starts it: the club asks ("started_by: club") and the association decides, or the
// association invites ("started_by: association") and the club decides. Active + valid_until in
// the future = "Affiliated" badge. Renewing: a new row after the old one ends (history kept).
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { dateOnly, uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { getClubPowers, getOrgPowers, isBaskyTeam, logChange, requireClubManager, requireOrgManager } from "../permissions";


export const clubRequestInput = z.object({ organizationId: uuid, tnbaNumber: z.string().trim().max(40).optional() });
export const orgInviteInput = z.object({
  clubId: uuid,
  tnbaNumber: z.string().trim().max(40).optional(),
  validFrom: dateOnly.optional(),
  validUntil: dateOnly.optional(),
});
export const decideAffiliationInput = z.object({
  decision: z.enum(["approve", "reject"]),
  tnbaNumber: z.string().trim().max(40).optional(),
  validFrom: dateOnly.optional(),
  validUntil: dateOnly.optional(),
});
export const listAffiliationsQuery = z.object({ status: z.enum(["pending", "active", "rejected", "ended"]).optional() });

function todayUtc() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Indian season year: an affiliation runs until 31 March. */
export function defaultValidUntil(from: Date = todayUtc()): Date {
  const year = from.getUTCMonth() >= 3 ? from.getUTCFullYear() + 1 : from.getUTCFullYear();
  return new Date(Date.UTC(year, 2, 31));
}

/** The association must actually cover the club's district (or be the state body of its state). */
async function checkPair(clubId: string, organizationId: string) {
  const [club, org] = await Promise.all([
    prisma.club.findFirst({ where: { id: clubId, deletedAt: null }, include: { district: true } }),
    prisma.organization.findUnique({ where: { id: organizationId } }),
  ]);
  if (!club || club.status !== "approved") throw notFound("Club");
  if (!org || !["published", "claimed"].includes(org.pageStatus)) throw notFound("Association");
  const covers =
    (org.level === "district" && club.district.associationId === org.id) ||
    (org.level === "state" && org.stateCode === club.district.stateCode);
  if (!covers) throw badRequest("wrong_association", "This association doesn't cover the club's district.");
  return { club, org };
}

/** Only one pending/active link per club and association. An expired active one is closed first. */
async function clearExpired(clubId: string, organizationId: string) {
  await prisma.affiliation.updateMany({
    where: { clubId, organizationId, status: "active", validUntil: { lt: todayUtc() } },
    data: { status: "ended" },
  });
  const open = await prisma.affiliation.findFirst({ where: { clubId, organizationId, status: { in: ["pending", "active"] } } });
  if (open?.status === "active") throw conflict("already_affiliated", "This club is already affiliated to this association.");
  if (open?.status === "pending") throw conflict("already_requested", "A request is already waiting.");
}

export async function clubRequest(viewer: Viewer, clubId: string, input: z.infer<typeof clubRequestInput>) {
  requireActive(viewer);
  await requireClubManager(viewer, clubId);
  await checkPair(clubId, input.organizationId);
  await clearExpired(clubId, input.organizationId);
  const row = await prisma.affiliation.create({
    data: { clubId, organizationId: input.organizationId, tnbaNumber: input.tnbaNumber, startedBy: "club", requestedById: viewer.id },
  });
  return { id: row.id, status: row.status };
}

export async function orgInvite(viewer: Viewer, organizationId: string, input: z.infer<typeof orgInviteInput>) {
  requireActive(viewer);
  await requireOrgManager(viewer, organizationId);
  await checkPair(input.clubId, organizationId);
  await clearExpired(input.clubId, organizationId);
  const row = await prisma.affiliation.create({
    data: {
      clubId: input.clubId,
      organizationId,
      tnbaNumber: input.tnbaNumber,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      startedBy: "association",
      requestedById: viewer.id,
    },
  });
  return { id: row.id, status: row.status };
}

/** The other side decides: association decides club requests; club decides association invites. */
export async function decideAffiliation(viewer: Viewer, affiliationId: string, input: z.infer<typeof decideAffiliationInput>) {
  requireActive(viewer);
  const row = await prisma.affiliation.findUnique({ where: { id: affiliationId } });
  if (!row) throw notFound("Affiliation");
  if (row.status !== "pending") throw badRequest("not_pending", "This request has already been handled.");

  const basky = isBaskyTeam(viewer);
  if (row.startedBy === "club") {
    const powers = await getOrgPowers(viewer, row.organizationId);
    if (!powers.isStaff && !basky) throw forbidden("association_staff_only", "The association's owner or admins decide club requests.");
  } else {
    const powers = await getClubPowers(viewer, row.clubId);
    if (!powers.isStaff && !basky) throw forbidden("club_staff_only", "The club's owner or admins decide association invites.");
  }

  const validFrom = input.validFrom ?? row.validFrom ?? todayUtc();
  const validUntil = input.validUntil ?? row.validUntil ?? defaultValidUntil(validFrom);
  if (input.decision === "approve" && validUntil < validFrom) throw badRequest("bad_dates", "Valid until can't be before valid from.");

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.affiliation.update({
      where: { id: row.id },
      data:
        input.decision === "approve"
          ? { status: "active", validFrom, validUntil, tnbaNumber: input.tnbaNumber ?? row.tnbaNumber, decidedById: viewer.id, decidedAt: new Date() }
          : { status: "rejected", decidedById: viewer.id, decidedAt: new Date() },
    });
    await logChange(tx, viewer.id, "affiliations", row.id, "update", { status: "pending" }, { status: u.status });
    return u;
  });
  return { id: updated.id, status: updated.status, validFrom: updated.validFrom, validUntil: updated.validUntil };
}

/** Either side can end an active link, or withdraw a pending one. */
export async function endAffiliation(viewer: Viewer, affiliationId: string) {
  const row = await prisma.affiliation.findUnique({ where: { id: affiliationId } });
  if (!row || !["pending", "active"].includes(row.status)) throw notFound("Affiliation");
  const [club, org] = await Promise.all([getClubPowers(viewer, row.clubId), getOrgPowers(viewer, row.organizationId)]);
  if (!club.isStaff && !org.isStaff && !isBaskyTeam(viewer)) throw forbidden("not_allowed", "Only the club or the association can end this.");
  await prisma.$transaction(async (tx) => {
    await tx.affiliation.update({ where: { id: row.id }, data: { status: "ended" } });
    await logChange(tx, viewer.id, "affiliations", row.id, "update", { status: row.status }, { status: "ended" });
  });
  return { ok: true };
}

const affiliationSelect = {
  id: true, status: true, startedBy: true, tnbaNumber: true, validFrom: true, validUntil: true, createdAt: true, decidedAt: true,
  club: { select: { id: true, name: true, kind: true, districtCode: true } },
  organization: { select: { id: true, name: true, shortName: true, level: true } },
  requestedBy: { select: { id: true, name: true } },
} as const;

export async function listOrgAffiliations(viewer: Viewer, organizationId: string, query: z.infer<typeof listAffiliationsQuery>) {
  await requireOrgManager(viewer, organizationId);
  const rows = await prisma.affiliation.findMany({
    where: { organizationId, ...(query.status ? { status: query.status } : {}) },
    select: affiliationSelect,
    orderBy: { createdAt: "desc" },
  });
  return { affiliations: rows };
}

export async function listClubAffiliations(viewer: Viewer, clubId: string) {
  await requireClubManager(viewer, clubId);
  const rows = await prisma.affiliation.findMany({ where: { clubId }, select: affiliationSelect, orderBy: { createdAt: "desc" } });
  return { affiliations: rows };
}
