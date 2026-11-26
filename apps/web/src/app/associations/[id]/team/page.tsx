"use client";

import { use, useState } from "react";
import { OrgGuard } from "@/components/org-guard";
import { PersonPicker } from "@/components/person-picker";
import { Button, Card, confirmAction, Loaded, PageTitle, Row, Segmented, toast } from "@/components/ui";
import { del, errorMessage, post } from "@/lib/api";
import { ME, useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { AccessLevel, OrgMemberRow, OrgPage } from "@/lib/types";

const label: Record<AccessLevel, string> = { owner: "Owner", admin: "Admin", member: "Member" };

/** Who can use the association tools (#62). */
export default function AssociationTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrgGuard id={id} need="manage">{(org) => <Team org={org} />}</OrgGuard>;
}

function Team({ org }: { org: OrgPage }) {
  const { user, isTeam } = useSession();
  const path = `/api/associations/${org.id}/members`;
  const q = useApi<{ members: OrgMemberRow[] }>(path);
  const mine = org.viewer.accessLevel;
  const allowed: AccessLevel[] = isTeam ? ["owner", "admin", "member"] : mine === "owner" ? ["admin", "member"] : ["member"];
  const [level, setLevel] = useState<AccessLevel>("member");
  const canRemove = (lvl: AccessLevel, self: boolean) => self || isTeam || (mine === "owner" && lvl !== "owner") || (mine === "admin" && lvl === "member");
  const run = async (p: Promise<unknown>, ok?: string) => {
    try {
      await p;
      if (ok) toast(ok);
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      invalidate(path, `/api/associations/${org.id}`, ME);
    }
  };

  return (
    <>
      <PageTitle title="Association team" sub={org.name} back={{ href: `/associations/${org.id}/manage`, label: "Manage association" }} />
      <div className="space-y-4">
        <Loaded q={q}>
          {({ members }) => (
            <>
              <Card title="Team">
                {members.map((r) => {
                  const self = r.user.id === user?.id;
                  return (
                    <Row
                      key={r.id}
                      label={r.user.name + (self ? " (you)" : "")}
                      sub={label[r.accessLevel]}
                      right={
                        canRemove(r.accessLevel, self) ? (
                          <Button small kind="secondary" onClick={() => confirmAction(`Remove ${r.user.name}? They lose access to the association tools.`) && run(del(`/api/organization-members/${r.id}`))}>
                            {self ? "Step down" : "Remove"}
                          </Button>
                        ) : undefined
                      }
                    />
                  );
                })}
              </Card>
              <Card title="Add someone">
                <div className="space-y-3 p-4">
                  <Segmented value={level} onChange={setLevel} options={allowed.map((l) => ({ value: l, label: label[l] }))} />
                  <PersonPicker label="Person" exclude={members.map((r) => r.user.id)} onPick={(p) => run(post(path, { userId: p.id, accessLevel: level }), `${p.name} added as ${label[level]}`)} />
                  <p className="text-[13px] text-muted">Members can post for the association and send alerts. Admins can also edit the page, office bearers and Media.</p>
                </div>
              </Card>
            </>
          )}
        </Loaded>
      </div>
    </>
  );
}
