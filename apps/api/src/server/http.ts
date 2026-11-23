// Small helpers shared by every API route (src/app/api/**/route.ts).
// Routes stay thin: read the request, call one service, return its result.
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { readLoginToken } from "./auth/token";
import { AppError, badRequest } from "./errors";
import { describePath, log, newRequestId, whereThrown } from "./lib/log";

/** Wrap a result to reply with 201 Created instead of 200. */
export class Created<T> {
  constructor(public body: T) {}
}
export const created = <T>(body: T) => new Created(body);

type RouteContext<P> = { params: Promise<P> };

/**
 * Turns a handler into a Next.js route function:
 * - returns JSON,
 * - turns AppError / validation / database errors into a clean JSON error,
 * - logs every error as one line saying which module and route it came from (see lib/log.ts),
 * - tags each reply with an x-request-id so a user's error can be matched to its log line.
 */
export function route<P = Record<string, never>>(
  handler: (req: Request, params: P) => Promise<unknown>,
) {
  return async (req: Request, ctx: RouteContext<P>): Promise<Response> => {
    const started = Date.now();
    const incoming = req.headers.get("x-request-id");
    const requestId = incoming && /^[\w-]{4,40}$/.test(incoming) ? incoming : newRequestId();
    let res: Response;
    try {
      const params = ctx?.params ? await ctx.params : ({} as P);
      const result = await handler(req, params);
      if (result instanceof Created) res = Response.json(result.body, { status: 201 });
      else if (result instanceof Response) res = result;
      else res = Response.json(result ?? { ok: true });
    } catch (err) {
      const e = toAppError(err);
      await logError(req, err, e, requestId, Date.now() - started);
      res = errorResponse(e, requestId);
    }
    try {
      res.headers.set("x-request-id", requestId);
    } catch {
      // Some responses (e.g. redirects) have read-only headers.
    }
    return res;
  };
}

export function errorResponse(err: unknown, requestId?: string): Response {
  const e = toAppError(err);
  return Response.json(
    { error: { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}), ...(requestId ? { requestId } : {}) } },
    { status: e.status },
  );
}

async function logError(req: Request, raw: unknown, e: AppError, requestId: string, ms: number) {
  const { module, route } = describePath(new URL(req.url).pathname);
  const auth = req.headers.get("authorization");
  const user = auth?.startsWith("Bearer ") ? await readLoginToken(auth.slice(7)).catch(() => null) : null;
  const stack = raw instanceof Error ? raw.stack : undefined;
  const fields = {
    module,
    route: `${req.method} ${route}`,
    status: e.status,
    code: e.code,
    user: user ?? undefined,
    req: requestId,
    ms,
  };
  if (e.status >= 500) log("ERROR", { ...fields, at: whereThrown(stack) }, stack ?? String(raw));
  else log("WARN", fields);
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof z.ZodError) {
    return badRequest(
      "invalid_input",
      "Some fields are missing or not valid.",
      err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }
  if (isPrismaKnownError(err)) {
    // Database rules (unique indexes, foreign keys) are the last line of defence.
    if (err.code === "P2002") return new AppError(409, "already_exists", "This already exists.");
    if (err.code === "P2003") return badRequest("bad_reference", "Something this refers to does not exist.");
    if (err.code === "P2025") return new AppError(404, "not_found", "Item not found.");
  }
  return new AppError(500, "server_error", "Something went wrong on our side. Please try again.");
}

function isPrismaKnownError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    (err instanceof Error && err.name === "PrismaClientKnownRequestError" && typeof (err as { code?: unknown }).code === "string")
  );
}

/** Reads and checks the JSON body against a schema. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("invalid_json", "The request body must be JSON.");
  }
  return schema.parse(body);
}

/** Reads ?key=value query parameters against a schema. */
export function readQuery<S extends z.ZodType>(req: Request, schema: S): z.infer<S> {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return schema.parse(params);
}

/** First IP address of the caller (for signup_ip / last_login_ip). */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

// Common field checks
export const uuid = z.uuid({ message: "Must be a valid id." });

/**
 * A calendar day as "YYYY-MM-DD" → Date at 00:00 UTC. Refuses days that don't exist
 * (2026-02-31, 2025-02-29, month 13), which `new Date()` would otherwise roll over silently.
 */
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")
  .refine((s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return true; // the format message above already covers it
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Not a real date.")
  .transform((s) => new Date(`${s}T00:00:00.000Z`));
export const paging = {
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
};
