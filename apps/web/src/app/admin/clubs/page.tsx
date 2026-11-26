"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { Button, Card, Empty, Loaded, Segmented, toast } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";
import { ago } from "@/lib/format";
import { invalidate, useApi } from "@/lib/store";

type PendingClub = { id: string; name: string; kind: string; districtName?: string; createdAt: string; createdBy?: { name: string } | null };

/** Approve, suspend or reinstate clubs (#12). */
export default function AdminClubsPage() {
  return (
    <AdminGuard need="team" title="Clubs to approve">
      <Clubs />
    </AdminGuard>
  );
}

function Clubs() {
  const [tab, setTab] = useState<"pending" | "suspended">("pending");
  const q = useApi<{ clubs: PendingClub[] }>(`/api/admin/clubs?status=${tab}`);
  const act = async (id: string, decision: "approve" | "suspend" | "reinstate") => {
    try {
      await post(`/api/clubs/${id}/review`, { decision });
      toast(decision === "approve" ? "Club approved" : decision === "suspend" ? "Club suspended" : "Club reinstated");
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      invalidate("/api/admin/clubs", "/api/clubs", `/api/clubs/${id}`);
    }
  };
  return (
    <div className="space-y-4">
      <Segmented value={tab} onChange={setTab} options={[{ value: "pending", label: "Waiting" }, { value: "suspended", label: "Suspended" }]} />
      <Loaded q={q}>
        {({ clubs }) =>
          !clubs.length ? (
            <Empty title="Nothing here" />
          ) : (
            <div className="space-y-3">
              {clubs.map((c) => (
                <Card key={c.id}>
                  <div className="space-y-2 p-4">
                    <Link href={`/clubs/${c.id}`} className="font-bold hover:underline">
                      {c.name}
                    </Link>
                    <div className="text-[13px] text-muted">
                      {[c.kind, c.districtName, c.createdBy && `by ${c.createdBy.name}`, ago(c.createdAt)].filter(Boolean).join(" · ")}
                    </div>
                    <div className="flex gap-2">
                      {tab === "pending" ? (
                        <>
                          <Button small onClick={() => act(c.id, "approve")}>Approve</Button>
                          <Button small kind="secondary" onClick={() => act(c.id, "suspend")}>Suspend</Button>
                        </>
                      ) : (
                        <Button small onClick={() => act(c.id, "reinstate")}>Reinstate</Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
