// npm run test:prepare — builds the tables in the TEST database (run once, and again after new migrations).
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL in .env first (see .env.example).");

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
});
