"use client";

import type { PracticeTime } from "@baskyclub/shared";
import { use, useState } from "react";
import { Button, Card, Empty, Loaded, PageTitle, toast, Toggle } from "@/components/ui";
import { errorMessage, put } from "@/lib/api";
import { invalidate, useApi } from "@/lib/store";
import type { ClubPage } from "@/lib/types";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type Day = { on: boolean; full: boolean; ms: string; me: string; es: string; ee: string };

/** Weekly practice hours (PRD §5): shown on the map and the club page. dayOfWeek 1 = Monday. */
export default function TimingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const club = useApi<ClubPage>(`/api/clubs/${id}`);
  return (
    <Loaded q={club} notFound={<Empty title="Club not found" />}>
      {(c) => (c.viewer.canManage ? <Timings club={c} /> : <Empty title="Owners and admins only" />)}
    </Loaded>
  );
}

function Timings({ club }: { club: ClubPage }) {
  const [rows, setRows] = useState<Day[]>(() =>
    days.map((_, i) => {
      const t = (club.timings ?? []).find((x: PracticeTime) => x.dayOfWeek === i + 1);
      return t ? { on: true, full: t.isFullDay, ms: t.morningStart ?? "", me: t.morningEnd ?? "", es: t.eveningStart ?? "", ee: t.eveningEnd ?? "" } : { on: false, full: false, ms: "", me: "", es: "", ee: "" };
    }),
  );
  const [busy, setBusy] = useState(false);
  const edit = (i: number, k: keyof Day, v: string | boolean) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const time = (i: number, k: "ms" | "me" | "es" | "ee", label: string) => (
    <input type="time" aria-label={`${days[i]} ${label}`} value={rows[i][k]} onChange={(e) => edit(i, k, e.target.value)} className="h-10 flex-1 rounded-lg border border-line bg-card px-2" />
  );

  const save = async () => {
    setBusy(true);
    const timings = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.on)
      .map(({ r, i }) => ({ dayOfWeek: i + 1, isFullDay: r.full, morningStart: r.full ? null : r.ms || null, morningEnd: r.full ? null : r.me || null, eveningStart: r.full ? null : r.es || null, eveningEnd: r.full ? null : r.ee || null }));
    try {
      await put(`/api/clubs/${club.id}/timings`, { timings });
      invalidate(`/api/clubs/${club.id}`, "/api/map");
      toast("Practice hours saved");
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Practice hours" sub={club.name} back={{ href: `/clubs/${club.id}/manage`, label: "Manage club" }} />
      <div className="space-y-3">
        {days.map((d, i) => (
          <Card key={d}>
            <div className="space-y-2 p-4">
              <Toggle label={d} checked={rows[i].on} onChange={(v) => edit(i, "on", v)} />
              {rows[i].on && (
                <>
                  <Toggle label="Open all day" checked={rows[i].full} onChange={(v) => edit(i, "full", v)} />
                  {!rows[i].full && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-sm">Morning</span>
                        {time(i, "ms", "from")}
                        {time(i, "me", "to")}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-sm">Evening</span>
                        {time(i, "es", "from")}
                        {time(i, "ee", "to")}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </Card>
        ))}
        <Button block loading={busy} onClick={save}>
          Save practice hours
        </Button>
      </div>
    </>
  );
}
