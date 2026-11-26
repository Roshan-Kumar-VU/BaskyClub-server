"use client";

import { ADULT_AGE, ageOn, fits, LIMITS } from "@baskyclub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth-card";
import { DistrictSelect } from "@/components/district-select";
import { Button, Field, Notice, Segmented, toast } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useScope } from "@/lib/scope";
import { useSession } from "@/lib/session";

const looksLikeEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

/** <input type="date"> gives YYYY-MM-DD; accept only real past days. */
function validDob(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso) && d.getTime() < Date.now() && d.getUTCFullYear() >= 1900;
}

/**
 * Sign-up matching the app (users table). Under-18: a parent confirms by email and the account
 * stays limited until then (#67).
 */
export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const { signup } = useSession();
  const scope = useScope();
  const [f, setF] = useState({ name: "", email: "", phone: "", dob: "", password: "" });
  const [gender, setGender] = useState<"male" | "female">("male");
  const [district, setDistrict] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const homeDistrict = district ?? scope.districtCode;
  const dobOk = validDob(f.dob);
  const minor = dobOk && ageOn(f.dob) < ADULT_AGE;
  const ready =
    fits(f.name, LIMITS.personName) &&
    looksLikeEmail(f.email) &&
    f.phone.trim().length >= 10 &&
    dobOk &&
    fits(f.password, LIMITS.password, false) &&
    (!minor || (looksLikeEmail(parentEmail) && fits(parentName, LIMITS.personName)));

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await signup({
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        dateOfBirth: f.dob,
        password: f.password,
        gender,
        homeDistrictCode: homeDistrict ?? undefined,
        ...(minor ? { parentName: parentName.trim(), parentEmail: parentEmail.trim() } : {}),
      });
      if (r.awaitingParent) toast("Almost there", `We emailed your parent at ${parentEmail.trim()}. You can look around now; posting, comments and clubs open once they confirm.`);
      router.replace(next);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Create your account" sub="One profile for every club, match and tournament.">
      <form onSubmit={create} className="space-y-4">
        <Field label="Full name" value={f.name} onChange={set("name")} maxLength={LIMITS.personName.max} placeholder="As on your ID card" autoComplete="name" />
        <Field label="Email" type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" />
        <Field label="Mobile number" type="tel" value={f.phone} onChange={set("phone")} placeholder="98765 43210" autoComplete="tel" hint="To log in and find your account. Never shown to other people." />
        <Field
          label="Date of birth"
          type="date"
          value={f.dob}
          onChange={set("dob")}
          max={new Date().toISOString().slice(0, 10)}
          hint="Decides age categories like U-16 and U-18."
          error={f.dob && !dobOk ? "Enter a real date of birth." : undefined}
        />
        {minor && (
          <div className="space-y-3 rounded-xl bg-official-soft p-4">
            <div className="text-sm font-bold text-official">Under 18? A parent needs to confirm.</div>
            <p className="text-sm text-ink-2">We&apos;ll email your parent a link. Until they confirm, you can look around but not post, comment or join clubs.</p>
            <Field label="Parent's name" value={parentName} onChange={(e) => setParentName(e.target.value)} maxLength={LIMITS.personName.max} placeholder="Parent or guardian" />
            <Field label="Parent's email" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
          </div>
        )}
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-2">Plays in</span>
          <Segmented value={gender} onChange={setGender} options={[{ value: "male", label: "Men's" }, { value: "female", label: "Women's" }]} />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-2">Home district</span>
          <DistrictSelect value={homeDistrict} onChange={setDistrict} />
        </div>
        <Field
          label="Password"
          type="password"
          value={f.password}
          onChange={set("password")}
          maxLength={LIMITS.password.max}
          placeholder={`At least ${LIMITS.password.min} characters`}
          autoComplete="new-password"
        />
        {error && <Notice>{error}</Notice>}
        <Button block type="submit" loading={busy} disabled={!ready}>
          Create account
        </Button>
      </form>
      <p className="text-center text-ink-2">
        Already have an account?{" "}
        <Link href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-accent-ink hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
