// Sign up, log in, "who am I", parent consent, change password.
import { LIMITS } from "@baskyclub/shared";
import { z } from "zod";
import { creatorStatus } from "./badges.service";
import { prisma } from "../db";
import { env } from "../env";
import { AppError, badRequest, conflict, notFound, unauthorized } from "../errors";
import { checkPassword, dummyPasswordHash, hashPassword } from "../auth/password";
import { createLinkToken, createLoginToken, createResetToken, hashLinkToken, readResetToken } from "../auth/token";
import type { Viewer } from "../auth/viewer";
import { ageOn, DAY_MS } from "../lib/dates";
import { sendEmail } from "../lib/mailer";
import { normalizeIndianPhone } from "../lib/phone";
import { clearAttempts, limitAttempts } from "../lib/rate-limit";

const PARENT_LINK_DAYS = 7;

// ---- Input rules ----------------------------------------------------------

const password = z
  .string()
  .min(LIMITS.password.min, `Password must be at least ${LIMITS.password.min} characters.`)
  .max(LIMITS.password.max, `Password must be at most ${LIMITS.password.max} characters.`);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")
  .transform((s) => new Date(`${s}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Not a real date.");

export const signupInput = z.object({
  name: z.string().trim().min(LIMITS.personName.min, "Enter your full name.").max(LIMITS.personName.max),
  email: z.email("Enter a valid email.").transform((s) => s.trim().toLowerCase()),
  phone: z.string().transform((s, ctx) => {
    const p = normalizeIndianPhone(s);
    if (!p) ctx.addIssue({ code: "custom", message: "Enter a valid Indian mobile number." });
    return p ?? "";
  }),
  password,
  dateOfBirth: dateOnly,
  gender: z.enum(["male", "female", "other"]).optional(),
  homeDistrictCode: z.string().trim().toUpperCase().optional(),
  // Only for under-18 signups (#67)
  parentName: z.string().trim().min(2).max(80).optional(),
  parentEmail: z.email().transform((s) => s.trim().toLowerCase()).optional(),
});
export type SignupInput = z.infer<typeof signupInput>;

export const loginInput = z.object({
  /** Email or phone number */
  login: z.string().trim().min(3),
  password: z.string().min(1),
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

// ---- Sign up ---------------------------------------------------------------

export async function signup(input: SignupInput, ip: string | null) {
  const now = new Date();
  if (input.dateOfBirth > now) throw badRequest("invalid_dob", "Date of birth cannot be in the future.");
  const age = ageOn(input.dateOfBirth, now);
  if (age > 100) throw badRequest("invalid_dob", "Please check the date of birth.");
  const isMinor = age < 18;

  if (isMinor) {
    if (!input.parentName || !input.parentEmail) {
      throw badRequest("parent_required", "Under 18: enter your parent or guardian's name and email.");
    }
    if (input.parentEmail === input.email) {
      throw badRequest("parent_email_same", "The parent's email must be different from yours.");
    }
  }

  if (input.homeDistrictCode) {
    const district = await prisma.district.findUnique({ where: { code: input.homeDistrictCode } });
    if (!district) throw badRequest("unknown_district", "Choose a district from the list.");
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { email: true },
  });
  if (existing) {
    throw conflict(
      existing.email === input.email ? "email_taken" : "phone_taken",
      existing.email === input.email
        ? "An account with this email already exists. Try logging in."
        : "An account with this phone number already exists. Try logging in.",
    );
  }

  const passwordHash = await hashPassword(input.password);
  const link = isMinor ? createLinkToken() : null;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        homeDistrictCode: input.homeDistrictCode,
        status: isMinor ? "limited" : "active",
        signupIp: ip,
        lastLoginIp: ip,
      },
    });
    if (isMinor && link) {
      await tx.parentalConsent.create({
        data: {
          userId: created.id,
          parentName: input.parentName!,
          parentEmail: input.parentEmail!,
          tokenHash: link.hash,
        },
      });
    }
    return created;
  });

  let parentConsentLink: string | undefined;
  if (isMinor && link) {
    const url = `${env.appUrl}/parent-consent?token=${link.token}`;
    await sendEmail({
      to: input.parentEmail!,
      subject: `Please confirm ${input.name}'s BaskyCLub account`,
      text:
        `Hello ${input.parentName},\n\n${input.name} has signed up for BaskyCLub, the basketball community app. ` +
        `Because they are under 18, we need a parent or guardian to agree before they can post, comment or join clubs.\n\n` +
        `Confirm here (link valid for ${PARENT_LINK_DAYS} days):\n${url}\n\nIf you don't know about this, ignore this email.`,
    });
    // While testing, the link is also returned so testers can open it without an inbox.
    if (!env.isProduction) parentConsentLink = url;
  }

  return {
    token: await createLoginToken(user.id),
    user: { id: user.id, name: user.name, status: user.status },
    ...(isMinor ? { awaitingParent: true, parentConsentLink } : {}),
  };
}

