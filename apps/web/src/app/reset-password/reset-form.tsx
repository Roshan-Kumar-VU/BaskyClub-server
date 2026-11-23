"use client";

import { LIMITS } from "@baskyclub/shared";
import { useState, type FormEvent } from "react";
import { ApiFailure, postJson } from "../_lib/post-json";

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
        setState({ kind: "error", expired: true, message: "This link has expired or was already used. Ask for a new one in the app." });
      } else {
        setState({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
      }
    }
  }

  if (state.kind === "done") {
    return <p className="notice success">Your password is changed. Log in to the BaskyCLub app with the new one.</p>;
  }
  if (state.kind === "error" && state.expired) {
    return <p className="notice error">{state.message}</p>;
  }

  return (
    <form onSubmit={submit} noValidate>
      <label className="field">
        <span>New password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={tooShort || tooLong}
        />
        <div className="hint">
          {tooLong ? `Use at most ${MAX} characters.` : `At least ${MIN} characters.`}
        </div>
      </label>
      <label className="field">
        <span>Type it again</span>
        <input
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          aria-invalid={mismatch}
        />
        {mismatch && <div className="hint">The two passwords don&apos;t match.</div>}
      </label>
      <button className="button" type="submit" disabled={!ready || state.kind === "busy"}>
        {state.kind === "busy" ? "Saving…" : "Save new password"}
      </button>
      {state.kind === "error" && <p className="notice error">{state.message}</p>}
    </form>
  );
}
