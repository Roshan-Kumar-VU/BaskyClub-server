"use client";

import { useState } from "react";
import { errorMessage, post } from "@/lib/api";
import { Button, cx, Dialog, TextArea, toast } from "./ui";

const reasons = ["Spam", "Abuse or hate", "Fake account", "Unsafe or violent", "Wrong information", "Other"] as const;

/** Report a post, comment or person to the BaskyCLub moderators (#25). */
export function ReportDialog({ target, onClose }: { target: { type: "post" | "comment" | "user"; id: string } | null; onClose: () => void }) {
  const [why, setWhy] = useState<string>();
  const [more, setMore] = useState("");
  const [busy, setBusy] = useState(false);
  const what = target?.type === "user" ? "this person" : target?.type === "comment" ? "this comment" : "this post";

  const close = () => {
    setWhy(undefined);
    setMore("");
    onClose();
  };

  const send = async () => {
    if (!target || !why) return;
    setBusy(true);
    try {
      await post("/api/reports", { targetType: target.type, targetId: target.id, reason: [why, more.trim()].filter(Boolean).join(": ") });
      toast("Thanks for reporting", "The BaskyCLub moderators will review it.");
      close();
    } catch (e) {
      toast("Couldn't send the report", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onClose={close} title={`Report ${what}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <button key={r} type="button" aria-pressed={why === r} onClick={() => setWhy(r)} className={cx("rounded-full border px-3 py-1.5 text-sm font-semibold", why === r ? "border-accent bg-accent-soft text-accent-ink" : "border-line hover:bg-fill")}>
              {r}
            </button>
          ))}
        </div>
        <TextArea label="More details (optional)" value={more} onChange={(e) => setMore(e.target.value)} maxLength={400} rows={3} />
        <Button block loading={busy} disabled={!why} onClick={send}>
          Send report
        </Button>
        <p className="text-[13px] text-muted">Your report is private. Respectful criticism is allowed; abuse isn&apos;t.</p>
      </div>
    </Dialog>
  );
}