// ---- Log in -----------------------------------------------------------------

export async function login(input: z.infer<typeof loginInput>, ip: string | null) {
  const asPhone = normalizeIndianPhone(input.login);
  const user = await prisma.user.findFirst({
    where: asPhone ? { phone: asPhone } : { email: input.login.toLowerCase() },
  });
  // Same message for "no such account" and "wrong password", so nobody can probe which emails exist.
  const wrong = unauthorized("Email/phone or password is not correct.");
  // Always run the password check (against a dummy hash if needed) so the reply takes the
  // same time whether or not the account exists.
  const passwordOk = await checkPassword(input.password, user?.passwordHash ?? (await dummyPasswordHash()));
  if (!user || user.status === "deleted" || !passwordOk) throw wrong;
  if (user.status === "suspended") {
    throw new AppError(403, "account_suspended", "This account is suspended. Contact the BaskyCLub team.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginIp: ip } });
  return {
    token: await createLoginToken(user.id),
    user: { id: user.id, name: user.name, status: user.status },
  };
}

// ---- Who am I ----------------------------------------------------------------

/** Everything the app needs about the logged-in person. Private fields only go to the owner. */
export async function me(viewer: Viewer) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: viewer.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      homeDistrictCode: true,
      photoUrl: true,
      coverPhotoUrl: true,
      bio: true,
      instagram: true,
      youtube: true,
      pinnedPostId: true,
      status: true,
      createdAt: true,
      memberships: {
        where: { status: { in: ["pending", "active"] } },
        select: {
          id: true,
          status: true,
          isPlayer: true,
          isCoach: true,
          primaryPosition: true,
          club: { select: { id: true, name: true, kind: true, districtCode: true } },
        },
      },
      clubRoles: { where: { toAt: null }, select: { id: true, clubId: true, role: true } },
      orgMemberships: {
        where: { toAt: null },
        select: { organizationId: true, accessLevel: true, organization: { select: { name: true, level: true } } },
      },
      parentalConsents: { where: { status: "sent" }, select: { parentEmail: true, sentAt: true }, take: 1 },
    },
  });

  return {
    ...user,
    isMinor: viewer.isMinor,
    platformRoles: [...viewer.platformRoles],
    awaitingParent: user.status === "limited",
    creatorBadge: await creatorStatus(viewer.id),
  };
}

// ---- Parent confirms an under-18 account (#67) ---------------------------------

