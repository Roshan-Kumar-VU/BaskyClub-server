import { created, readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { sendAnnouncement, sendAnnouncementInput } from "@/server/services/announcements.service";

/** POST /api/announcements — { senderOrgId? | senderClubId?, audience, districtCode?, title, body, showInFeed } */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return created(await sendAnnouncement(viewer, await readJson(req, sendAnnouncementInput)));
});
