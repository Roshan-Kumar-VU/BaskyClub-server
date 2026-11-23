// Clubs: list, page, register, edit, BaskyCLub review (approve / suspend).
import { LIMITS, type ClubCardData, type ClubKind, type ClubStatus } from "@baskyclub/shared";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, forbidden, notFound } from "../errors";
import { paging } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { mediaUrl } from "../lib/media";
import { getClubPowers, logChange, requireBaskyTeam, requireClubManager } from "../permissions";
import { followerCount, isFollowing } from "./follows.service";

export const CLUB_KINDS = ["club", "academy", "creator_group", "franchise"] as const;
export const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

const coordinate = z.coerce.number().refine(Number.isFinite);

const clubFields = {
  name: z.string().trim().min(LIMITS.clubName.min).max(LIMITS.clubName.max),
  kind: z.enum(CLUB_KINDS).default("club"),
  districtCode: z.string().trim().toUpperCase(),
  description: z.string().trim().max(2000).optional(),
  motto: z.string().trim().max(120).optional(),
  logoUrl: mediaUrl.optional(),
  bannerUrl: mediaUrl.optional(),
  latitude: coordinate.refine((n) => n >= -90 && n <= 90).optional(),
  longitude: coordinate.refine((n) => n >= -180 && n <= 180).optional(),
};

export const registerClubInput = z.object({
  ...clubFields,
  /** Does the person registering also play for the club? */
  iPlay: z.boolean().default(false),
  primaryPosition: z.enum(POSITIONS).optional(),
});

export const updateClubInput = z
  .object({
    name: clubFields.name,
    description: clubFields.description.nullable(),
    motto: clubFields.motto.nullable(),
    logoUrl: clubFields.logoUrl.nullable(),
    bannerUrl: clubFields.bannerUrl.nullable(),
    latitude: clubFields.latitude.nullable(),
    longitude: clubFields.longitude.nullable(),
  })
  .partial();

export const listClubsQuery = z.object({
  districtCode: z.string().trim().toUpperCase().optional(),
  stateCode: z.string().trim().toUpperCase().optional(),
  kind: z.enum(CLUB_KINDS).optional(),
  q: z.string().trim().max(80).optional(),
  ...paging,
});

export const reviewClubInput = z.object({
  decision: z.enum(["approve", "suspend", "reinstate"]),
  note: z.string().trim().max(500).optional(),
});

// ---- Shared pieces -----------------------------------------------------------

/** "Affiliated" is computed, never stored (#58): an active affiliation still in date. */
function activeAffiliationWhere(): Prisma.AffiliationWhereInput {
  return { status: "active", OR: [{ validUntil: null }, { validUntil: { gte: startOfToday() } }] };
}

