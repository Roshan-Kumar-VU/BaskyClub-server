import { readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { changeLog, changeLogQuery } from "@/server/services/admin.service";

/** GET /api/admin/change-log?entity=clubs&entityId= — who changed what (#61). */
export const GET = route(async (req) => changeLog(await requireViewer(req), readQuery(req, changeLogQuery)));
