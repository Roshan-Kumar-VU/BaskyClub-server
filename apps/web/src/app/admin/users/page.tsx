"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { Button, Card, Chips, confirmAction, Field, Loaded, Tag, toast } from "@/components/ui";
import { errorMessage, post, qs } from "@/lib/api";
import { useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";

type AccountStatus = "active" | "limited" | "suspended" | "deleted";
type FoundUser = { id: string; name: string; email: string; phone: string; status: AccountStatus; platformRoles: { role: string }[] };

const ACTIONS: Record<AccountStatus, { button: string; ask: (n: string) => string; reason: string }> = {
  active: { button: "Restore", ask: (n) => `Restore ${n}? They can log in and use BaskyCLub fully again.`, reason: "Restored by the Basky team" },
  limited: { button: "Limit", ask: (n) => `Limit ${n} to browsing? They can still log in and look around, but can't post, comment, like, follow or join clubs.`, reason: "Limited by the Basky team" },
  suspended: { button: "Suspend", ask: (n) => `Suspend ${n}? They will be logged out and their posts hidden.`, reason: "Suspended by the Basky team" },
  deleted: { button: "Delete", ask: (n) => `Delete ${n}'s account? They can't log in again and their profile and posts disappear. This can't be undone here.`, reason: "Deleted by the Basky team" },
};
/** Which changes make sense from each status. */
const NEXT: Record<AccountStatus, AccountStatus[]> = {
  active: ["limited", "suspended", "deleted"],
  limited: ["active", "suspended", "deleted"],
  suspended: ["active", "deleted"],
  deleted: [],
};

/** Find accounts; change their status with a reason (saved in the change history). */
export default function AdminUsersPage() {
  return (
    <AdminGuard need="team" title="Users">
      <Users />
    </AdminGuard>
  );
}

function Users() {
  const { user: me } = useSession();
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<"all" | AccountStatus>("all");
  const [reason, setReason] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const path = term.length >= 2 || status !== "all" ? `/api/admin/users${qs({ q: term, status: status === "all" ? undefined : status, limit: 30 })}` : null;
  const q = useApi<{ users: FoundUser[] }>(path);

  const change = async (u: FoundUser, to: AccountStatus) => {
    const a = ACTIONS[to];
    if (!confirmAction(a.ask(u.name))) return;
    try {
      await post(`/api/admin/users/${u.id}/status`, { status: to, reason: reason.trim() || a.reason });
      toast(`${u.name}: ${to}`);
    } catch (e) {
      toast("Couldn't change the account", errorMessage(e));
    } finally {
      invalidate("/api/admin/users", "/api/feed", `/api/users/${u.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Search by name, email or phone" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type 2+ letters" autoCapitalize="none" />
      <Chips
        value={status}
        onChange={setStatus}
        options={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "limited", label: "Limited" },
          { value: "suspended", label: "Suspended" },
          { value: "deleted", label: "Deleted" },
        ]}
      />
      <Field label="Reason (saved in the history)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fake profile reported twice" />
      {path && (
        <Loaded q={q}>
          {({ users }) => (
            <div className="space-y-3">
              {!users.length && <p className="text-muted">No accounts match.</p>}
              {users.map((u) => (
                <Card key={u.id}>
                  <div className="space-y-1 p-4">
                    <div className="flex items-center gap-2">
                      {u.status === "deleted" ? <span className="flex-1 font-bold">{u.name}</span> : <Link href={`/u/${u.id}`} className="flex-1 font-bold hover:underline">{u.name}</Link>}
                      <Tag tone={u.status === "active" ? "success" : u.status === "limited" ? "neutral" : "danger"} label={u.status} />
                    </div>
                    <div className="text-[13px] text-muted">
                      {u.email} · {u.phone}
                    </div>
                    {u.platformRoles.length > 0 && <div className="text-[13px] text-accent-ink">{u.platformRoles.map((r) => r.role).join(", ")}</div>}
                    {u.status === "limited" && <div className="text-[13px] text-muted">Under-18 accounts waiting for a parent become active only through the parent&apos;s link.</div>}
                    {u.id !== me?.id && NEXT[u.status]?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {NEXT[u.status].map((to) => (
                          <Button key={to} small kind={to === "active" ? "primary" : to === "deleted" ? "danger" : "secondary"} onClick={() => change(u, to)}>
                            {ACTIONS[to].button}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Loaded>
      )}
    </div>
  );
}
