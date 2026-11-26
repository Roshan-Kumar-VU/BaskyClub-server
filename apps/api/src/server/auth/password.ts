import bcrypt from "bcryptjs";
import { env } from "../env";

/** Turns a password into a one-way scramble. The real password is never stored. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.bcryptRounds);
}

export function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | null = null;
/** A throwaway hash, so a login for an unknown account takes as long as a real one. */
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(`no-account-${Math.random()}`, env.bcryptRounds);
  return dummyHash;
}
