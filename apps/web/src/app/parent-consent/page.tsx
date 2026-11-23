import type { Metadata } from "next";
import { firstParam } from "../_lib/post-json";
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
    <div className="card">
      <h1>Confirm your child&apos;s account</h1>
      <p className="secondary">
        Your child has signed up for BaskyCLub, the basketball community app. Because they are under 18, they can only
        browse until a parent or guardian agrees.
      </p>
      <p className="secondary">Once you confirm, they can join clubs, post photos and comment.</p>
      {token ? (
        <ConsentForm token={token} />
      ) : (
        <p className="notice error">This link is incomplete. Open the full link from the email again.</p>
      )}
    </div>
  );
}
