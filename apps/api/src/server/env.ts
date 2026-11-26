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
  /** Public address of this API: links to photos it stores (/api/files/...). */
  get apiUrl(): string {
    return (process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  /** Public address of the website (apps/web): links in emails and shared posts. */
  get webUrl(): string {
    return (process.env.WEB_URL ?? "http://localhost:3001").replace(/\/$/, "");
  },
  /** Cost of the password scramble. 12 is the safe default; tests use a low value for speed. */
  get bcryptRounds(): number {
    return Number(process.env.BCRYPT_ROUNDS ?? 12);
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
