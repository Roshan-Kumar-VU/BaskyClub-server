"use client";

import { useState } from "react";
import { Button, Notice } from "@/components/ui";
import { ApiFailure, postJson } from "@/lib/api";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "done"; already: boolean } | { kind: "error"; message: string };

/**
 * Consent needs a click on purpose: email link scanners open links automatically,
 * so confirming on page load would let a scanner agree on the parent's behalf.
 */
export function ConsentForm({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function confirm() {
    setState({ kind: "busy" });
    try {
      const r = await postJson<{ ok: true; alreadyConfirmed?: boolean }>("/api/auth/parental-consent/confirm", { token });
      setState({ kind: "done", already: Boolean(r.alreadyConfirmed) });
    } catch (err) {
      // 404 = unknown token, 400 = malformed token; 410 (expired) keeps the server's message.
      const badLink = err instanceof ApiFailure && (err.status === 404 || err.status === 400);
      const message = badLink
        ? "This link is not valid. Open the full link from the email again."
        : err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setState({ kind: "error", message });
    }
  }

  if (state.kind === "done") {
    return (
      <Notice tone="success">
        {state.already
          ? "You've already confirmed this account. Nothing more to do."
          : "Thank you! The account is now active. Your child can log in to the BaskyCLub app."}
      </Notice>
    );
  }

  return (
    <div className="space-y-3">
      <Button block onClick={confirm} disabled={state.kind === "busy"}>
        {state.kind === "busy" ? "Confirming…" : "I agree — activate the account"}
      </Button>
      {state.kind === "error" && <Notice>{state.message}</Notice>}
    </div>
  );
}
