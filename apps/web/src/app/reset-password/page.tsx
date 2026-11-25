import type { Metadata } from "next";
import { Notice } from "@/components/ui";
import { firstParam } from "@/lib/api";
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
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-line bg-card p-6">
      <h1 className="font-display text-[26px] font-bold tracking-tight">Set a new password</h1>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <Notice>This link is incomplete. Open the full link from the email again.</Notice>
      )}
    </div>
  );
}
