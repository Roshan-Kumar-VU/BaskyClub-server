import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { route } from "../src/server/http";
import { badRequest } from "../src/server/errors";
import { describePath, whereThrown } from "../src/server/lib/log";
import { api, resetDatabase } from "./helpers";

const CLUB = "0000000c-0000-4000-8000-000000000001";

describe("Error logs say which module failed", () => {
  const lines: string[] = [];
  const original = { warn: console.warn, error: console.error };
  before(async () => {
    await resetDatabase();
    process.env.LOG_IN_TESTS = "yes";
    console.warn = (...a: unknown[]) => void lines.push(a.join(" "));
    console.error = (...a: unknown[]) => void lines.push(a.join(" "));
  });
  after(() => {
    delete process.env.LOG_IN_TESTS;
    Object.assign(console, original);
  });

  it("module and route are worked out from the address", () => {
    assert.deepEqual(describePath(`/api/clubs/${CLUB}/join`), { module: "clubs", route: "/api/clubs/:id/join" });
    assert.deepEqual(describePath("/api/admin/roles"), { module: "admin", route: "/api/admin/roles" });
  });

  it("finds the file and line where our code threw", () => {
    const stack = "Error: x\n    at foo (node_modules/a.js:1:1)\n    at bar (/Users/r/baskyclub-server/src/server/services/posts.service.ts:118:9)";
    assert.equal(whereThrown(stack), "services/posts.service.ts:118");
  });

  it("an expected refusal → one WARN line with module, route, code, user and a reference also sent to the app", async () => {
    lines.length = 0;
    const r = await api("POST", `/api/clubs/${CLUB}/join`, { as: "player" }); // already a member
    assert.equal(r.status, 400);
    assert.match(r.body.error.requestId, /^\w{4,}$/);
    const line = lines.find((l) => l.includes("WARN"))!;
    assert.ok(line, "a WARN line was written");
    for (const part of ["module=clubs", "route=\"POST /api/clubs/:id/join\"", "status=400", `code=${r.body.error.code}`, "user=0000000a-", `req=${r.body.error.requestId}`]) {
      assert.ok(line.includes(part), `log line has ${part}: ${line}`);
    }
  });

  it("an unexpected crash → ERROR line pointing at the file, with the stack; the app gets a safe message", async () => {
    lines.length = 0;
    const handler = route(async () => {
      throw new TypeError("boom");
    });
    const res = await handler(new Request("http://test.local/api/posts", { method: "POST", headers: { "x-request-id": "trace-123" } }), { params: Promise.resolve({}) });
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(res.headers.get("x-request-id"), "trace-123");
    assert.equal(body.error.code, "server_error");
    assert.ok(!JSON.stringify(body).includes("boom"), "no internal details sent to the app");
    const line = lines.join("\n");
    assert.ok(line.includes("ERROR") && line.includes("module=posts") && line.includes("req=trace-123") && line.includes("TypeError: boom"), line);
  });

  it("JSON lines for a log service when LOG_FORMAT=json", async () => {
    lines.length = 0;
    process.env.LOG_FORMAT = "json";
    const handler = route(async () => {
      throw badRequest("bad_thing", "Nope");
    });
    await handler(new Request("http://test.local/api/courts"), { params: Promise.resolve({}) });
    delete process.env.LOG_FORMAT;
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.level, "WARN");
    assert.equal(entry.module, "courts");
    assert.equal(entry.code, "bad_thing");
  });
});
