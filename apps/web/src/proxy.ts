// Cross-site request protection for the login cookie.
// The browser sends basky_token with every request to this site, so a change (POST, PATCH, PUT,
// DELETE) to /api/* or /session/* must come from this site's own pages. Browsers always send an
// Origin header on such requests; anything from another origin is refused before it reaches the
// API. (The cookie is also SameSite=Lax, which already stops most cross-site requests.)
import { NextResponse, type NextRequest } from "next/server";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

function sameSite(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    const allowed = new Set([request.nextUrl.origin]);
    if (process.env.WEB_URL) allowed.add(new URL(process.env.WEB_URL).origin);
    return allowed.has(origin);
  }
  // No Origin: only trust what the browser itself marks as same-origin
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export function proxy(request: NextRequest) {
  if (!SAFE.has(request.method) && !sameSite(request)) {
    return NextResponse.json({ error: { code: "cross_site", message: "This request must come from the BaskyCLub website." } }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/session/:path*"] };
