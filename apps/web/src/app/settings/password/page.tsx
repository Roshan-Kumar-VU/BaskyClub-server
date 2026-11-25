"use client";

import { fits, LIMITS } from "@baskyclub/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, PageTitle, toast } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = !!again && next !== again;

  const save = async () => {
    setBusy(true);
    try {
      await post("/api/auth/change-password", { currentPassword: cur, newPassword: next });
      toast("Password changed");
      router.push("/profile");
    } catch (e) {
      toast("Couldn't change the password", errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Change password" back={{ href: "/profile", label: "Profile" }} />
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4 rounded-2xl border border-line bg-card p-5">
        <Field label="Current password" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <Field label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" hint={`At least ${LIMITS.password.min} characters.`} maxLength={LIMITS.password.max} />
        <Field label="New password again" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" error={mismatch ? "The new passwords don't match." : undefined} />
        <Button block type="submit" loading={busy} disabled={!cur || !fits(next, LIMITS.password, false) || next !== again}>
          Change password
        </Button>
      </form>
    </>
  );
}
