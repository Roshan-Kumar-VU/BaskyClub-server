"use client";

import { fits, LIMITS } from "@baskyclub/shared";
import { use, useState } from "react";
import { CsvImport } from "@/components/csv-import";
import { OrgGuard } from "@/components/org-guard";
import { PersonPicker } from "@/components/person-picker";
import { Button, Card, confirmAction, Field, Loaded, PageTitle, Tag, toast } from "@/components/ui";
import { del, errorMessage, patch, post } from "@/lib/api";
import { useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { BearerRow, OrgPage } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);
const year = (d: string) => new Date(d).getFullYear();

/** Office bearers (#60): current and past terms. End a term to keep history; delete only mistakes. */
export default function BearersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrgGuard id={id} need="manage">{(org) => <Bearers org={org} />}</OrgGuard>;
}

function Bearers({ org }: { org: OrgPage }) {
  const { isTeam } = useSession();
  const path = `/api/associations/${org.id}/office-bearers?past=1`;
  const q = useApi<{ officeBearers: BearerRow[] }>(path);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState(today());
  const [linked, setLinked] = useState<{ id: string; name: string } | null>(null);
  const refresh = () => invalidate(`/api/associations/${org.id}`);
  const run = async (p: Promise<unknown>, ok?: string) => {
    try {
      await p;
      if (ok) toast(ok);
      return true;
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
      return false;
    } finally {
      refresh();
    }
  };

  const add = async (current: number) => {
    const ok = await run(post(`/api/associations/${org.id}/office-bearers`, { name: name.trim(), designation: title.trim(), termFrom: from, userId: linked?.id ?? null, sortOrder: current + 1 }), "Added");
    if (ok) {
      setName("");
      setTitle("");
      setLinked(null);
    }
  };

  return (
    <>
      <PageTitle title="Office bearers" sub={org.name} back={{ href: `/associations/${org.id}/manage`, label: "Manage association" }} />
      <Loaded q={q}>
        {({ officeBearers: rows }) => (
          <div className="space-y-3">
            {rows.map((b) => (
              <Card key={b.id}>
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-bold">{b.name}</span>
                    <Tag tone={b.isCurrent ? "success" : "neutral"} label={b.isCurrent ? "Current" : "Past"} />
                  </div>
                  <div className="text-[13px] text-muted">
                    {b.designation} · {year(b.termFrom)}–{b.termTo ? year(b.termTo) : "now"}
                    {b.userId ? " · has an account" : ""}
                  </div>
                  <div className="flex gap-2">
                    {b.isCurrent && <Button small kind="secondary" onClick={() => run(patch(`/api/office-bearers/${b.id}`, { termTo: today() }), "Term ended")}>End term today</Button>}
                    <Button small kind="ghost" onClick={() => confirmAction(`Delete ${b.name}? Use this only for wrong entries. To keep history, end the term instead.`) && run(del(`/api/office-bearers/${b.id}`))}>
                      Delete (mistake)
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            <Card title="Add an office bearer">
              <div className="space-y-3 p-4">
                <Field label="Name as it should appear" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mr. S. Rajendran" maxLength={LIMITS.officeBearerName.max} />
                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="President, Secretary, Treasurer…" maxLength={LIMITS.officeBearerDesignation.max} />
                <Field label="Term starts" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <PersonPicker
                  label="Link to their BaskyCLub account (optional)"
                  onPick={(p) => {
                    setLinked(p);
                    if (!name) setName(p.name);
                  }}
                />
                {linked && (
                  <div className="text-sm text-accent-ink">
                    Linked to {linked.name} ✓{" "}
                    <button type="button" className="font-bold underline" onClick={() => setLinked(null)}>
                      Unlink
                    </button>
                  </div>
                )}
                <Button block disabled={!fits(name, LIMITS.officeBearerName) || !fits(title, LIMITS.officeBearerDesignation) || !/^\d{4}-\d{2}-\d{2}$/.test(from)} onClick={() => add(rows.filter((r) => r.isCurrent).length)}>
                  Add
                </Button>
              </div>
            </Card>
            {isTeam && <CsvImport orgId={org.id} kind="office-bearers" onDone={refresh} />}
          </div>
        )}
      </Loaded>
    </>
  );
}
