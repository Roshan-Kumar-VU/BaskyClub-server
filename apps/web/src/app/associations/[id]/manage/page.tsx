"use client";

import { use, useState } from "react";
import { OrgGuard } from "@/components/org-guard";
import { Button, Card, Field, PageTitle, Row, toast } from "@/components/ui";
import { errorMessage, patch } from "@/lib/api";
import { invalidate } from "@/lib/store";
import type { OrgPage } from "@/lib/types";

/** Association tools (#59–#66): post, alerts, office bearers, Media, team, contact details. */
export default function ManageAssociationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrgGuard id={id} need="post">{(org) => <Manage org={org} />}</OrgGuard>;
}

function Manage({ org }: { org: OrgPage }) {
  const id = org.id;
  const [f, setF] = useState({ contactEmail: org.contactEmail ?? "", contactPhone: org.contactPhone ?? "", address: org.address ?? "", website: org.website ?? "", registrationNo: org.registrationNo ?? "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      await patch(`/api/associations/${id}`, {
        contactEmail: f.contactEmail.trim() || null,
        contactPhone: f.contactPhone.trim() || null,
        address: f.address.trim() || null,
        website: f.website.trim() || null,
        registrationNo: f.registrationNo.trim() || null,
      });
      invalidate(`/api/associations/${id}`, "/api/associations?");
      toast("Saved");
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Manage association" sub={`${org.name} · Your access: ${org.viewer.accessLevel ?? "BaskyCLub team"} · Page: ${org.pageLabel}`} back={{ href: `/associations/${id}`, label: org.shortName ?? org.name }} />
      <div className="space-y-4">
        <Card title="Share news">
          <Row label="Post as the association" sub="Shows on the page and in feeds" href={`/associations/${id}/post`} />
          <Row label="Send an alert" sub="Club admins, affiliated members, a district, followers" href={`/announce?orgId=${id}`} />
        </Card>
        {org.viewer.canManage && (
          <>
            <Card title="Run the page">
              <Row label="Office bearers" sub="Titles and terms shown on the page" href={`/associations/${id}/bearers`} />
              <Row label="Media / Legacy" sub="History, records, photos, videos" href={`/associations/${id}/legacy`} />
              <Row label="Association team" sub="Who can use these tools" href={`/associations/${id}/team`} />
            </Card>
            <Card title="Contact details">
              <div className="space-y-3 p-4">
                <Field label="Email" type="email" value={f.contactEmail} onChange={set("contactEmail")} />
                <Field label="Phone" type="tel" value={f.contactPhone} onChange={set("contactPhone")} />
                <Field label="Address" value={f.address} onChange={set("address")} />
                <Field label="Website" type="url" value={f.website} onChange={set("website")} placeholder="https://" />
                <Field label="Registration number" value={f.registrationNo} onChange={set("registrationNo")} />
                <Button block loading={busy} onClick={save}>
                  Save details
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
