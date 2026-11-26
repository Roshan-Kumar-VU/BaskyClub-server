"use client";

import { AdminGuard } from "@/components/admin-guard";
import { Button, Card, Empty, Loaded, toast } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";
import { invalidate, useApi } from "@/lib/store";

type Court = { id: string; name: string; address: string | null; districtCode: string; indoor: boolean; surface: string | null; latitude: number; longitude: number; createdBy?: { name: string } | null };

/** Courts people suggested, waiting for the Basky team (#43). */
export default function AdminCourtsPage() {
  return (
    <AdminGuard need="team" title="Courts to approve">
      <Courts />
    </AdminGuard>
  );
}

function Courts() {
  const q = useApi<{ courts: Court[] }>("/api/admin/courts");
  const act = async (id: string, decision: "approve" | "reject") => {
    try {
      await post(`/api/courts/${id}/review`, { decision });
      toast(decision === "approve" ? "Court approved" : "Court rejected");
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      invalidate("/api/admin/courts", "/api/map");
    }
  };
  return (
    <Loaded q={q}>
      {({ courts }) =>
        !courts.length ? (
          <Empty title="No courts waiting" />
        ) : (
          <div className="space-y-3">
            {courts.map((c) => (
              <Card key={c.id}>
                <div className="space-y-2 p-4">
                  <div className="font-bold">{c.name}</div>
                  <div className="text-[13px] text-muted">
                    {c.address ?? c.districtCode} · {c.indoor ? "Indoor" : "Outdoor"}
                    {c.surface ? ` · ${c.surface}` : ""}
                    {c.createdBy ? ` · suggested by ${c.createdBy.name}` : ""}
                  </div>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold text-accent-ink hover:underline">
                    {c.latitude}, {c.longitude} ↗
                  </a>
                  <div className="flex gap-2">
                    <Button small onClick={() => act(c.id, "approve")}>Approve</Button>
                    <Button small kind="secondary" onClick={() => act(c.id, "reject")}>Reject</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      }
    </Loaded>
  );
}
