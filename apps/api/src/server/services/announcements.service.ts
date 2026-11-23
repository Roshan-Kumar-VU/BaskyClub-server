// Announcements as phone alerts (#65, #75). They land in the Alerts inbox (bell) with a push alert;
// no likes or comments. "Also show in feed" adds a pinned Official card (a post linked by feed_post_id).
//
// Who can send to whom:
//   Association team (any current member)  → club_admins_in_area · affiliated_members · district_users · followers
//   Club owner / admin                     → club_members · followers
//   BaskyCLub team                         → everyone · district_users
// The inbox is worked out when it is opened (no per-person copies are stored), so someone who
// joins a club later also sees that club's recent member announcements.
import type { Prisma } from "@prisma/client";
import { LIMITS } from "@baskyclub/shared";
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, forbidden, notFound } from "../errors";
import { uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { decodeCursor } from "../lib/cursor";
import { sendPush } from "../lib/push";
import { limitRate } from "../lib/rate-limit";
import { activeClubIds, getClubPowers, getOrgPowers, isBaskyTeam } from "../permissions";

export const AUDIENCES = ["club_admins_in_area", "affiliated_members", "district_users", "followers", "club_members", "everyone"] as const;
type Audience = (typeof AUDIENCES)[number];

const ALLOWED: Record<"organization" | "club" | "basky", Audience[]> = {
  organization: ["club_admins_in_area", "affiliated_members", "district_users", "followers"],
  club: ["club_members", "followers"],
  basky: ["everyone", "district_users"],
};
const PER_DAY = 10;

export const sendAnnouncementInput = z.object({
  senderOrgId: uuid.optional(),
  senderClubId: uuid.optional(),
  audience: z.enum(AUDIENCES),
  districtCode: z.string().trim().toUpperCase().optional(),
  title: z.string().trim().min(LIMITS.announcementTitle.min).max(LIMITS.announcementTitle.max),
  body: z.string().trim().min(LIMITS.announcementBody.min).max(LIMITS.announcementBody.max),
  showInFeed: z.boolean().default(false),
});
export const inboxQuery = z.object({
  box: z.enum(["inbox", "sent"]).default("inbox"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function todayUtc() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Districts an association speaks for: its covered districts; a state body → its state; national → all. */
async function orgArea(org: { id: string; level: string; stateCode: string | null }): Promise<Prisma.DistrictWhereInput> {
  if (org.level === "district") return { associationId: org.id };
  if (org.level === "state" && org.stateCode) return { stateCode: org.stateCode };
  if (org.level === "national") return {};
  return { code: "__none__" }; // league operators have no area
}

// ---- Who receives it (for push alerts) ------------------------------------------------

async function recipientUserIds(a: {
  audience: string;
  senderOrgId: string | null;
  senderClubId: string | null;
  districtCode: string | null;
}): Promise<string[] | "everyone"> {
  const live = { status: { in: ["active", "limited"] } };
  switch (a.audience) {
    case "everyone":
      return "everyone";
    case "district_users":
      return (await prisma.user.findMany({ where: { homeDistrictCode: a.districtCode, ...live }, select: { id: true } })).map((u) => u.id);
    case "followers": {
      const target = a.senderOrgId ? { targetType: "organization", targetId: a.senderOrgId } : { targetType: "club", targetId: a.senderClubId! };
      return (await prisma.follow.findMany({ where: target, select: { followerId: true } })).map((f) => f.followerId);
    }
    case "club_members":
      return (await prisma.clubMembership.findMany({ where: { clubId: a.senderClubId!, status: "active" }, select: { userId: true } })).map((m) => m.userId);
    case "affiliated_members": {
      const clubs = await prisma.affiliation.findMany({
        where: { organizationId: a.senderOrgId!, status: "active", OR: [{ validUntil: null }, { validUntil: { gte: todayUtc() } }] },
        select: { clubId: true },
      });
      const rows = await prisma.clubMembership.findMany({ where: { clubId: { in: clubs.map((c) => c.clubId) }, status: "active" }, select: { userId: true } });
      return rows.map((r) => r.userId);
    }
    case "club_admins_in_area": {
      const org = await prisma.organization.findUniqueOrThrow({ where: { id: a.senderOrgId! } });
      const rows = await prisma.clubRole.findMany({
        where: { toAt: null, role: { in: ["owner", "admin"] }, club: { status: "approved", deletedAt: null, district: await orgArea(org) } },
        select: { userId: true },
      });
      return rows.map((r) => r.userId);
    }
  }
  return [];
}

async function pushTo(senderId: string, a: Parameters<typeof recipientUserIds>[0] & { id: string; title: string; body: string }) {
  const ids = await recipientUserIds(a);
  const tokens = await prisma.deviceToken.findMany({
    where: {
      user: { status: "active" },
      userId: { not: senderId },
      ...(ids === "everyone" ? {} : { userId: { in: [...new Set(ids)].filter((id) => id !== senderId) } }),
    },
    select: { token: true },
  });
  return sendPush(tokens.map((t) => ({ to: t.token, title: a.title, body: a.body, data: { type: "announcement", announcementId: a.id } })));
}

// ---- Send ---------------------------------------------------------------------------------

export async function sendAnnouncement(viewer: Viewer, input: z.infer<typeof sendAnnouncementInput>) {
  requireActive(viewer);
  if (input.senderOrgId && input.senderClubId) throw badRequest("one_sender", "Send as an association or as a club, not both.");

  let kind: keyof typeof ALLOWED = "basky";
  let feedDistrict: string | null = null;
  if (input.senderOrgId) {
    kind = "organization";
    const org = await prisma.organization.findUnique({ where: { id: input.senderOrgId } });
    if (!org || !["published", "claimed"].includes(org.pageStatus)) throw notFound("Association");
    const powers = await getOrgPowers(viewer, org.id);
    if (!powers.isMember && !isBaskyTeam(viewer)) throw forbidden("association_members_only", "Only the association's own team can send its announcements.");
    if (input.audience === "district_users") {
      if (!input.districtCode) throw badRequest("district_required", "Choose the district to send to.");
      const inArea = await prisma.district.findFirst({ where: { code: input.districtCode, ...(await orgArea(org)) } });
      if (!inArea) throw badRequest("outside_area", "This association can only alert districts it covers.");
    }
    if (org.level === "district") {
      feedDistrict = input.districtCode ?? (await prisma.district.findFirst({ where: { associationId: org.id }, orderBy: { code: "asc" } }))?.code ?? null;
    }
  } else if (input.senderClubId) {
    kind = "club";
    const club = await prisma.club.findFirst({ where: { id: input.senderClubId, deletedAt: null, status: "approved" } });
    if (!club) throw notFound("Club");
    const powers = await getClubPowers(viewer, club.id);
    if (!powers.isStaff && !isBaskyTeam(viewer)) throw forbidden("club_staff_only", "Only the club's owner or admins can send its announcements.");
    feedDistrict = club.districtCode;
  } else {
    if (!isBaskyTeam(viewer)) throw forbidden("basky_team_only", "Choose your association or club as the sender.");
    if (input.audience === "district_users") {
      if (!input.districtCode || !(await prisma.district.findUnique({ where: { code: input.districtCode } }))) {
        throw badRequest("district_required", "Choose the district to send to.");
      }
    }
    feedDistrict = input.audience === "district_users" ? input.districtCode! : null;
  }
  if (!ALLOWED[kind].includes(input.audience)) {
    throw badRequest("audience_not_allowed", `This sender can send to: ${ALLOWED[kind].join(", ")}.`);
  }
  await limitRate((since) => prisma.announcement.count({ where: { senderId: viewer.id, sentAt: { gte: since } } }), PER_DAY, 86400, "sending announcements");

  const districtCode = input.audience === "district_users" ? input.districtCode! : null;
  const announcement = await prisma.$transaction(async (tx) => {
    let feedPostId: string | null = null;
    if (input.showInFeed) {
      // The Official card: pinned, public (members-only for club_members)
      const post = await tx.post.create({
        data: {
          authorId: viewer.id,
          organizationId: input.senderOrgId,
          clubId: input.senderClubId,
          districtCode: feedDistrict,
          visibility: input.audience === "club_members" ? "members" : "public",
          content: `${input.title}\n\n${input.body}`,
          isPinned: true,
          moderationStatus: "published",
        },
      });
      feedPostId = post.id;
    }
    return tx.announcement.create({
      data: {
        senderId: viewer.id,
        senderOrgId: input.senderOrgId,
        senderClubId: input.senderClubId,
        audience: input.audience,
        districtCode,
        title: input.title,
        body: input.body,
        showInFeed: input.showInFeed,
        feedPostId,
      },
    });
  });

  const push = await pushTo(viewer.id, announcement);
  return { id: announcement.id, feedPostId: announcement.feedPostId, pushed: push.sent };
}

// ---- Alerts inbox ----------------------------------------------------------------------------

/** Every announcement this person is in the audience of. */
async function inboxWhere(viewer: Viewer): Promise<Prisma.AnnouncementWhereInput> {
  const [me, follows, myClubs, staffRoles] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: viewer.id }, select: { homeDistrictCode: true } }),
    prisma.follow.findMany({ where: { followerId: viewer.id }, select: { targetType: true, targetId: true } }),
    activeClubIds(viewer),
    prisma.clubRole.findMany({
      where: { userId: viewer.id, toAt: null, role: { in: ["owner", "admin"] }, club: { status: "approved", deletedAt: null } },
      select: { club: { select: { district: { select: { associationId: true, stateCode: true } } } } },
    }),
  ]);
  const followed = (t: string) => follows.filter((f) => f.targetType === t).map((f) => f.targetId);

  const affiliatedOrgs = (
    await prisma.affiliation.findMany({
      where: { clubId: { in: myClubs }, status: "active", OR: [{ validUntil: null }, { validUntil: { gte: todayUtc() } }] },
      select: { organizationId: true },
    })
  ).map((a) => a.organizationId);

  // Associations whose area includes a club I run
  const assocIds = staffRoles.map((r) => r.club.district.associationId).filter((x): x is string => !!x);
  const stateCodes = staffRoles.map((r) => r.club.district.stateCode);
  const areaOrgs = staffRoles.length
    ? (
        await prisma.organization.findMany({
          where: { OR: [{ level: "district", id: { in: assocIds } }, { level: "state", stateCode: { in: stateCodes } }, { level: "national" }] },
          select: { id: true },
        })
      ).map((o) => o.id)
    : [];

  return {
    OR: [
      { audience: "everyone" },
      { audience: "followers", OR: [{ senderOrgId: { in: followed("organization") } }, { senderClubId: { in: followed("club") } }] },
      { audience: "club_members", senderClubId: { in: myClubs } },
      { audience: "affiliated_members", senderOrgId: { in: affiliatedOrgs } },
      { audience: "club_admins_in_area", senderOrgId: { in: areaOrgs } },
      ...(me.homeDistrictCode ? [{ audience: "district_users", districtCode: me.homeDistrictCode }] : []),
    ],
  };
}

