"use client";

import { fits, LIMITS, youtubeId } from "@baskyclub/shared";
import { use, useState } from "react";
import { CsvImport } from "@/components/csv-import";
import { OrgGuard } from "@/components/org-guard";
import { PhotoUpload } from "@/components/photo-upload";
import { Button, Card, confirmAction, Field, Loaded, PageTitle, Segmented, TextArea, toast } from "@/components/ui";
import { del, errorMessage, post } from "@/lib/api";
import { useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { LegacyRecord, OrgPage } from "@/lib/types";

type Kind = "tournament_record" | "history" | "achievement";

/** Media / Legacy (#64): history, tournament records, photos and videos on the association page. */
export default function LegacyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrgGuard id={id} need="manage">{(org) => <Legacy org={org} />}</OrgGuard>;
}

function Legacy({ org }: { org: OrgPage }) {
  const { isTeam } = useSession();
  const q = useApi<{ records: LegacyRecord[] }>(`/api/associations/${org.id}/legacy`);
  const [type, setType] = useState<Kind>("tournament_record");
  const [title, setTitle] = useState("");
  const [yr, setYr] = useState(String(new Date().getFullYear()));
  const [body, setBody] = useState("");
  const [winner, setWinner] = useState("");
  const [runner, setRunner] = useState("");
  const [photo, setPhoto] = useState("");
  const [video, setVideo] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => invalidate(`/api/associations/${org.id}`);
  const yearOk = !yr || (/^\d{4}$/.test(yr) && Number(yr) >= 1900 && Number(yr) <= new Date().getFullYear() + 1);
  const videoOk = !video.trim() || !!youtubeId(video.trim());

  const add = async () => {
    setBusy(true);
    try {
      await post(`/api/associations/${org.id}/legacy`, {
        recordType: type,
        title: title.trim(),
        year: yr ? Number(yr) : null,
        body: body.trim() || null,
        winner: type === "tournament_record" ? winner.trim() || null : null,
        runnerUp: type === "tournament_record" ? runner.trim() || null : null,
        media: [...(photo ? [{ mediaType: "image" as const, url: photo }] : []), ...(video.trim() ? [{ mediaType: "youtube" as const, url: video.trim() }] : [])],
      });
      setTitle("");
      setBody("");
      setWinner("");
      setRunner("");
      setPhoto("");
      setVideo("");
      toast("Added to Media");
    } catch (e) {
      toast("Couldn't add", errorMessage(e));
    } finally {
      refresh();
      setBusy(false);
    }
  };

  const remove = async (r: LegacyRecord) => {
    if (!confirmAction(`Delete “${r.title}”? This removes it from the Media section.`)) return;
    try {
      await del(`/api/legacy/${r.id}`);
    } catch (e) {
      toast("Couldn't delete", errorMessage(e));
    } finally {
      refresh();
    }
  };

  return (
    <>
      <PageTitle title="Media / Legacy" sub={org.name} back={{ href: `/associations/${org.id}/manage`, label: "Manage association" }} />
      <Loaded q={q}>
        {({ records }) => (
          <div className="space-y-3">
            {records.map((r) => (
              <Card key={r.id}>
                <div className="space-y-1 p-4">
                  <div className="font-bold">
                    {r.year ?? new Date(r.createdAt).getFullYear()} · {r.title}
                  </div>
                  {r.body && <p className="text-sm text-ink-2">{r.body}</p>}
                  <div className="text-[13px] text-muted">{r.media.length} photo/video</div>
                  <Button small kind="ghost" onClick={() => remove(r)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
            <Card title="Add a record">
              <div className="space-y-3 p-4">
                <Segmented value={type} onChange={setType} options={[{ value: "tournament_record", label: "Tournament" }, { value: "history", label: "History" }, { value: "achievement", label: "Achievement" }]} />
                <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="District Championship — men" maxLength={LIMITS.legacyTitle.max} />
                <Field label="Year" inputMode="numeric" value={yr} onChange={(e) => setYr(e.target.value)} error={yearOk ? undefined : "Use a year like 2019."} />
                {type === "tournament_record" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Winner" value={winner} onChange={(e) => setWinner(e.target.value)} />
                    <Field label="Runner-up" value={runner} onChange={(e) => setRunner(e.target.value)} />
                  </div>
                )}
                <TextArea label="Story (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
                <div className="flex items-center gap-3">
                  <PhotoUpload label={photo ? "Change photo" : "Add a photo"} onUploaded={setPhoto} />
                  {photo && (
                    <>
                      <img src={photo} alt="" className="size-12 rounded-lg object-cover" />
                      <Button small kind="ghost" onClick={() => setPhoto("")}>Remove</Button>
                    </>
                  )}
                </div>
                <Field label="YouTube link (optional)" type="url" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtu.be/…" error={videoOk ? undefined : "That doesn't look like a YouTube link."} />
                <Button block loading={busy} disabled={!fits(title, LIMITS.legacyTitle) || !yearOk || !videoOk} onClick={add}>
                  Add record
                </Button>
              </div>
            </Card>
            {isTeam && <CsvImport orgId={org.id} kind="legacy" onDone={refresh} />}
          </div>
        )}
      </Loaded>
    </>
  );
}
