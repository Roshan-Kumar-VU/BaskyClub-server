// Courts and the Clubs-tab map (clubs + courts near you), plus club practice hours.
// Anyone can suggest a court; it shows on the map once the Basky team approves it.
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, forbidden, notFound } from "../errors";
import { uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { mediaUrl } from "../lib/media";
import { getClubPowers, isBaskyTeam, logChange, requireBaskyTeam, requireClubManager } from "../permissions";

const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);
const SURFACES = ["hardwood", "synthetic", "concrete", "outdoor_asphalt"] as const;

export const courtInput = z.object({
  name: z.string().trim().min(2).max(120),
  districtCode: z.string().trim().toUpperCase(),
  clubId: uuid.optional(),
  indoor: z.boolean().default(false),
  surface: z.enum(SURFACES).optional(),
  address: z.string().trim().max(300).optional(),
  latitude: lat,
  longitude: lng,
  imageUrls: z.array(mediaUrl).max(10).default([]),
});
export const updateCourtInput = courtInput.omit({ clubId: true }).partial();
export const reviewCourtInput = z.object({ decision: z.enum(["approve", "reject"]) });

export const mapQuery = z
  .object({
    lat: lat.optional(),
    lng: lng.optional(),
    radiusKm: z.coerce.number().min(1).max(200).default(25),
    districtCode: z.string().trim().toUpperCase().optional(),
  })
  .refine((q) => (q.lat !== undefined && q.lng !== undefined) || q.districtCode, { message: "Send lat & lng, or a districtCode." });

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time like 06:30.");
export const timingsInput = z.object({
  timings: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(1).max(7),
        isFullDay: z.boolean().default(false),
        morningStart: time.nullable().optional(),
        morningEnd: time.nullable().optional(),
        eveningStart: time.nullable().optional(),
        eveningEnd: time.nullable().optional(),
      }),
    )
    .max(7),
});

// ---- Distance helpers -------------------------------------------------------------------

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** A rough box around the point, so the database only returns nearby rows. */
function box(latC: number, lngC: number, km: number) {
  const dLat = km / 111;
  const dLng = km / (111 * Math.max(Math.cos((latC * Math.PI) / 180), 0.01));
  return { latitude: { gte: latC - dLat, lte: latC + dLat }, longitude: { gte: lngC - dLng, lte: lngC + dLng } };
}

// ---- Map: clubs + courts near you ---------------------------------------------------------------

export async function map(query: z.infer<typeof mapQuery>) {
  const near = query.lat !== undefined && query.lng !== undefined;
  const area = near ? box(query.lat!, query.lng!, query.radiusKm) : {};
  const district = query.districtCode ? { districtCode: query.districtCode } : {};

  const [clubs, courts] = await Promise.all([
    prisma.club.findMany({
      where: { status: "approved", deletedAt: null, latitude: { not: null }, longitude: { not: null }, ...district, ...(area as Prisma.ClubWhereInput) },
      select: { id: true, name: true, kind: true, logoUrl: true, latitude: true, longitude: true, districtCode: true },
      take: 500,
    }),
    prisma.court.findMany({
      where: { status: "approved", deletedAt: null, latitude: { not: null }, longitude: { not: null }, ...district, ...(area as Prisma.CourtWhereInput) },
      select: { id: true, name: true, indoor: true, surface: true, address: true, latitude: true, longitude: true, districtCode: true, clubId: true, imageUrls: true },
      take: 500,
    }),
  ]);

  const place = <T extends { latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null }>(x: T) => {
    const la = x.latitude!.toNumber();
    const lo = x.longitude!.toNumber();
    return { ...x, latitude: la, longitude: lo, distanceKm: near ? Math.round(distanceKm(query.lat!, query.lng!, la, lo) * 10) / 10 : null };
  };
  const within = <T extends { distanceKm: number | null }>(x: T) => !near || (x.distanceKm ?? 0) <= query.radiusKm;
  const byDistance = (a: { distanceKm: number | null }, b: { distanceKm: number | null }) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0);

  return {
    clubs: clubs.map(place).filter(within).sort(byDistance),
    courts: courts.map(place).filter(within).sort(byDistance),
  };
}

// ---- Courts ---------------------------------------------------------------------------------------

