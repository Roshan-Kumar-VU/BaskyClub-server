// Phones and browsers that receive alerts. The app registers its Expo push token after login
// and removes it on logout.
import { z } from "zod";
import { prisma } from "../db";
import type { Viewer } from "../auth/viewer";

export const registerDeviceInput = z
  .object({
    token: z.string().trim().min(10).max(300),
    platform: z.enum(["ios", "android", "web"]),
  })
  .refine((d) => d.platform === "web" || /^Expo(nent)?PushToken\[.+\]$/.test(d.token), {
    message: "Phone tokens look like ExponentPushToken[...]",
    path: ["token"],
  });

export async function registerDevice(viewer: Viewer, input: z.infer<typeof registerDeviceInput>) {
  // A phone that changes hands (log out / log in as someone else) moves to the new person
  await prisma.deviceToken.upsert({
    where: { token: input.token },
    create: { userId: viewer.id, token: input.token, platform: input.platform },
    update: { userId: viewer.id, platform: input.platform, lastSeenAt: new Date() },
  });
  return { ok: true };
}

export async function removeDevice(viewer: Viewer, token: string) {
  await prisma.deviceToken.deleteMany({ where: { token, userId: viewer.id } });
  return { ok: true };
}
