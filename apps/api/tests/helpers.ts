// Test helpers: call the real API routes (no server needed) as any test account.
import "./env";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { after } from "node:test";
import { prisma } from "../src/server/db";
import { seedCommunity, seedPlaces, seedRound3, seedTestWorld, TEST_PASSWORD, TEST_USERS, type TestUserKey } from "../prisma/seed";

export { prisma, TEST_USERS, TEST_PASSWORD };
export type { TestUserKey };

// Close the database connection when a test file finishes, so the run ends promptly.
after(() => prisma.$disconnect());
export { ID, TEST_ANNOUNCEMENTS, TEST_CLUBS, TEST_ORGS, TEST_POSTS } from "../prisma/seed";

// ---- Route table built from src/app/api/**/route.ts -------------------------------

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
interface RouteEntry {
  pattern: RegExp;
  names: string[];
  file: string;
}

const API_DIR = join(__dirname, "..", "src", "app", "api");

function findRoutes(dir: string): RouteEntry[] {
  const out: RouteEntry[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findRoutes(full));
    else if (name === "route.ts") {
      const parts = relative(API_DIR, dir).split(sep).filter(Boolean);
      const names: string[] = [];
      const regex = parts
        .map((p) => {
          const rest = p.match(/^\[\.\.\.(.+)\]$/);
          if (rest) {
            names.push(rest[1]);
            return "(.+)";
          }
          const m = p.match(/^\[(.+)\]$/);
          if (m) {
            names.push(m[1]);
            return "([^/]+)";
          }
          return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/");
      out.push({ pattern: new RegExp(`^/api/${regex}$`), names, file: full });
    }
  }
  // Fixed segments win over [id] segments
  return out.sort((a, b) => a.names.length - b.names.length);
}
const ROUTES = findRoutes(API_DIR);

export interface ApiResult<T = any> {
  status: number;
  body: T;
  contentType?: string | null;
}

/** Call an API route as a visitor (no token), a test account key, or a raw token. */
export async function api<T = any>(
  method: string,
  path: string,
  opts: { as?: TestUserKey | null; token?: string; body?: unknown; form?: FormData; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const url = new URL(path, "http://test.local");
  const entry = ROUTES.find((r) => r.pattern.test(url.pathname));
  if (!entry) throw new Error(`No route for ${url.pathname}`);
  const match = url.pathname.match(entry.pattern)!;
  const params = Object.fromEntries(entry.names.map((n, i) => [n, decodeURIComponent(match[i + 1])]));

  const mod = (await import(entry.file)) as Record<string, Handler>;
  const handler = mod[method];
  if (!handler) return { status: 405, body: null as T };

  const headers: Record<string, string> = { "x-forwarded-for": "10.0.0.1", ...opts.headers };
  const token = opts.token ?? (opts.as ? await tokenFor(opts.as) : undefined);
  if (token) headers.authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";

  const req = new Request(url, {
    method,
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
  const res = await handler(req, { params: Promise.resolve(params) });
  if (!(res.headers.get("content-type") ?? "").includes("json")) {
    return { status: res.status, body: Buffer.from(await res.arrayBuffer()) as T, contentType: res.headers.get("content-type") };
  }
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
}

// ---- Logins -----------------------------------------------------------------------------

const tokens = new Map<TestUserKey, string>();

export async function tokenFor(key: TestUserKey): Promise<string> {
  const cached = tokens.get(key);
  if (cached) return cached;
  // Uses the real login route, so every test also exercises login
  const res = await api("POST", "/api/auth/login", { body: { login: TEST_USERS[key].email, password: TEST_PASSWORD } });
  if (res.status !== 200) throw new Error(`Login failed for ${key}: ${res.status} ${JSON.stringify(res.body)}`);
  tokens.set(key, res.body.token);
  return res.body.token;
}

// ---- Fresh database per test file ---------------------------------------------------------

export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename::text AS tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  }
  tokens.clear();
  await seedPlaces(prisma);
  await seedTestWorld(prisma, 4);
  await seedCommunity(prisma);
  await seedRound3(prisma);
}

export const uid = (key: TestUserKey) => `0000000a-0000-4000-8000-${String(TEST_USERS[key].n).padStart(12, "0")}`;
