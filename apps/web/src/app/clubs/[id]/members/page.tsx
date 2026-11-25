"use client";

import type { ClubMember } from "@baskyclub/shared";
import { use } from "react";
import { Button, Card, confirmAction, Empty, Loaded, PageTitle, Select, Tag, toast, Toggle } from "@/components/ui";
import { del, errorMessage, patch, post } from "@/lib/api";
import { positions } from "@/lib/labels";
import { ME, useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { ClubPage } from "@/lib/types";

/** People and roles (owners and admins): position, coach, admin, captain, remove. */
export default function ClubMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const club = useApi<ClubPage>(`/api/clubs/${id}`);
  return (
    <Loaded q={club} notFound={<Empty title="Club not found" />}>
      {(c) => (c.viewer.canManage ? <Members club={c} /> : <Empty title="Owners and admins only" />)}
    </Loaded>
  );
}

function Members({ club }: { club: ClubPage }) {
  const id = club.id;
  const { user } = useSession();
  const q = useApi<{ members: ClubMember[] }>(`/api/clubs/${id}/members?limit=50`);
  const isOwner = club.viewer.isOwner;
  const roleRow = (userId: string, role: string) => club.staff.find((s) => s.id === userId && s.role === role);
  const run = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      invalidate(`/api/clubs/${id}`, ME, "/api/users/");
    }
  };
  const details = (m: ClubMember, edit: Record<string, unknown>) => run(patch(`/api/memberships/${m.id}`, edit));
  const grant = (m: ClubMember, role: "admin" | "captain") => run(post(`/api/clubs/${id}/roles`, { userId: m.user.id, role }));
  const end = (m: ClubMember, role: string) => {
    const r = roleRow(m.user.id, role);
    if (r) run(del(`/api/club-roles/${r.roleId}`));
  };

  return (
    <>
      <PageTitle title="People and roles" sub={club.name} back={{ href: `/clubs/${id}/manage`, label: "Manage club" }} />
      <Loaded q={q}>
        {({ members }) => (
          <div className="space-y-3">
            <p className="text-[13px] text-muted">
              {members.length} members · {isOwner ? "You own this club." : "You are an admin: you can choose the captain and remove players."}
            </p>
            {members.map((m) => {
              const isAdmin = m.roles.includes("admin");
              const isCaptain = m.roles.includes("captain");
              const isOwnerRow = m.roles.includes("owner");
              const self = m.user.id === user?.id;
              return (
                <Card key={m.id}>
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">
                        {m.user.name}
                        {self ? " (you)" : ""}
                      </span>
                      {m.roles.map((r) => (
                        <Tag key={r} label={r} />
                      ))}
                    </div>
                    <Toggle label="Plays for the club" checked={m.isPlayer} onChange={(v) => details(m, { isPlayer: v })} />
                    {m.isPlayer && (
                      <Select label="Position" value={m.primaryPosition ?? ""} onChange={(e) => details(m, { primaryPosition: e.target.value || null })}>
                        <option value="">Not set</option>
                        {positions.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </Select>
                    )}
                    <Toggle label="Coach" checked={m.isCoach} onChange={(v) => details(m, { isCoach: v })} />
                    <div className="flex flex-wrap gap-2">
                      {isOwner && !isOwnerRow && !isAdmin && <Button small kind="secondary" onClick={() => grant(m, "admin")}>Make admin</Button>}
                      {isOwner && isAdmin && <Button small kind="secondary" onClick={() => end(m, "admin")}>Remove admin</Button>}
                      {!isCaptain && <Button small kind="secondary" onClick={() => grant(m, "captain")}>Make captain</Button>}
                      {isCaptain && <Button small kind="secondary" onClick={() => end(m, "captain")}>Remove captain</Button>}
                      {!isOwnerRow && !self && (isOwner || !isAdmin) && (
                        <Button small kind="danger" onClick={() => confirmAction(`Remove ${m.user.name}? Their membership ends; history is kept.`) && run(del(`/api/memberships/${m.id}`))}>
                          Remove from club
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Loaded>
    </>
  );
}
