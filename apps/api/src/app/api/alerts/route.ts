import { readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { alerts, inboxQuery } from "@/server/services/announcements.service";

/** GET /api/alerts?box=inbox|sent&cursor= — the Alerts inbox (bell). */
export const GET = route(async (req) => alerts(await requireViewer(req), readQuery(req, inboxQuery)));
