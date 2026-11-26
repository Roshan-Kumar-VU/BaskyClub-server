import { readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { casesQuery, listCases } from "@/server/services/moderation.service";

/** GET /api/moderation/cases?status=open&source=no_club_review — moderators. */
export const GET = route(async (req) => listCases(await requireViewer(req), readQuery(req, casesQuery)));