export async function confirmParentalConsent(token: string) {
  const consent = await prisma.parentalConsent.findUnique({ where: { tokenHash: hashLinkToken(token) } });
  if (!consent) throw notFound("Confirmation link");
  if (consent.status === "confirmed") return { ok: true, alreadyConfirmed: true };
  if (consent.status !== "sent" || Date.now() - consent.sentAt.getTime() > PARENT_LINK_DAYS * DAY_MS) {
    if (consent.status === "sent") {
      await prisma.parentalConsent.update({ where: { id: consent.id }, data: { status: "expired" } });
    }
    throw new AppError(410, "link_expired", "This link has expired. Ask your child to send a new one from the app.");
  }

  await prisma.$transaction([
    prisma.parentalConsent.update({ where: { id: consent.id }, data: { status: "confirmed", confirmedAt: new Date() } }),
    // Only a "limited" account becomes active; a suspended one stays suspended.
    prisma.user.updateMany({ where: { id: consent.userId, status: "limited" }, data: { status: "active" } }),
  ]);
  return { ok: true };
}

// ---- Change password ------------------------------------------------------------

export async function changePassword(viewer: Viewer, input: z.infer<typeof changePasswordInput>) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: viewer.id } });
  if (!(await checkPassword(input.currentPassword, user.passwordHash))) {
    throw badRequest("wrong_password", "Your current password is not correct.");
  }
  await prisma.user.update({ where: { id: viewer.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  return { ok: true };
}

// ---- Forgot password (by email) -------------------------------------------------------------

export const forgotPasswordInput = z.object({ email: z.email().transform((s) => s.trim().toLowerCase()) });
export const resetPasswordInput = z.object({ token: z.string().min(20), newPassword: password });

/** Always answers the same way, so nobody can use it to check which emails have accounts. */
export async function forgotPassword(input: z.infer<typeof forgotPasswordInput>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (user && (user.status === "active" || user.status === "limited")) {
    const token = await createResetToken(user.id, user.passwordHash);
    await sendEmail({
      to: user.email,
      subject: "Reset your BaskyCLub password",
      text:
        `Hello ${user.name},\n\nSomeone asked to reset your BaskyCLub password. If it was you, open this link within 1 hour:\n` +
        `${env.appUrl}/reset-password?token=${token}\n\nIf it wasn't you, ignore this email — your password stays the same.`,
    });
  }
  return { ok: true, message: "If an account exists for this email, we've sent a reset link." };
}

export async function resetPassword(input: z.infer<typeof resetPasswordInput>) {
  const userId = await readResetToken(input.token, async (id) => {
    const u = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true, status: true } });
    return u && u.status !== "deleted" && u.status !== "suspended" ? u.passwordHash : null;
  });
  if (!userId) throw new AppError(410, "link_expired", "This reset link has expired or was already used. Ask for a new one.");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.newPassword) } });
  return { ok: true };
}

// ---- Recover by phone + date of birth (local / testing; email or OTP to be added before launch) ----
// Weaker than an email link: anyone who knows both could try. Limits: 5 tries an hour per phone,
// 20 per network address; the reset step is valid for 15 minutes; the new password is set at once.

export const recoverInput = z.object({
  phone: z.string().transform((s, ctx) => {
    const p = normalizeIndianPhone(s);
    if (!p) ctx.addIssue({ code: "custom", message: "Enter a valid Indian mobile number." });
    return p ?? "";
  }),
  dateOfBirth: dateOnly,
});

const RECOVER_MINUTES = 15;

export async function recoverWithPhone(input: z.infer<typeof recoverInput>, ip: string | null) {
  limitAttempts(`recover:ip:${ip ?? "unknown"}`, 20, 3600, "attempts from this network");
  limitAttempts(`recover:phone:${input.phone}`, 5, 3600, "attempts for this number");

  const user = await prisma.user.findUnique({ where: { phone: input.phone } });
  const sameDay = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
  if (!user || !["active", "limited"].includes(user.status) || !sameDay(user.dateOfBirth, input.dateOfBirth)) {
    // Same answer whether the number is unknown or the date is wrong
    throw badRequest("no_match", "The phone number and date of birth don't match an account.");
  }
  clearAttempts(`recover:phone:${input.phone}`);
  return { resetToken: await createResetToken(user.id, user.passwordHash, RECOVER_MINUTES), name: user.name, expiresInMinutes: RECOVER_MINUTES };
}
