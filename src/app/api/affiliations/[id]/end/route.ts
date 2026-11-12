import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { endAffiliation } from "@/server/services/affiliations.service";

/** POST /api/affiliations/:id/end — either side ends (or withdraws) it. */
export const POST = route<{ id: string }>(async (req, { id }) => endAffiliation(await requireViewer(req), uuid.parse(id)));
