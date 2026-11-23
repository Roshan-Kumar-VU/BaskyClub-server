import { readJson, route } from "@/server/http";
import { forgotPassword, forgotPasswordInput } from "@/server/services/auth.service";

/** POST /api/auth/forgot-password — { email } → emails a reset link (same reply either way). */
export const POST = route(async (req) => forgotPassword(await readJson(req, forgotPasswordInput)));
