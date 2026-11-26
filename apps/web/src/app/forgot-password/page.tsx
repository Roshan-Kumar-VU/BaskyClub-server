"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, LinkButton, Notice } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";

const looksLikeEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

/**
 * Forgot password (PRD §4): the API emails a link to /reset-password. Same answer whether or not
 * the email has an account, so nobody can use this page to find out who is on BaskyCLub.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!looksLikeEmail(email) || busy) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/auth/forgot-password", { email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthCard title="Check your email" sub={`If ${sentTo} has a BaskyCLub account, we've sent it a link to set a new password.`}>
        <p className="text-ink-2">The link works for 1 hour. Open it, set the new password, then log in.</p>
        <LinkButton href="/login" block>
          Back to log in
        </LinkButton>
        <button type="button" onClick={() => setSentTo(null)} className="block w-full text-center text-sm font-bold text-accent-ink hover:underline">
          Use a different email
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot password?" sub="Enter your account's email and we'll send you a link to set a new password.">
      <form onSubmit={send} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        {error && <Notice>{error}</Notice>}
        <Button block type="submit" loading={busy} disabled={!looksLikeEmail(email)}>
          Send reset link
        </Button>
      </form>
      <p className="text-center">
        <Link href="/login" className="font-bold text-accent-ink hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
