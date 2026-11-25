"use client";

import { fits, LIMITS, type Audience } from "@baskyclub/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DistrictSelect } from "@/components/district-select";
import { ALERTS } from "@/components/site-nav";
import { Button, Field, Loading, PageTitle, Select, TextArea, toast, Toggle } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";
import { audienceLabel } from "@/lib/labels";
import { invalidate, useApi } from "@/lib/store";
import type { ClubPage, OrgPage } from "@/lib/types";

/** Send an alert (#65, #75): from an association (?orgId), a club (?clubId) or the BaskyCLub team. */
export default function AnnouncePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Announce />
    </Suspense>
  );
}

function Announce() {
  const router = useRouter();
  const params = useSearchParams();
  const orgId = params.get("orgId");
  const clubId = params.get("clubId");
  const org = useApi<OrgPage>(orgId ? `/api/associations/${orgId}` : null).data;
  const club = useApi<ClubPage>(clubId ? `/api/clubs/${clubId}` : null).data;
  const options: Audience[] = orgId ? ["affiliated_members", "club_admins_in_area", "district_users", "followers"] : clubId ? ["club_members", "followers"] : ["everyone", "district_users"];
  const [audience, setAudience] = useState<Audience>(options[0]);
  const [district, setDistrict] = useState<string>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [inFeed, setInFeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const from = org?.name ?? club?.name ?? (orgId || clubId ? "…" : "BaskyCLub team");
  const covered = org && org.level === "district" ? org.coveredDistricts.map((d) => d.code) : undefined;
  const back = orgId ? `/associations/${orgId}/manage` : clubId ? `/clubs/${clubId}/manage` : "/admin";

  const send = async () => {
    setBusy(true);
    try {
      const r = await post<{ id: string; pushed: number }>("/api/announcements", {
        senderOrgId: orgId ?? undefined,
        senderClubId: clubId ?? undefined,
        audience,
        districtCode: audience === "district_users" ? district : undefined,
        title: title.trim(),
        body: body.trim(),
        showInFeed: inFeed,
      });
      invalidate(ALERTS, "/api/alerts", "/api/feed");
      toast("Alert sent", r.pushed ? `Pushed to ${r.pushed} phone${r.pushed === 1 ? "" : "s"}.` : "It is in their Alerts inbox.");
      router.push(back);
    } catch (e) {
      toast("Couldn't send", errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Send an alert" sub={`From ${from}`} back={{ href: back, label: "Back" }} />
      <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
        <Select label="Send to" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
          {options.map((o) => (
            <option key={o} value={o}>
              {audienceLabel[o]}
            </option>
          ))}
        </Select>
        {audience === "district_users" && <DistrictSelect value={district} onChange={setDistrict} only={covered} />}
        <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="District league registrations open" maxLength={LIMITS.announcementTitle.max} />
        <TextArea label="Message" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details, dates, who to contact" maxLength={LIMITS.announcementBody.max} rows={6} />
        <Toggle label="Also show in the feed" sub={audience === "club_members" ? "As a members-only pinned card" : "As a pinned Official card"} checked={inFeed} onChange={setInFeed} />
        <p className="text-[13px] text-muted">Alerts can&apos;t be liked or commented on. Up to 10 a day.</p>
        <Button block loading={busy} disabled={!fits(title, LIMITS.announcementTitle) || !fits(body, LIMITS.announcementBody) || (audience === "district_users" && !district)} onClick={send}>
          Send alert
        </Button>
      </div>
    </>
  );
}
