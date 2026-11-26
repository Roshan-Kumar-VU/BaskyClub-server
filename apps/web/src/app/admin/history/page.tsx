"use client";

import { AdminGuard } from "@/components/admin-guard";
import { Button, Card, Empty, Loaded } from "@/components/ui";
import { ago } from "@/lib/format";
import { usePaged } from "@/lib/store";

type Change = { id: string; at: string; action: string; entity: string; entityId: string; afterValue: unknown; actor: { name: string } | null };

/** Everything the staff changed (super admins). */
export default function HistoryPage() {
  return (
    <AdminGuard need="super" title="Change history">
      <History />
    </AdminGuard>
  );
}

function History() {
  const q = usePaged<Change, { changes: Change[]; nextCursor?: string | null }>("/api/admin/change-log?limit=40", (r) => ({ items: r.changes, nextCursor: r.nextCursor ?? null }));
  return (
    <Loaded q={q}>
      {() =>
        !q.items.length ? (
          <Empty title="No changes yet" />
        ) : (
          <div className="space-y-2">
            {q.items.map((r) => (
              <Card key={r.id}>
                <div className="space-y-0.5 p-3">
                  <div className="text-[13px] text-muted">
                    {ago(r.at)} · {r.actor?.name ?? "system"}
                  </div>
                  <div className="font-bold">
                    {r.action} {r.entity}
                  </div>
                  <pre className="line-clamp-3 text-[13px] whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere]">{JSON.stringify(r.afterValue ?? {})}</pre>
                </div>
              </Card>
            ))}
            {q.hasMore && (
              <Button block kind="secondary" loading={q.loadingMore} onClick={q.loadMore}>
                Load more
              </Button>
            )}
          </div>
        )
      }
    </Loaded>
  );
}
