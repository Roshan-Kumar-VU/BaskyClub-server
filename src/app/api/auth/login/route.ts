import { clientIp, readJson, route } from "@/server/http";
import { login, loginInput } from "@/server/services/auth.service";

/** POST /api/auth/login — email or phone + password → login token. */
export const POST = route(async (req) => login(await readJson(req, loginInput), clientIp(req)));
