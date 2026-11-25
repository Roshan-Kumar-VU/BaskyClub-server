"use client";

import { LIMITS, youtubeId } from "@baskyclub/shared";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { OrgGuard } from "@/components/org-guard";
import { Button, Field, PageTitle, TextArea, toast } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";
import { invalidate } from "@/lib/store";
import type { OrgPage } from "@/lib/types";

/** Official post for the association (association staff only; PRD §7). */
export default function OfficialPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrgGuard id={id} need="post">{(org) => <OfficialPost org={org} />}</OrgGuard>;
}

function OfficialPost({ org }: { org: OrgPage }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [yt, setYt] = useState("");
  const [busy, setBusy] = useState(false);
  const ytOk = !yt.trim() || !!youtubeId(yt.trim());

  const share = async () => {
    setBusy(true);
    try {
      await post("/api/posts", { organizationId: org.id, content: text.trim(), youtubeUrl: yt.trim() || undefined });
      invalidate(`/api/associations/${org.id}`, "/api/feed");
      toast("Posted");
      router.push(`/associations/${org.id}`);
    } catch (e) {
      toast("Couldn't post", errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title={`Post as ${org.shortName ?? org.name}`} back={{ href: `/associations/${org.id}/manage`, label: "Manage association" }} />
      <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
        <TextArea label="What's the news?" value={text} onChange={(e) => setText(e.target.value)} placeholder="Results, selections, tournament dates…" maxLength={LIMITS.postContent.max} rows={6} />
        <Field label="YouTube link (optional)" type="url" value={yt} onChange={(e) => setYt(e.target.value)} placeholder="https://youtu.be/…" error={ytOk ? undefined : "That doesn't look like a YouTube link."} />
        <Button block loading={busy} disabled={!text.trim() || !ytOk} onClick={share}>
          Share
        </Button>
      </div>
    </>
  );
}
