"use client";

import { fits, LIMITS, type ClubMember } from "@baskyclub/shared";
import { use, useState } from "react";
import { PhotoUpload } from "@/components/photo-upload";
import { Avatar, Button, Card, confirmAction, Empty, Field, Loaded, PageTitle, Row, TextArea, toast, Toggle } from "@/components/ui";
import { errorMessage, patch, post } from "@/lib/api";
import { ME } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { ClubPage } from "@/lib/types";

/** Manage a club (owners and admins): details, people, requests, practice hours, alerts, hand over. */
export default function ManageClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useApi<ClubPage>(`/api/clubs/${id}`);
  return (
    <Loaded q={q} notFound={<Empty title="Club not found" />}>
      {(club) => (club.viewer.canManage ? <Manage club={club} /> : <Empty title="Owners and admins only" />)}
    </Loaded>
  );
}

function Manage({ club }: { club: ClubPage }) {
  const id = club.id;
  const [f, setF] = useState({ name: club.name, motto: club.motto ?? "", description: club.description ?? "", logoUrl: club.logoUrl ?? "", bannerUrl: club.bannerUrl ?? "" });
  const [saving, setSaving] = useState(false);
  const [keepAdmin, setKeepAdmin] = useState(true);
  const members = useApi<{ members: ClubMember[] }>(club.viewer.isOwner ? `/api/clubs/${id}/members?limit=50` : null).data?.members ?? [];
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await patch(`/api/clubs/${id}`, { name: f.name.trim(), motto: f.motto.trim() || null, description: f.description.trim() || null, logoUrl: f.logoUrl || null, bannerUrl: f.bannerUrl || null });
      invalidate(`/api/clubs/${id}`, "/api/clubs?");
      toast("Saved");
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handOver = async (m: ClubMember) => {
    if (!confirmAction(`Hand ${club.name} over to ${m.user.name}? ${keepAdmin ? "You stay on as an admin." : "You will no longer have any role in the club."}`)) return;
    try {
      await post(`/api/clubs/${id}/transfer-ownership`, { newOwnerUserId: m.user.id, keepAsAdmin: keepAdmin });
      invalidate(`/api/clubs/${id}`, ME);
      toast(`${m.user.name} now owns the club`);
    } catch (e) {
      toast("Couldn't hand over", errorMessage(e));
    }
  };

  return (
    <>
      <PageTitle title="Manage club" sub={club.name} back={{ href: `/clubs/${id}`, label: club.name }} />
      <div className="space-y-4">
        {club.status !== "approved" && (
          <Card>
            <div className="p-4">
              <div className="font-bold">Status: {club.status === "pending" ? "waiting for BaskyCLub approval" : "suspended"}</div>
              <div className="text-[13px] text-muted">Only you and the BaskyCLub team can see the club until it&apos;s approved.</div>
            </div>
          </Card>
        )}
        <Card>
          <Row label="People and roles" sub="Positions, coach, admins, captain, remove" href={`/clubs/${id}/members`} />
          <Row label="Join requests" href={`/clubs/${id}/requests`} />
          <Row label="Practice hours" href={`/clubs/${id}/timings`} />
          {/* Link requests to associations stay closed in Phase 1 (PRD §5); the Basky team sets them up */}
          <Row label="Association affiliation" sub={club.affiliatedTo ? `Affiliated to ${club.affiliatedTo.shortName ?? club.affiliatedTo.name}` : "Not affiliated"} />
          <Row label="Send an alert" sub="To members or followers" href={`/announce?clubId=${id}`} />
        </Card>
        <Card title="Club details">
          <div className="space-y-3 p-4">
            <Field label="Name" value={f.name} onChange={(e) => set("name")(e.target.value)} maxLength={LIMITS.clubName.max} />
            <Field label="Motto" value={f.motto} onChange={(e) => set("motto")(e.target.value)} />
            <TextArea label="About" value={f.description} onChange={(e) => set("description")(e.target.value)} />
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={f.name || "?"} src={f.logoUrl || null} size={48} square />
              <PhotoUpload label={f.logoUrl ? "Change logo" : "Add logo"} onUploaded={set("logoUrl")} />
              <PhotoUpload label={f.bannerUrl ? "Change banner" : "Add banner"} onUploaded={set("bannerUrl")} />
              {f.logoUrl && <Button small kind="ghost" onClick={() => set("logoUrl")("")}>Remove logo</Button>}
              {f.bannerUrl && <Button small kind="ghost" onClick={() => set("bannerUrl")("")}>Remove banner</Button>}
            </div>
            {f.bannerUrl && <img src={f.bannerUrl} alt="" className="h-28 w-full rounded-xl object-cover" />}
            <Button block loading={saving} disabled={!fits(f.name, LIMITS.clubName)} onClick={save}>
              Save details
            </Button>
          </div>
        </Card>
        {club.viewer.isOwner && (
          <Card title="Hand over the club">
            <div className="space-y-3 p-4">
              <p className="text-[13px] text-muted">The new owner must be an adult member. You can only leave the club after handing it over.</p>
              <Toggle label="Stay on as an admin" checked={keepAdmin} onChange={setKeepAdmin} />
            </div>
            {members
              .filter((m) => !m.roles.includes("owner"))
              .map((m) => (
                <Row key={m.id} label={m.user.name} sub={m.roles.join(", ") || (m.isPlayer ? "Player" : "Member")} right={<Button small kind="secondary" onClick={() => handOver(m)}>Make owner</Button>} />
              ))}
          </Card>
        )}
      </div>
    </>
  );
}
