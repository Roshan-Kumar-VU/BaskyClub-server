import { clientIp, readJson, route } from "@/server/http";
import { recoverInput, recoverWithPhone } from "@/server/services/auth.service";

/** POST /api/auth/recover — { phone, dateOfBirth } → short-lived resetToken for /api/auth/reset-password. */
export const POST = route(async (req) => recoverWithPhone(await readJson(req, recoverInput), clientIp(req)));
