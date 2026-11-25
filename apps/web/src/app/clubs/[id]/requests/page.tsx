"use client";

import type { Person, Position } from "@baskyclub/shared";
import Link from "next/link";
import { use, useState } from "react";
import { Avatar, Button, Card, Empty, Loaded, PageTitle, toast } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";
import { ago, positionName } from "@/lib/format";
import { invalidate, useApi } from "@/lib/store";
import type { ClubPage } from "@/lib/types";

type JoinRequest = { id: string; requestedAt: string; isPlayer: boolean; primaryPosition: Position | null; user: Person };

/** Join requests (#63): owners and admins accept or decline. */
export default function ClubRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const club = useApi<ClubPage>(`/api/clubs/${id}`);
  return (
    <Loaded q={club} notFound={<Empty title="Club not found" />}>
      {(c) => (c.viewer.canManage ? <Requests club={c} /> : <Empty title="Owners and admins only" body={`Only ${c.name}'s owner or admins can see join requests.`} />)}
    </Loaded>
  );
}

function Requests({ club }: { club: ClubPage }) {
  const q = useApi<{ requests: JoinRequest[] }>(`/api/clubs/${club.id}/requests`);
  const [busy, setBusy] = useState<string | null>(null);
  const answer = async (r: JoinRequest, accept: boolean) => {
    setBusy(r.id);
    try {
      await post(`/api/memberships/${r.id}/${accept ? "approve" : "reject"}`);
      toast(accept ? `${r.user.name} joined the club` : "Request declined");
    } catch (e) {
      toast("Couldn't answer", errorMessage(e));
    } finally {
      invalidate(`/api/clubs/${club.id}`);
      setBusy(null);
    }
  };
  return (
    <>
      <PageTitle title="Join requests" sub={club.name} back={{ href: `/clubs/${club.id}`, label: club.name }} />
      <Loaded q={q}>
        {({ requests }) =>
          !requests.length ? (
            <Empty title="No join requests" body="New requests to join the club show up here." />
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Card key={r.id}>
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <Link href={`/u/${r.user.id}`}>
                      <Avatar name={r.user.name} src={r.user.photoUrl} size={44} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/u/${r.user.id}`} className="font-bold hover:underline">
                        {r.user.name}
                      </Link>
                      <div className="text-[13px] text-muted">
                        Asked to join {ago(r.requestedAt)}
                        {r.isPlayer ? ` · ${r.primaryPosition ? positionName[r.primaryPosition] : "Player"}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button small loading={busy === r.id} onClick={() => answer(r, true)}>
                        Accept
                      </Button>
                      <Button small kind="secondary" disabled={busy === r.id} onClick={() => answer(r, false)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        }
      </Loaded>
    </>
  );
}
