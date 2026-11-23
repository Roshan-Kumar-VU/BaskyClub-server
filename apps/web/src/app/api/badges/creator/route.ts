import { created, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { creatorStatus, requestCreatorBadge, withdrawCreatorRequest } from "@/server/services/badges.service";

/** GET /api/badges/creator — my Creator badge status: none / requested / active / declined. */
export const GET = route(async (req) => creatorStatus((await requireViewer(req)).id));

/** POST /api/badges/creator — ask the BaskyCLub team for the Creator badge (adults). */
export const POST = route(async (req) => created(await requestCreatorBadge(await requireViewer(req))));

/** DELETE /api/badges/creator — withdraw my open request. */
export const DELETE = route(async (req) => withdrawCreatorRequest(await requireViewer(req)));
