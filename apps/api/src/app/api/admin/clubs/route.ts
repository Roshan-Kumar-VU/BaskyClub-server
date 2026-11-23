import { z } from "zod";
import { readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { listClubsForReview } from "@/server/services/clubs.service";

const query = z.object({ status: z.enum(["pending", "approved", "suspended"]).default("pending") });

/** GET /api/admin/clubs?status=pending — Basky team review queue. */
export const GET = route(async (req) => listClubsForReview(await requireViewer(req), readQuery(req, query).status));