export async function getCourt(viewer: Viewer | null, courtId: string) {
  const court = await prisma.court.findFirst({ where: { id: courtId, deletedAt: null }, include: { club: { select: { id: true, name: true } } } });
  if (!court) throw notFound("Court");
  if (court.status !== "approved" && court.createdById !== viewer?.id && !isBaskyTeam(viewer)) throw notFound("Court");
  return { ...court, latitude: court.latitude?.toNumber() ?? null, longitude: court.longitude?.toNumber() ?? null, aiValidationData: undefined };
}

export async function addCourt(viewer: Viewer, input: z.infer<typeof courtInput>) {
  requireActive(viewer);
  if (!(await prisma.district.findUnique({ where: { code: input.districtCode } }))) throw badRequest("unknown_district", "Choose a district from the list.");
  if (input.clubId) {
    const powers = await getClubPowers(viewer, input.clubId);
    if (!powers.canManage) throw forbidden("club_staff_only", "Only the club's owner or admins can add the club's court.");
  }
  const court = await prisma.court.create({
    data: { ...input, status: isBaskyTeam(viewer) ? "approved" : "pending", createdById: viewer.id },
  });
  return { id: court.id, status: court.status };
}

async function requireCourtEditor(viewer: Viewer, courtId: string) {
  const court = await prisma.court.findFirst({ where: { id: courtId, deletedAt: null } });
  if (!court) throw notFound("Court");
  const basky = isBaskyTeam(viewer);
  const clubStaff = court.clubId ? (await getClubPowers(viewer, court.clubId)).isStaff : false;
  const creatorWhilePending = court.createdById === viewer.id && court.status === "pending";
  if (!basky && !clubStaff && !creatorWhilePending) throw forbidden("not_allowed", "You can't change this court.");
  return court;
}

export async function updateCourt(viewer: Viewer, courtId: string, input: z.infer<typeof updateCourtInput>) {
  await requireCourtEditor(viewer, courtId);
  if (input.districtCode && !(await prisma.district.findUnique({ where: { code: input.districtCode } }))) {
    throw badRequest("unknown_district", "Choose a district from the list.");
  }
  await prisma.court.update({ where: { id: courtId }, data: input });
  return { ok: true };
}

export async function deleteCourt(viewer: Viewer, courtId: string) {
  await requireCourtEditor(viewer, courtId);
  await prisma.court.update({ where: { id: courtId }, data: { deletedAt: new Date() } });
  return { ok: true };
}

export async function reviewCourt(viewer: Viewer, courtId: string, input: z.infer<typeof reviewCourtInput>) {
  requireBaskyTeam(viewer);
  const court = await prisma.court.findFirst({ where: { id: courtId, deletedAt: null } });
  if (!court) throw notFound("Court");
  const status = input.decision === "approve" ? "approved" : "rejected";
  await prisma.$transaction(async (tx) => {
    await tx.court.update({ where: { id: court.id }, data: { status } });
    await logChange(tx, viewer.id, "courts", court.id, "update", { status: court.status }, { status });
  });
  return { id: court.id, status };
}

export async function pendingCourts(viewer: Viewer) {
  requireBaskyTeam(viewer);
  const courts = await prisma.court.findMany({
    where: { status: "pending", deletedAt: null },
    include: { createdBy: { select: { id: true, name: true } }, club: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return { courts: courts.map((c) => ({ ...c, latitude: c.latitude?.toNumber() ?? null, longitude: c.longitude?.toNumber() ?? null })) };
}

// ---- Practice hours ---------------------------------------------------------------------------------

/** Replaces the club's whole weekly timetable. */
export async function setTimings(viewer: Viewer, clubId: string, input: z.infer<typeof timingsInput>) {
  await requireClubManager(viewer, clubId);
  const days = input.timings.map((t) => t.dayOfWeek);
  if (new Set(days).size !== days.length) throw badRequest("duplicate_day", "Each day can appear only once.");
  for (const t of input.timings) {
    if (t.morningStart && t.morningEnd && t.morningEnd <= t.morningStart) throw badRequest("bad_time", "Morning end must be after start.");
    if (t.eveningStart && t.eveningEnd && t.eveningEnd <= t.eveningStart) throw badRequest("bad_time", "Evening end must be after start.");
  }
  await prisma.$transaction([
    prisma.clubCourtTiming.deleteMany({ where: { clubId } }),
    prisma.clubCourtTiming.createMany({ data: input.timings.map((t) => ({ ...t, clubId })) }),
  ]);
  return { timings: input.timings.sort((a, b) => a.dayOfWeek - b.dayOfWeek) };
}
