"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { Button, Card, Empty, Field, Loaded, toast } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";

type CreatorRequest = {
  id: string;
  requestedAt: string;
  person: { id: string; name: string; photoUrl: string | null; bio: string | null; instagram: string | null; youtube: string | null; homeDistrictCode: string | null; createdAt: string; posts: number; followers: number };
};

/** Creator badge requests: approve, or decline with a note. */
export default function AdminCreatorsPage() {
  return (
    <AdminGuard need="team" title="Creator requests">
      <Requests />
    </AdminGuard>
  );
}

function Requests() {
  const { user } = useSession();
  const q = useApi<{ requests: CreatorRequest[] }>("/api/admin/badges/requests");
  return (
    <Loaded q={q}>
      {({ requests }) =>
        !requests.length ? (
          <Empty title="No Creator requests waiting" />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Request key={r.id} r={r} self={r.person.id === user?.id} />
            ))}
          </div>
        )
      }
    </Loaded>
  );
}

function Request({ r, self }: { r: CreatorRequest; self: boolean }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const p = r.person;
  const act = async (decision: "approve" | "decline") => {
    setBusy(true);
    try {
      await post(`/api/admin/badges/requests/${r.id}/decide`, { decision, ...(note.trim() ? { note: note.trim() } : {}) });
      toast(decision === "approve" ? `${p.name} is now a Creator` : "Request declined");
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      invalidate("/api/admin/badges", "/api/users/", "/api/feed");
      setBusy(false);
    }
  };
  return (
    <Card>
      <div className="space-y-2 p-4">
        <Link href={`/u/${p.id}`} className="font-bold hover:underline">
          {p.name} ›
        </Link>
        <div className="text-[13px] text-muted">
          {p.followers} {p.followers === 1 ? "follower" : "followers"} · {p.posts} {p.posts === 1 ? "post" : "posts"} · asked {formatDate(r.requestedAt)}
        </div>
        {p.bio && <p>{p.bio}</p>}
        {p.instagram && <div className="text-sm">Instagram: {p.instagram}</div>}
        {p.youtube && <div className="text-sm">YouTube: {p.youtube}</div>}
        {self ? (
          <p className="text-[13px] text-muted">This is your own request — someone else in the team decides it.</p>
        ) : (
          <>
            <Field label="Note to the person" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Needed to decline, e.g. post a few more videos" />
            <div className="flex gap-2">
              <Button small loading={busy} onClick={() => act("approve")}>Approve</Button>
              <Button small kind="secondary" disabled={busy || !note.trim()} onClick={() => act("decline")}>Decline</Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
