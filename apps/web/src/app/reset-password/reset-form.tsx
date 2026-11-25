"use client";

import { LIMITS } from "@baskyclub/shared";
import { useState, type FormEvent } from "react";
import { Button, Field, Notice } from "@/components/ui";
import { ApiFailure, postJson } from "@/lib/api";

const { min: MIN, max: MAX } = LIMITS.password;

type State = { kind: "idle" } | { kind: "busy" } | { kind: "done" } | { kind: "error"; message: string; expired?: boolean };

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const tooShort = password.length > 0 && password.length < MIN;
  const tooLong = password.length > MAX;
  const mismatch = again.length > 0 && again !== password;
  const ready = password.length >= MIN && !tooLong && again === password;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || state.kind === "busy") return;
    setState({ kind: "busy" });
    try {
      await postJson("/api/auth/reset-password", { token, newPassword: password });
      setState({ kind: "done" });
      setPassword("");
      setAgain("");
    } catch (err) {
      if (err instanceof ApiFailure && (err.status === 410 || err.code === "invalid_input")) {
        // invalid_input here means a malformed token (the password was checked above)
        setState({ kind: "error", expired: true, message: "This link has expired or was already used. Ask for a new one from the log in page." });
      } else {
        setState({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
      }
    }
  }

  if (state.kind === "done") {
    return <Notice tone="success">Your password is changed. <a className="font-bold underline" href="/login">Log in</a> with the new one.</Notice>;
  }
  if (state.kind === "error" && state.expired) {
    return <Notice>{state.message}</Notice>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={tooLong ? `Use at most ${MAX} characters.` : tooShort ? `At least ${MIN} characters.` : undefined}
        hint={`At least ${MIN} characters.`}
      />
      <Field
        label="Type it again"
        type="password"
        autoComplete="new-password"
        value={again}
        onChange={(e) => setAgain(e.target.value)}
        error={mismatch ? "The two passwords don't match." : undefined}
      />
      <Button block type="submit" disabled={!ready || state.kind === "busy"}>
        {state.kind === "busy" ? "Saving…" : "Save new password"}
      </Button>
      {state.kind === "error" && <Notice>{state.message}</Notice>}
    </form>
  );
}
