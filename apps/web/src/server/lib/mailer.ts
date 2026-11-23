import { log } from "./log";
// Emails (parent consent, password reset). EMAIL_DRIVER=log (default while testing) prints them
// in Terminal; EMAIL_DRIVER=resend sends through Resend (RESEND_API_KEY, EMAIL_FROM).
// AWS SES can be added here later in the same shape.
import { env } from "../env";

export interface Email {
  to: string;
  subject: string;
  text: string;
}

/** Emails "sent" with the log driver — tests and local runs look here. */
export const emailOutbox: Email[] = [];

export async function sendEmail(email: Email): Promise<void> {
  const driver = process.env.EMAIL_DRIVER ?? "log";
  if (driver === "log") {
    emailOutbox.push(email);
    if (process.env.NODE_ENV !== "test") console.log(`\n[email] to ${email.to}: ${email.subject}\n${email.text}\n`);
    return;
  }
  if (driver === "resend") {
    // NOTE: not yet tried with a real Resend key — send a test email before launch.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "BaskyCLub <no-reply@baskyclub.in>", to: email.to, subject: email.subject, text: email.text }),
    });
    if (!res.ok) log("ERROR", { module: "email", code: "resend_rejected", status: res.status });
    return;
  }
  if (env.isProduction) throw new Error(`Unknown EMAIL_DRIVER "${driver}"`);
}
