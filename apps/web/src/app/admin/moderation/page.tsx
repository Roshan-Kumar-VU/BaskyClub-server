"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { Button, Card, Empty, Loaded, Segmented, Tag, toast } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";
import { ago } from "@/lib/format";
import { invalidate, useApi } from "@/lib/store";
import type { ModCase } from "@/lib/types";

type Status = "open" | "hidden" | "approved" | "removed";
const sourceLabel = { no_club_review: "No club — needs review", report: "Reported", ai: "AI flag" } as const;

function preview(c: ModCase) {
  const t = c.target;
  if (!t) return "Item no longer exists";
  if (c.targetType === "user") return `Account: ${t.name} (${t.status})`;
  if (c.targetType === "comment") return `Comment by ${t.user?.name}: “${t.content}”`;
  return `${t.author?.name}: ${t.content ?? "(photo or video)"}${t.media?.length ? ` · ${t.media.length} media` : ""}`;
}

/** Moderators (PRD §8): reported posts, comments and people. Publish/keep, hide (reversible) or remove. */
export default function ModerationPage() {
  return (
    <AdminGuard need="mod" title="Review queue">
      <Queue />
    </AdminGuard>
  );
}

function Queue() {
  const [tab, setTab] = useState<Status>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const q = useApi<{ cases: ModCase[] }>(`/api/moderation/cases?status=${tab}`);

  const decide = async (c: ModCase, decision: "approve" | "hide" | "remove") => {
    setBusy(c.id + decision);
    try {
      await post(`/api/moderation/cases/${c.id}/decide`, { decision });
    } catch (e) {
      toast("Couldn't save the decision", errorMessage(e));
    } finally {
      invalidate("/api/moderation/", "/api/feed", "/api/posts/", "/api/users/", "/api/clubs/", "/api/associations/", "/api/alerts");
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Segmented value={tab} onChange={setTab} options={[{ value: "open", label: "To review" }, { value: "hidden", label: "Hidden" }, { value: "approved", label: "Kept" }, { value: "removed", label: "Removed" }]} />
      {tab === "hidden" && <p className="text-[13px] text-muted">Hidden items are seen only by their author. Publish one again, or remove it for good.</p>}
      <Loaded q={q}>
        {({ cases }) =>
          !cases.length ? (
            <Empty title={tab === "open" ? "Nothing to review" : "Nothing here"} />
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <Card key={c.id}>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2">
                      <Tag label={sourceLabel[c.source]} />
                      <Tag label={c.targetType} />
                      <span className="ml-auto text-[13px] text-muted">{ago(c.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{preview(c)}</p>
                    {c.reason && (
                      <p className="text-[13px] text-ink-2">
                        Reason: {c.reason}
                        {c.reportedBy ? ` — reported by ${c.reportedBy.name}` : ""}
                      </p>
                    )}
                    {c.targetType === "post" && c.target && (
                      <Link href={`/p/${c.targetId}`} className="text-sm font-bold text-accent-ink hover:underline">
                        Open post
                      </Link>
                    )}
                    {c.targetType === "user" && c.target && (
                      <Link href={`/u/${c.targetId}`} className="text-sm font-bold text-accent-ink hover:underline">
                        Open profile
                      </Link>
                    )}
                    {(tab === "open" || tab === "hidden") && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button small loading={busy === c.id + "approve"} onClick={() => decide(c, "approve")}>
                          {c.targetType === "user" ? "Dismiss" : tab === "hidden" || c.source === "no_club_review" ? "Publish" : "Keep"}
                        </Button>
                        {c.targetType !== "user" && tab === "open" && (
                          <Button small kind="secondary" loading={busy === c.id + "hide"} onClick={() => decide(c, "hide")}>
                            Hide
                          </Button>
                        )}
                        {c.targetType !== "user" && (
                          <Button small kind="danger" loading={busy === c.id + "remove"} onClick={() => decide(c, "remove")}>
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              {tab === "open" && cases.some((c) => c.targetType === "user") && <p className="text-[13px] text-muted">Suspending an account is done by the Basky team in Admin → Users.</p>}
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
