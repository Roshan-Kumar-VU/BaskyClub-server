// Loaded first by every test. Points the server at the TEST database so tests
// can wipe and refill it without touching your real local data.
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (existsSync(".env")) process.loadEnvFile(".env");

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error(
    "Set TEST_DATABASE_URL in .env (a separate database, e.g. baskyclub_test) — tests erase its data. See README.",
  );
}
if (testUrl === process.env.DATABASE_URL || /baskyclub_local|supabase|amazonaws|azure/i.test(testUrl)) {
  throw new Error("TEST_DATABASE_URL must point to a throwaway test database, not your real one.");
}
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-123";
process.env.BCRYPT_ROUNDS = "4";
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.UPLOAD_DIR = join(tmpdir(), "baskyclub-test-uploads");
process.env.EMAIL_DRIVER = "log";
process.env.PUSH_DRIVER = "log";