function startOfToday(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const clubCardSelect = {
  id: true,
  name: true,
  kind: true,
  status: true,
  districtCode: true,
  logoUrl: true,
  latitude: true,
  longitude: true,
  district: { select: { name: true, stateCode: true } },
  badges: { where: { status: "active", badge: "basky_verified" }, select: { id: true }, take: 1 },
  affiliations: {
    where: activeAffiliationWhere(),
    select: { organization: { select: { id: true, name: true, shortName: true } }, validUntil: true, tnbaNumber: true },
    take: 1,
  },
  _count: { select: { memberships: { where: { status: "active" } } } },
} satisfies Prisma.ClubSelect;

type ClubCardRow = Prisma.ClubGetPayload<{ select: typeof clubCardSelect }>;

/** Shape shared with the apps (packages/shared wire.ts); text columns narrowed to their unions here. */
function toClubCard(c: ClubCardRow): ClubCardData {
  const affiliation = c.affiliations[0];
  return {
    id: c.id,
    name: c.name,
    kind: c.kind as ClubKind,
    status: c.status as ClubStatus,
    districtCode: c.districtCode,
    districtName: c.district.name,
    stateCode: c.district.stateCode,
    logoUrl: c.logoUrl,
    latitude: c.latitude?.toNumber() ?? null,
    longitude: c.longitude?.toNumber() ?? null,
    isVerified: c.badges.length > 0,
    /** null → show "Community club" */
    affiliatedTo: affiliation ? { ...affiliation.organization, validUntil: affiliation.validUntil, tnbaNumber: affiliation.tnbaNumber } : null,
    memberCount: c._count.memberships,
  };
}

async function findLiveClub(clubId: string) {
  const club = await prisma.club.findFirst({ where: { id: clubId, deletedAt: null } });
  if (!club) throw notFound("Club");
  return club;
}

// ---- List (Clubs tab) ------------------------------------------------------------

export async function listClubs(query: z.infer<typeof listClubsQuery>) {
  const where: Prisma.ClubWhereInput = {
    status: "approved",
    deletedAt: null,
    ...(query.districtCode ? { districtCode: query.districtCode } : {}),
    ...(query.stateCode ? { district: { stateCode: query.stateCode } } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.q ? { name: { contains: query.q, mode: "insensitive" as const } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.club.findMany({
      where,
      select: clubCardSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: query.limit,
      skip: query.offset,
    }),
    prisma.club.count({ where }),
  ]);
  return { clubs: rows.map(toClubCard), total, limit: query.limit, offset: query.offset };
}

// ---- Club page ---------------------------------------------------------------------

export async function getClub(viewer: Viewer | null, clubId: string) {
  const club = await prisma.club.findFirst({
    where: { id: clubId, deletedAt: null },
    select: {
      ...clubCardSelect,
      description: true,
      motto: true,
      bannerUrl: true,
      createdAt: true,
      roles: {
        where: { toAt: null },
        select: { id: true, role: true, fromAt: true, user: { select: { id: true, name: true, photoUrl: true } } },
        orderBy: { fromAt: "asc" },
      },
      coaches: {
        where: { endedAt: null },
        select: { id: true, name: true, role: true, isPrimary: true, photoUrl: true, userId: true },
        orderBy: [{ isPrimary: "desc" }, { startedAt: "asc" }],
      },
      timings: { orderBy: { dayOfWeek: "asc" } },
      courts: {
        where: { deletedAt: null, status: "approved" },
        select: { id: true, name: true, indoor: true, surface: true, address: true },
      },
    },
  });
  if (!club) throw notFound("Club");

  const powers = await getClubPowers(viewer, clubId);
  // Clubs waiting for approval or suspended are only visible to their staff and the Basky team.
  if (club.status !== "approved" && !powers.canManage) throw notFound("Club");

  const followTarget = { targetType: "club" as const, targetId: clubId };
  const [followers, following] = await Promise.all([followerCount(followTarget), isFollowing(viewer, followTarget)]);

  const myMembership = viewer
    ? await prisma.clubMembership.findFirst({
        where: { clubId, userId: viewer.id, status: { in: ["pending", "active"] } },
        select: { id: true, status: true, isPlayer: true, primaryPosition: true },
      })
    : null;

  return {
    ...toClubCard(club),
    description: club.description,
    motto: club.motto,
    bannerUrl: club.bannerUrl,
    createdAt: club.createdAt,
    staff: club.roles.map((r) => ({ roleId: r.id, role: r.role, since: r.fromAt, ...r.user })),
    coaches: club.coaches,
    timings: club.timings.map(({ clubId: _c, id: _i, ...t }) => t),
    courts: club.courts,
    followerCount: followers,
    viewer: {
      isFollowing: following,
      membership: myMembership,
      isOwner: powers.isOwner,
      isAdmin: powers.isAdmin,
      isCaptain: powers.isCaptain,
      canManage: powers.canManage,
    },
  };
}

// ---- Register a club -------------------------------------------------------------------

export async function registerClub(viewer: Viewer, input: z.infer<typeof registerClubInput>) {
  requireActive(viewer);
  if (viewer.isMinor) {
    throw forbidden("adult_required", "A club must be registered by someone aged 18 or over.");
  }
  const district = await prisma.district.findUnique({ where: { code: input.districtCode } });
  if (!district) throw badRequest("unknown_district", "Choose a district from the list.");

  const { iPlay, primaryPosition, ...fields } = input;
  const club = await prisma.$transaction(async (tx) => {
    const created = await tx.club.create({ data: { ...fields, status: "pending", createdById: viewer.id } });
    await tx.clubRole.create({ data: { clubId: created.id, userId: viewer.id, role: "owner", grantedById: viewer.id } });
    await tx.clubMembership.create({
      data: {
        clubId: created.id,
        userId: viewer.id,
        status: "active",
        isPlayer: iPlay,
        primaryPosition: iPlay ? primaryPosition : null,
        joinedAt: new Date(),
        approvedById: viewer.id,
      },
    });
    return created;
  });
  return { id: club.id, name: club.name, status: club.status };
}

// ---- Edit club details -------------------------------------------------------------------

export async function updateClub(viewer: Viewer, clubId: string, input: z.infer<typeof updateClubInput>) {
  const club = await findLiveClub(clubId);
  await requireClubManager(viewer, clubId);
  const updated = await prisma.club.update({ where: { id: club.id }, data: input });
  return { id: updated.id, name: updated.name };
}

// ---- BaskyCLub review: approve / suspend / reinstate --------------------------------------

export async function reviewClub(viewer: Viewer, clubId: string, input: z.infer<typeof reviewClubInput>) {
  requireBaskyTeam(viewer);
  const club = await findLiveClub(clubId);

  const next = { approve: "approved", suspend: "suspended", reinstate: "approved" }[input.decision];
  const allowedFrom: Record<string, string[]> = {
    approve: ["pending"],
    suspend: ["pending", "approved"],
    reinstate: ["suspended"],
  };
  if (!allowedFrom[input.decision].includes(club.status)) {
    throw badRequest("wrong_status", `Cannot ${input.decision} a club that is ${club.status}.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.club.update({ where: { id: clubId }, data: { status: next } });
    await logChange(tx, viewer.id, "clubs", clubId, "update", { status: club.status }, {
      status: next,
      note: input.note ?? null,
    });
  });
  return { id: clubId, status: next };
}

/** Basky team queue: clubs waiting for approval (or any status). */
export async function listClubsForReview(viewer: Viewer, status: string) {
  requireBaskyTeam(viewer);
  const rows = await prisma.club.findMany({
    where: { status, deletedAt: null },
    select: { ...clubCardSelect, createdAt: true, createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return { clubs: rows.map((c) => ({ ...toClubCard(c), createdAt: c.createdAt, createdBy: c.createdBy })) };
}

