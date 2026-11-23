import { readJson, route } from "@/server/http";
import { resetPassword, resetPasswordInput } from "@/server/services/auth.service";

/** POST /api/auth/reset-password — { token, newPassword } from the emailed link. */
export const POST = route(async (req) => resetPassword(await readJson(req, resetPasswordInput)));
