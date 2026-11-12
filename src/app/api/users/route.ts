import { readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { searchPeople, searchPeopleQuery } from "@/server/services/profiles.service";

/** GET /api/users?q=priya — find people by name or phone (logged in). */
export const GET = route(async (req) => {
  await requireViewer(req);
  return searchPeople(readQuery(req, searchPeopleQuery));
});
