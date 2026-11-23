import { clientIp, created, readJson, route } from "@/server/http";
import { signup, signupInput } from "@/server/services/auth.service";

/** POST /api/auth/signup — create an account (under-18: parent's name + email required). */
export const POST = route(async (req) => created(await signup(await readJson(req, signupInput), clientIp(req))));
