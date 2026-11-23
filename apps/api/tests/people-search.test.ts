import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, resetDatabase, TEST_PASSWORD, TEST_USERS } from "./helpers";

// Test accounts: phone +91 90000 000NN (NN = account number), see prisma/seed.ts
const phoneOf = (n: number) => `90000${String(n).padStart(5, "0")}`;

describe("Forgot password: email link only (PRD §4)", () => {
  before(resetDatabase);

  it("the phone + date of birth recovery is gone", async () => {
    await assert.rejects(api("POST", "/api/auth/recover", { body: { phone: "9000000011", dateOfBirth: "2000-01-01" } }), /No route/);
  });

  it("3 reset emails an hour per address, the same for addresses with and without an account", async () => {
    const ask = (email: string, ip: string) => api("POST", "/api/auth/forgot-password", { body: { email }, headers: { "x-forwarded-for": ip } });
    for (const email of [TEST_USERS.player.email, "nobody-here@example.com"]) {
      for (let i = 0; i < 3; i++) assert.equal((await ask(email, `10.1.0.${i}`)).status, 200, `${email} #${i + 1}`);
      const fourth = await ask(email, "10.1.0.9");
      assert.equal(fourth.status, 429, email);
      assert.equal(fourth.body.error.code, "slow_down");
    }
    // Upper case doesn't get around it (the address is lower-cased first)
    assert.equal((await ask(TEST_USERS.player.email.toUpperCase(), "10.1.0.10")).status, 429);
  });

  it("20 requests an hour per network address", async () => {
    const ip = "10.2.0.1";
    for (let i = 0; i < 20; i++) {
      const res = await api("POST", "/api/auth/forgot-password", { body: { email: `someone${i}@example.com` }, headers: { "x-forwarded-for": ip } });
      assert.equal(res.status, 200, `#${i + 1}`);
    }
    const over = await api("POST", "/api/auth/forgot-password", { body: { email: "another@example.com" }, headers: { "x-forwarded-for": ip } });
    assert.equal(over.status, 429);
    // Another network is not affected
    assert.equal((await api("POST", "/api/auth/forgot-password", { body: { email: "another@example.com" }, headers: { "x-forwarded-for": "10.2.0.2" } })).status, 200);
  });
});

describe("Find people (to add to a club or association team)", () => {
  before(resetDatabase);

  it("logged-in people search by name or phone; no private details", async () => {
    const byName = await api("GET", "/api/users?q=priya", { as: "clubOwner" });
    assert.equal(byName.body.people[0].name, "Priya Player");
    assert.deepEqual(Object.keys(byName.body.people[0]).sort(), ["homeDistrictCode", "id", "name", "photoUrl"]);
    const byPhone = await api("GET", `/api/users?q=${phoneOf(TEST_USERS.captain.n)}`, { as: "districtAdmin" });
    assert.equal(byPhone.body.people[0].name, "Arun Captain");
    assert.ok(!(await api("GET", "/api/users?q=suresh", { as: "clubOwner" })).body.people.some((p: { name: string }) => p.name.includes("Suspended")));
  });

  it("visitors can't search; one letter is too short", async () => {
    assert.equal((await api("GET", "/api/users?q=priya")).status, 401);
    assert.equal((await api("GET", "/api/users?q=p", { as: "clubOwner" })).status, 400);
  });
});
