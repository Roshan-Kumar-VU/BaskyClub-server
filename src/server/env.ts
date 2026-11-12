// Settings read from .env. Missing required settings stop the server with a clear message.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env (see .env.example).`);
  return value;
}

export const env = {
  get jwtSecret(): Uint8Array {
    const secret = required("JWT_SECRET");
    if (process.env.NODE_ENV === "production" && secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
    return new TextEncoder().encode(secret);
  },
  get appUrl(): string {
    return process.env.APP_URL ?? "http://localhost:3000";
  },
  /** Cost of the password scramble. 12 is the safe default; tests use a low value for speed. */
  get bcryptRounds(): number {
    return Number(process.env.BCRYPT_ROUNDS ?? 12);
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
