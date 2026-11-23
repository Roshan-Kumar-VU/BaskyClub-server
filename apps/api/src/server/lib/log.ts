// One-line logs that say WHERE a problem happened.
//
//   2026-11-01T10:22:05Z WARN  module=clubs route="POST /api/clubs/:id/join" status=409 code=already_member user=0000000a… req=k3x9p2 ms=12
//   2026-11-01T10:22:09Z ERROR module=posts route="POST /api/posts" status=500 code=server_error at=services/posts.service.ts:118 req=7fq1zd ms=40
//       TypeError: Cannot read properties of undefined …   (full stack follows for 500s)
//
// Development: readable lines as above. Production (LOG_FORMAT=json): one JSON object per line, ready for a log service.
// Tests: silent unless LOG_IN_TESTS=yes.

type Level = "INFO" | "WARN" | "ERROR";
export type LogFields = Record<string, string | number | boolean | null | undefined>;

const silent = () => process.env.NODE_ENV === "test" && process.env.LOG_IN_TESTS !== "yes";
const asJson = () => process.env.LOG_FORMAT === "json";

export function log(level: Level, fields: LogFields, stack?: string) {
  if (silent()) return;
  const time = new Date().toISOString();
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const out = level === "INFO" ? console.log : level === "WARN" ? console.warn : console.error;
  if (asJson()) {
    out(JSON.stringify({ time, level, ...clean, ...(stack ? { stack } : {}) }));
    return;
  }
  const pairs = Object.entries(clean)
    .map(([k, v]) => `${k}=${typeof v === "string" && /\s/.test(v) ? JSON.stringify(v) : v}`)
    .join(" ");
  out(`${time} ${level.padEnd(5)} ${pairs}${stack ? `\n    ${stack.split("\n").join("\n    ")}` : ""}`);
}

/** Short id for one request; sent back as the x-request-id header and in error replies. */
export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** "/api/clubs/0000000c-…/join" → module "clubs", route "/api/clubs/:id/join". */
export function describePath(pathname: string): { module: string; route: string } {
  const route = pathname
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:n");
  const module = route.split("/")[2] ?? "unknown";
  return { module, route };
}

/** First line of our own code in a stack trace, e.g. "services/posts.service.ts:118". */
export function whereThrown(stack?: string): string | undefined {
  if (!stack) return undefined;
  for (const line of stack.split("\n")) {
    const m = line.match(/src\/(server\/[^\s:)]+|app\/api\/[^\s:)]+):(\d+)/);
    if (m) return `${m[1].replace(/^server\//, "")}:${m[2]}`;
  }
  return undefined;
}
