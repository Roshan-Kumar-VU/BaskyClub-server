import { readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { listUsers, listUsersQuery } from "@/server/services/admin.service";

/** GET /api/admin/users?q=&status= — Basky team: find accounts. */
export const GET = route(async (req) => listUsers(await requireViewer(req), readQuery(req, listUsersQuery)));
