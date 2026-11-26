"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { DistrictSelect } from "@/components/district-select";
import { Button, Card, Field, Loaded, Row, Segmented, Tag, toast } from "@/components/ui";
import { errorMessage, patch, post } from "@/lib/api";
import { useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { OrgRef } from "@/lib/types";

type Level = "district" | "state" | "national" | "league_operator";
const statusLabel: Record<string, string> = { draft: "Draft (hidden)", published: "Managed by BaskyCLub", claimed: "Official (run by them)" };
const LIST = "/api/associations?limit=50";

/** Basky team: publish associations and hand them over (#59, #60). Only super admins create them (PRD §8). */
export default function AdminAssociationsPage() {
  return (
    <AdminGuard need="team" title="Associations">
      <Associations />
    </AdminGuard>
  );
}

function Associations() {
  const router = useRouter();
  const isSuper = !!useSession().user?.platformRoles.includes("super_admin");
  const q = useApi<{ associations: OrgRef[] }>(LIST);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [level, setLevel] = useState<Level>("district");
  const [district, setDistrict] = useState<string>();
  const [busy, setBusy] = useState(false);
  const orgs = q.data?.associations ?? [];
  const tnba = orgs.find((o) => o.level === "state" && o.stateCode === "TN");

  const setStatus = async (id: string, pageStatus: string) => {
    try {
      await patch(`/api/associations/${id}`, { pageStatus });
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      invalidate("/api/associations");
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      const r = await post<{ id: string }>("/api/associations", {
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        level,
        stateCode: level === "district" || level === "state" ? "TN" : undefined,
        parentId: level === "district" ? tnba?.id : undefined,
        districtCodes: level === "district" && district ? [district] : [],
      });
      invalidate("/api/associations", "/api/places");
      toast("Created as a draft", "Publish it from the list when the page is ready.");
      router.push(`/associations/${r.id}/manage`);
    } catch (e) {
      toast("Couldn't create", errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Loaded q={q}>
        {() => (
          <Card title={`Associations (${orgs.length})`}>
            {orgs.map((o) => (
              <div key={o.id} className="border-t border-line first:border-t-0">
                <Row label={o.name} sub={`${o.level}${o.stateCode ? ` · ${o.stateCode}` : ""}`} href={`/associations/${o.id}/manage`} right={<Tag label={statusLabel[o.pageStatus ?? ""] ?? o.pageStatus ?? ""} />} />
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  {o.pageStatus !== "published" && <Button small kind="secondary" onClick={() => setStatus(o.id, "published")}>Publish</Button>}
                  {o.pageStatus !== "claimed" && <Button small kind="secondary" onClick={() => setStatus(o.id, "claimed")}>Mark as official</Button>}
                  {o.pageStatus !== "draft" && <Button small kind="ghost" onClick={() => setStatus(o.id, "draft")}>Back to draft</Button>}
                </div>
              </div>
            ))}
          </Card>
        )}
      </Loaded>
      {isSuper && (
        <Card title="Create an association">
          <div className="space-y-3 p-4">
            <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ranipet District Basketball Association" />
            <Field label="Short name" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Ranipet DBA" />
            <Segmented value={level} onChange={setLevel} options={[{ value: "district", label: "District" }, { value: "state", label: "State" }, { value: "national", label: "National" }, { value: "league_operator", label: "League" }]} />
            {level === "district" && <DistrictSelect label="Covers district" value={district} onChange={setDistrict} />}
            <p className="text-[13px] text-muted">New associations start as hidden drafts{level === "district" ? ", under TNBA" : ""}. Add the owner from its Manage page.</p>
            <Button block loading={busy} disabled={name.trim().length < 3 || (level === "district" && !district)} onClick={create}>
              Create
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
