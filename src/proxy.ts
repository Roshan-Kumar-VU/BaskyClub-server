// Lets the app's web version (Expo web, a different address) call this API from a browser.
// Phone apps don't need this; browsers do. Allowed addresses come from CORS_ORIGINS in .env
// (comma-separated); while testing, the usual Expo web addresses are allowed.
import { NextResponse, type NextRequest } from "next/server";

const DEV_ORIGINS = ["http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:19006"];

function allowedOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return process.env.NODE_ENV === "production" ? fromEnv : [...DEV_ORIGINS, ...fromEnv];
}

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id",
  "Access-Control-Expose-Headers": "X-Request-Id",
  "Access-Control-Max-Age": "86400",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = allowedOrigins().includes(origin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: { ...(allowed ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}), ...corsHeaders },
    });
  }

  const response = NextResponse.next();
  if (allowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
  }
  return response;
}

export const config = { matcher: "/api/:path*" };
