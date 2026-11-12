import { z } from "zod";
import { readJson, readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { registerDevice, registerDeviceInput, removeDevice } from "@/server/services/devices.service";

/** POST /api/devices — { token, platform } after login. */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return registerDevice(viewer, await readJson(req, registerDeviceInput));
});

/** DELETE /api/devices?token=... — on logout. */
export const DELETE = route(async (req) =>
  removeDevice(await requireViewer(req), readQuery(req, z.object({ token: z.string().min(10) })).token),
);
