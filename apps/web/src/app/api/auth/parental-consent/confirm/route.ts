import { z } from "zod";
import { readJson, route } from "@/server/http";
import { confirmParentalConsent } from "@/server/services/auth.service";

/** POST /api/auth/parental-consent/confirm — the parent opens the emailed link (#67). */
export const POST = route(async (req) => {
  const { token } = await readJson(req, z.object({ token: z.string().min(10) }));
  return confirmParentalConsent(token);
});
