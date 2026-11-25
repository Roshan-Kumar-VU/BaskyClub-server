import type { Metadata } from "next";
import { Notice } from "@/components/ui";
import { firstParam } from "@/lib/api";
import { ConsentForm } from "./consent-form";

// The emailed link (auth.service.ts → signup) points here. Token pages stay out of search
// engines and never send the token to other sites in the Referer header.
export const metadata: Metadata = {
  title: "Confirm your child's account",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ParentConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = firstParam((await searchParams).token);
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-line bg-card p-6">
      <h1 className="font-display text-[26px] font-bold tracking-tight">Confirm your child&apos;s account</h1>
      <p className="text-ink-2">
        Your child has signed up for BaskyCLub, the basketball community app. Because they are under 18, they can only
        browse until a parent or guardian agrees.
      </p>
      <p className="text-ink-2">Once you confirm, they can join clubs, post photos and comment.</p>
      {token ? (
        <ConsentForm token={token} />
      ) : (
        <Notice>This link is incomplete. Open the full link from the email again.</Notice>
      )}
    </div>
  );
}
