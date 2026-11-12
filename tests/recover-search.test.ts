import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, resetDatabase, TEST_PASSWORD, TEST_USERS } from "./helpers";

// Test accounts: phone +91 90000 000NN (NN = account number), see prisma/seed.ts
const phoneOf = (n: number) => `90000${String(n).padStart(5, "0")}`;

describe("Forgot password by phone + date of birth", () => {
  before(resetDatabase);

  it("right phone + date of birth → a reset step → new password works, old one doesn't", async () => {
    const r = await api("POST", "/api/auth/recover", { body: { phone: phoneOf(TEST_USERS.coach.n), dateOfBirth: TEST_USERS.coach.dob } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.name, TEST_USERS.coach.name);
    assert.equal(r.body.expiresInMinutes, 15);
    const reset = await api("POST", "/api/auth/reset-password", { body: { token: r.body.resetToken, newPassword: "fresh-pass-1" } });
    assert.equal(reset.status, 200);
    assert.equal((await api("POST", "/api/auth/login", { body: { login: TEST_USERS.coach.email, password: TEST_PASSWORD } })).status, 401);
    assert.equal((await api("POST", "/api/auth/login", { body: { login: TEST_USERS.coach.email, password: "fresh-pass-1" } })).status, 200);
    // The reset step works only once
    assert.equal((await api("POST", "/api/auth/reset-password", { body: { token: r.body.resetToken, newPassword: "again-pass-2" } })).status, 410);
  });

  it("wrong date of birth and unknown phone give the same answer", async () => {
    const wrongDob = await api("POST", "/api/auth/recover", { body: { phone: phoneOf(TEST_USERS.player.n), dateOfBirth: "2001-01-01" } });
    const unknown = await api("POST", "/api/auth/recover", { body: { phone: "9123456789", dateOfBirth: TEST_USERS.player.dob } });
    assert.equal(wrongDob.status, 400);
    // Same answer (only the per-request reference differs)
    const strip = ({ requestId: _ref, ...rest }: Record<string, unknown>) => rest;
    assert.deepEqual(strip(wrongDob.body.error), strip(unknown.body.error));
  });

  it("suspended accounts can't recover", async () => {
    const r = await api("POST", "/api/auth/recover", { body: { phone: phoneOf(TEST_USERS.suspended.n), dateOfBirth: TEST_USERS.suspended.dob } });
    assert.equal(r.body.error.code, "no_match");
  });

  it("5 tries an hour per phone number", async () => {
    const body = { phone: phoneOf(TEST_USERS.captain.n), dateOfBirth: "1990-01-01" };
    for (let i = 0; i < 5; i++) assert.equal((await api("POST", "/api/auth/recover", { body })).status, 400);
    const sixth = await api("POST", "/api/auth/recover", { body: { ...body, dateOfBirth: TEST_USERS.captain.dob } });
    assert.equal(sixth.status, 429); // even the right date is refused once the limit is hit
  });

  it("bad input is refused", async () => {
    assert.equal((await api("POST", "/api/auth/recover", { body: { phone: "123", dateOfBirth: "1990-01-01" } })).status, 400);
    assert.equal((await api("POST", "/api/auth/recover", { body: { phone: phoneOf(1), dateOfBirth: "01/01/1990" } })).status, 400);
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
