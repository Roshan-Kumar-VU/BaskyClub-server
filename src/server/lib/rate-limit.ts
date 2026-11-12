// Simple spam limits, counted from the database (works across servers, no extra service).
import { AppError } from "../errors";

export async function limitRate(countRecent: (since: Date) => Promise<number>, max: number, perSeconds: number, what: string) {
  const since = new Date(Date.now() - perSeconds * 1000);
  if ((await countRecent(since)) >= max) {
    throw new AppError(429, "slow_down", `You're ${what} too fast. Please wait a moment and try again.`);
  }
}

// In-memory attempt counter (per server process). Used where there's no table to count from,
// e.g. password-recovery tries. Resets when the server restarts — enough for local and single-server use.
const attempts = new Map<string, number[]>();

export function limitAttempts(key: string, max: number, perSeconds: number, what: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < perSeconds * 1000);
  if (recent.length >= max) {
    throw new AppError(429, "slow_down", `Too many ${what}. Please wait an hour and try again.`);
  }
  recent.push(now);
  attempts.set(key, recent);
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
