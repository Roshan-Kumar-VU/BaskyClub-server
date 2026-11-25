import { NextResponse, type NextRequest } from "next/server";
import { apiUrl, webUrl } from "../../_lib/config";

// Website login. The API hands out a login token; this site keeps it in an httpOnly cookie, so
// page scripts never see it. The API reads the same cookie (basky_token) on every /api call the
// browser makes through this site. Cross-site requests are refused in src/proxy.ts.
//
//   POST /session/login   { login, password }       → { ok: true }
//   POST /session/signup  { ...signup fields }      → { ok: true, awaitingParent, parentConsentLink? }
//   POST /session/logout                            → { ok: true }

const COOKIE = "basky_token"; // apps/api src/server/auth/viewer.ts LOGIN_COOKIE
// Readable by page scripts, holds no secret: tells the page a login cookie exists, so an expired one
// can be cleared (the API refuses every request that carries an expired token, even public reads).
const MARKER = "basky_in";
const MAX_AGE = 30 * 24 * 60 * 60; // the API's login token lasts 30 days
const MAX_BODY = 16 * 1024;

const secure = webUrl.startsWith("https://");

function setLogin(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: MAX_AGE });
  res.cookies.set(MARKER, "1", { httpOnly: false, sameSite: "lax", secure, path: "/", maxAge: MAX_AGE });
}

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Sends the browser's request on to the API, keeping its address for the API's rate limits. */
async function forward(req: NextRequest, path: string, body: string) {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  if (ip) headers["x-forwarded-for"] = ip;
  return fetch(`${apiUrl}${path}`, { method: "POST", headers, body, cache: "no-store", signal: AbortSignal.timeout(15_000) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 });
    res.cookies.set(MARKER, "", { httpOnly: false, sameSite: "lax", secure, path: "/", maxAge: 0 });
    return res;
  }
  if (action !== "login" && action !== "signup") return fail(404, "not_found", "Not found.");

  const body = await req.text();
  if (body.length > MAX_BODY) return fail(413, "too_big", "That request is too big.");

  let upstream: Response;
  try {
    upstream = await forward(req, `/api/auth/${action}`, body);
  } catch {
    return fail(502, "api_unreachable", "Can't reach BaskyCLub right now. Please try again.");
  }
  const json = await upstream.json().catch(() => null);
  if (!upstream.ok || typeof json?.token !== "string") {
    return NextResponse.json(json ?? { error: { code: "error", message: "Something went wrong. Please try again." } }, { status: upstream.ok ? 502 : upstream.status });
  }

  // Everything except the token goes back to the page
  const { token, ...rest } = json as { token: string } & Record<string, unknown>;
  const res = NextResponse.json({ ok: true, ...rest });
  setLogin(res, token);
  return res;
}