export async function alerts(viewer: Viewer, query: z.infer<typeof inboxQuery>) {
  const cursor = decodeCursor(query.cursor);
  const base = query.box === "sent" ? { senderId: viewer.id } : await inboxWhere(viewer);
  const rows = await prisma.announcement.findMany({
    where: {
      AND: [
        base,
        cursor ? { OR: [{ sentAt: { lt: cursor.at } }, { sentAt: cursor.at, id: { lt: cursor.id } }] } : {},
      ],
    },
    select: {
      id: true, title: true, body: true, audience: true, districtCode: true, sentAt: true, feedPostId: true,
      sender: { select: { id: true, name: true } },
      senderOrg: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      senderClub: { select: { id: true, name: true, logoUrl: true } },
    },
    orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
  });
  const more = rows.length > query.limit;
  const page = more ? rows.slice(0, query.limit) : rows;
  const last = page.at(-1);
  return {
    alerts: page.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      districtCode: a.districtCode,
      sentAt: a.sentAt,
      feedPostId: a.feedPostId,
      from: a.senderOrg
        ? { type: "organization", ...a.senderOrg }
        : a.senderClub
          ? { type: "club", ...a.senderClub }
          : { type: "basky", id: null, name: "BaskyCLub" },
      sentBy: a.sender.name,
    })),
    nextCursor: more && last ? Buffer.from(`${last.sentAt.toISOString()}|${last.id}`).toString("base64url") : null,
  };
}
