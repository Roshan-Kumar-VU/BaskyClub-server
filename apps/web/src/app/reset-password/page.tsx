import type { Metadata } from "next";
import { firstParam } from "../_lib/post-json";
import { ResetForm } from "./reset-form";

// The emailed link (auth.service.ts → forgotPassword) points here.
export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = firstParam((await searchParams).token);
  return (
    <div className="card">
      <h1>Set a new password</h1>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="notice error">This link is incomplete. Open the full link from the email again.</p>
      )}
    </div>
  );
}
