"use client";

import { useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { PersonPicker } from "@/components/person-picker";
import { Button, Card, confirmAction, Loaded, Row, Segmented, toast } from "@/components/ui";
import { del, errorMessage, post } from "@/lib/api";
import { ME } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { PlatformRole } from "@/lib/types";

const label: Record<PlatformRole, string> = { super_admin: "Super admin", basky_admin: "Basky team", moderator: "Moderator" };
type RoleRow = { id: string; role: PlatformRole; user: { id: string; name: string } };

/** Super admins give and end BaskyCLub roles (at least one super admin always stays). */
export default function AdminRolesPage() {
  return (
    <AdminGuard need="super" title="BaskyCLub roles">
      <Roles />
    </AdminGuard>
  );
}

function Roles() {
  const q = useApi<{ roles: RoleRow[] }>("/api/admin/roles");
  const [role, setRole] = useState<PlatformRole>("moderator");
  const run = async (p: Promise<unknown>, ok?: string) => {
    try {
      await p;
      if (ok) toast(ok);
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      invalidate("/api/admin/roles", ME);
    }
  };
  return (
    <div className="space-y-4">
      <Loaded q={q}>
        {({ roles }) => (
          <Card title="Current roles">
            {roles.map((r) => (
              <Row
                key={r.id}
                label={r.user.name}
                sub={label[r.role]}
                right={<Button small kind="secondary" onClick={() => confirmAction(`End ${r.user.name}'s role? They stop being ${label[r.role]} right away.`) && run(del(`/api/admin/roles/${r.id}`), "Role ended")}>End</Button>}
              />
            ))}
          </Card>
        )}
      </Loaded>
      <Card title="Give a role">
        <div className="space-y-3 p-4">
          <Segmented value={role} onChange={setRole} options={(Object.keys(label) as PlatformRole[]).map((value) => ({ value, label: label[value] }))} />
          <PersonPicker label="Person" onPick={(p) => run(post("/api/admin/roles", { userId: p.id, role }), `${p.name} is now ${label[role]}`)} />
          <p className="text-[13px] text-muted">Moderators review posts. The Basky team approves clubs and manages users. Super admins can also give roles.</p>
        </div>
      </Card>
    </div>
  );
}
