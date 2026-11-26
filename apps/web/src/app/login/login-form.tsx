"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, Notice } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { TEST_ACCOUNTS, useSession } from "@/lib/session";

const TEST_PASSWORD = "Basky@123";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { login } = useSession();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const go = async (loginId: string, pw: string, key = "form") => {
    setBusy(key);
    setError("");
    try {
      await login(loginId.trim(), pw);
      router.replace(next);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (id.trim() && password && !busy) go(id, password);
  };

  return (
    <AuthCard title="Welcome back" sub="Log in to post, join clubs and follow players.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email or mobile number" value={id} onChange={(e) => setId(e.target.value)} placeholder="you@example.com" autoComplete="username" autoCapitalize="none" />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />
        {error && <Notice>{error}</Notice>}
        <Button block type="submit" loading={busy === "form"} disabled={!id.trim() || !password || !!busy}>
          Log in
        </Button>
      </form>
      <p className="text-center">
        <Link href="/forgot-password" className="font-bold text-accent-ink hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="text-center text-ink-2">
        New to BaskyCLub?{" "}
        <Link href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-accent-ink hover:underline">
          Create an account
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="border-t border-line pt-4">
          <div className="mb-2 text-xs font-bold text-muted">TEST ACCOUNTS (development only)</div>
          <div className="flex flex-wrap gap-2">
            {TEST_ACCOUNTS.map((a) => (
              <button key={a.email} type="button" disabled={!!busy} onClick={() => go(a.email, TEST_PASSWORD, a.email)} className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:bg-fill disabled:opacity-50">
                {busy === a.email ? "…" : a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthCard>
  );
}
