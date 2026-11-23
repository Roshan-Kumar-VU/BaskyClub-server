import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_PASSWORD, TEST_USERS } from "./helpers";

const adult = {
  name: "New Person",
  email: "New.Person@Example.com",
  phone: "098765 43210",
  password: "goodpass123",
  dateOfBirth: "1995-06-01",
  homeDistrictCode: "tn-vellore",
};

function dobYearsAgo(years: number) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() - 10);
  return d.toISOString().slice(0, 10);
}

describe("Sign up, log in, who am I", () => {
  before(resetDatabase);

  it("visitor signs up as an adult: account active, email lowercased, phone stored as +91", async () => {
    const res = await api("POST", "/api/auth/signup", { body: adult });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.token);
    assert.equal(res.body.user.status, "active");
    const row = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id } });
    assert.equal(row.email, "new.person@example.com");
    assert.equal(row.phone, "+919876543210");
    assert.equal(row.homeDistrictCode, "TN-VELLORE");
    assert.notEqual(row.passwordHash, adult.password);
    assert.equal(row.signupIp, "10.0.0.1");
  });

  it("the same email or phone cannot sign up twice", async () => {
    const sameEmail = await api("POST", "/api/auth/signup", { body: { ...adult, phone: "9123456780" } });
    assert.equal(sameEmail.status, 409);
    assert.equal(sameEmail.body.error.code, "email_taken");
    const samePhone = await api("POST", "/api/auth/signup", { body: { ...adult, email: "other@example.com", phone: "+91 98765-43210" } });
    assert.equal(samePhone.status, 409);
    assert.equal(samePhone.body.error.code, "phone_taken");
  });

  it("bad input is rejected with field messages", async () => {
    const res = await api("POST", "/api/auth/signup", {
      body: { ...adult, email: "not-an-email", phone: "12345", password: "short", dateOfBirth: "01/06/1995" },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "invalid_input");
    const fields = res.body.error.details.map((d: { field: string }) => d.field).sort();
    assert.deepEqual(fields, ["dateOfBirth", "email", "password", "phone"]);
  });

  it("unknown district and future birth date are rejected", async () => {
    const district = await api("POST", "/api/auth/signup", { body: { ...adult, email: "a1@example.com", phone: "9000011111", homeDistrictCode: "TN-NOWHERE" } });
    assert.equal(district.body.error.code, "unknown_district");
    const future = await api("POST", "/api/auth/signup", { body: { ...adult, email: "a2@example.com", phone: "9000011112", dateOfBirth: "2999-01-01" } });
    assert.equal(future.body.error.code, "invalid_dob");
  });

  it("under-18 signup needs a parent; the account is limited until the parent confirms (#67)", async () => {
    const minor = { ...adult, email: "kid@example.com", phone: "9000022222", dateOfBirth: dobYearsAgo(15) };
    const noParent = await api("POST", "/api/auth/signup", { body: minor });
    assert.equal(noParent.status, 400);
    assert.equal(noParent.body.error.code, "parent_required");

    const sameEmail = await api("POST", "/api/auth/signup", { body: { ...minor, parentName: "Parent", parentEmail: "kid@example.com" } });
    assert.equal(sameEmail.body.error.code, "parent_email_same");

    const ok = await api("POST", "/api/auth/signup", { body: { ...minor, parentName: "Parent Kumar", parentEmail: "parent@example.com" } });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.user.status, "limited");
    assert.equal(ok.body.awaitingParent, true);
    assert.match(ok.body.parentConsentLink, /parent-consent\?token=/);

    // Limited accounts can log in and look around, but cannot register a club or join one
    const me = await api("GET", "/api/auth/me", { token: ok.body.token });
    assert.equal(me.body.awaitingParent, true);
    assert.equal(me.body.isMinor, true);
    const register = await api("POST", "/api/clubs", { token: ok.body.token, body: { name: "Kid Club", districtCode: "TN-VELLORE" } });
    assert.equal(register.status, 403);
    assert.equal(register.body.error.code, "awaiting_parent");

    // Parent opens the link → account active
    const token = new URL(ok.body.parentConsentLink).searchParams.get("token")!;
    const confirm = await api("POST", "/api/auth/parental-consent/confirm", { body: { token } });
    assert.equal(confirm.status, 200);
    const after = await api("GET", "/api/auth/me", { token: ok.body.token });
    assert.equal(after.body.status, "active");
    // The link works once; opening it again just says it's done
    const again = await api("POST", "/api/auth/parental-consent/confirm", { body: { token } });
    assert.equal(again.body.alreadyConfirmed, true);
    // A made-up token is not found
    const fake = await api("POST", "/api/auth/parental-consent/confirm", { body: { token: "made-up-token-123" } });
    assert.equal(fake.status, 404);
  });

  it("log in with email (any case) or phone (any format)", async () => {
    const byEmail = await api("POST", "/api/auth/login", { body: { login: "PLAYER@test.baskyclub.in", password: TEST_PASSWORD } });
    assert.equal(byEmail.status, 200);
    const byPhone = await api("POST", "/api/auth/login", { body: { login: "90000 00011", password: TEST_PASSWORD } });
    assert.equal(byPhone.status, 200);
    assert.equal(byPhone.body.user.id, byEmail.body.user.id);
  });

  it("wrong password and unknown email give the same message", async () => {
    const wrong = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.player.email, password: "nope-nope" } });
    const unknown = await api("POST", "/api/auth/login", { body: { login: "ghost@example.com", password: "nope-nope" } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.error.message, unknown.body.error.message);
  });

  it("suspended account cannot log in, and an old token stops working", async () => {
    const res = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.suspended.email, password: TEST_PASSWORD } });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "account_suspended");

    const player = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.joiner.email, password: TEST_PASSWORD } });
    await prisma.user.update({ where: { id: player.body.user.id }, data: { status: "suspended" } });
    const me = await api("GET", "/api/auth/me", { token: player.body.token });
    assert.equal(me.status, 403);
    await prisma.user.update({ where: { id: player.body.user.id }, data: { status: "active" } });
  });

  it("visitor and broken tokens get 'please log in'", async () => {
    assert.equal((await api("GET", "/api/auth/me")).status, 401);
    assert.equal((await api("GET", "/api/auth/me", { token: "garbage.token.here" })).status, 401);
  });

  it("me: own private details, clubs and roles — per role", async () => {
    const owner = await api("GET", "/api/auth/me", { as: "clubOwner" });
    assert.equal(owner.body.email, TEST_USERS.clubOwner.email);
    assert.ok(owner.body.phone && owner.body.dateOfBirth);
    assert.equal(owner.body.passwordHash, undefined);
    assert.deepEqual(owner.body.clubRoles.map((r: { role: string }) => r.role), ["owner"]);

    const superAdmin = await api("GET", "/api/auth/me", { as: "superAdmin" });
    assert.deepEqual(superAdmin.body.platformRoles, ["super_admin"]);

    const district = await api("GET", "/api/auth/me", { as: "districtAdmin" });
    assert.equal(district.body.orgMemberships[0].accessLevel, "owner");
    assert.equal(district.body.orgMemberships[0].organization.level, "district");

    const joiner = await api("GET", "/api/auth/me", { as: "joiner" });
    assert.equal(joiner.body.memberships[0].status, "pending");

    const minor = await api("GET", "/api/auth/me", { as: "minorPlayer" });
    assert.equal(minor.body.isMinor, true);
    assert.equal(minor.body.status, "active");
  });

  it("change password: needs the current one; then only the new one works", async () => {
    const bad = await api("POST", "/api/auth/change-password", { as: "creator", body: { currentPassword: "wrong", newPassword: "newpass123" } });
    assert.equal(bad.body.error.code, "wrong_password");
    const ok = await api("POST", "/api/auth/change-password", { as: "creator", body: { currentPassword: TEST_PASSWORD, newPassword: "newpass123" } });
    assert.equal(ok.status, 200);
    const oldLogin = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.creator.email, password: TEST_PASSWORD } });
    assert.equal(oldLogin.status, 401);
    const newLogin = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.creator.email, password: "newpass123" } });
    assert.equal(newLogin.status, 200);
  });

  it("district picker: states and districts", async () => {
    const states = await api("GET", "/api/places/states");
    assert.equal(states.body.states.length, 36);
    const tn = await api("GET", "/api/places/states/tn/districts");
    assert.equal(tn.body.districts.length, 38);
    const vellore = tn.body.districts.find((d: { code: string }) => d.code === "TN-VELLORE");
    assert.equal(vellore.zoneCode, "TN-Z-CHN");
    assert.ok(vellore.associationId);
  });
});
