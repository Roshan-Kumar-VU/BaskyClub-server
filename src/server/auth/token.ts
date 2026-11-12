import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../env";

// Login token (JWT). The app keeps it in secure storage and sends it on every
// request as "Authorization: Bearer <token>"; the website keeps it in a cookie.
// It only carries the user id; powers are looked up fresh on every request,
// so removing someone's admin role takes effect immediately.

const ISSUER = "baskyclub";
const LOGIN_DAYS = 30;

export async function createLoginToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${LOGIN_DAYS}d`)
    .sign(env.jwtSecret);
}

/** Returns the user id inside a valid token, or null if the token is invalid or expired. */
export async function readLoginToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, env.jwtSecret, { issuer: ISSUER, algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Random one-time code for email links (parent consent, later password reset). */
export function createLinkToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashLinkToken(token) };
}

/** Only this hash is stored, so a database leak does not expose working links. */
export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ---- Password reset links ------------------------------------------------------------------
// Signed with the server secret PLUS the user's current password hash: once the password
// changes, every older reset link stops working by itself — no table needed.

const RESET_MINUTES = 60;

function resetKey(passwordHash: string) {
  return new TextEncoder().encode(`${new TextDecoder().decode(env.jwtSecret)}:${passwordHash}`);
}

export async function createResetToken(userId: string, passwordHash: string, minutes = RESET_MINUTES): Promise<string> {
  return new SignJWT({ purpose: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(resetKey(passwordHash));
}

/** Returns the user id if the link is valid for the user's current password, else null. */
export async function readResetToken(token: string, currentHash: (userId: string) => Promise<string | null>): Promise<string | null> {
  try {
    const unverified = decodeJwt(token);
    if (typeof unverified.sub !== "string" || unverified.purpose !== "reset") return null;
    const hash = await currentHash(unverified.sub);
    if (!hash) return null;
    const { payload } = await jwtVerify(token, resetKey(hash), { issuer: ISSUER, algorithms: ["HS256"] });
    return payload.sub === unverified.sub ? unverified.sub : null;
  } catch {
    return null;
  }
}
