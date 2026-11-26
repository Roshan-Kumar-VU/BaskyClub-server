"use client";

import { AdminGuard } from "@/components/admin-guard";
import { Card, Row } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/store";

const count = (n: number | undefined) => (n === undefined ? undefined : <span className="text-sm font-bold text-muted tabular-nums">{n}</span>);

/** BaskyCLub team dashboard (#12, #35, #43, #61). */
export default function AdminPage() {
  return (
    <AdminGuard need="team" title="Admin">
      <Dashboard />
    </AdminGuard>
  );
}

function Dashboard() {
  const { user } = useSession();
  const isSuper = !!user?.platformRoles.includes("super_admin");
  const clubs = useApi<{ clubs: unknown[] }>("/api/admin/clubs?status=pending").data?.clubs.length;
  const courts = useApi<{ courts: unknown[] }>("/api/admin/courts").data?.courts.length;
  const cases = useApi<{ cases: unknown[] }>("/api/moderation/cases?status=open").data?.cases.length;
  const creators = useApi<{ requests: unknown[] }>("/api/admin/badges/requests").data?.requests.length;
  return (
    <div className="space-y-4">
      <Card title="Waiting for you">
        <Row label="Clubs to approve" href="/admin/clubs" right={count(clubs)} />
        <Row label="Courts to approve" href="/admin/courts" right={count(courts)} />
        <Row label="Review queue" href="/admin/moderation" right={count(cases)} />
        <Row label="Creator requests" href="/admin/creators" right={count(creators)} />
      </Card>
      <Card title="Manage">
        <Row label="Associations" sub={isSuper ? "Create, publish, hand over, districts covered" : "Publish, hand over, districts covered"} href="/admin/associations" />
        <Row label="Badges" sub="Verified clubs and Creators" href="/admin/badges" />
        <Row label="Users" sub="Find accounts; limit, suspend, restore or delete" href="/admin/users" />
        {isSuper && <Row label="BaskyCLub roles" sub="Super admins, Basky team, moderators" href="/admin/roles" />}
        <Row label="Send an alert to everyone" href="/announce" />
        {isSuper && <Row label="Change history" href="/admin/history" />}
      </Card>
    </div>
  );
}
