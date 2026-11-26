"use client";

import { fits, LIMITS } from "@baskyclub/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DistrictSelect } from "@/components/district-select";
import { Button, Empty, Field, LinkButton, Loading, PageTitle, Segmented, Select, TextArea, toast, Toggle } from "@/components/ui";
import { errorMessage, post } from "@/lib/api";
import { positions } from "@/lib/labels";
import { useScope } from "@/lib/scope";
import { ME, useSession } from "@/lib/session";
import { invalidate } from "@/lib/store";

/** Register a club or academy (#12). The BaskyCLub team approves it before it shows in search. */
export default function NewClubPage() {
  const router = useRouter();
  const { user, ready } = useSession();
  const { districtCode } = useScope();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"club" | "academy">("club");
  const [district, setDistrict] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [motto, setMotto] = useState("");
  const [iPlay, setIPlay] = useState(true);
  const [position, setPosition] = useState("");
  const [busy, setBusy] = useState(false);

  if (!ready) return <Loading />;
  if (!user) return <Empty title="Log in to register a club" action={<LinkButton href="/login?next=/clubs/new">Log in</LinkButton>} />;
  if (user.isMinor) return <Empty title="Clubs are registered by adults" body="Ask your coach or a parent to register the club; they can add you as a member." />;
  const chosen = district ?? user.homeDistrictCode ?? districtCode;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await post<{ id: string }>("/api/clubs", {
        name: name.trim(),
        kind,
        districtCode: chosen,
        description: description.trim() || undefined,
        motto: motto.trim() || undefined,
        iPlay,
        primaryPosition: iPlay && position ? position : undefined,
      });
      invalidate(ME, `/api/users/${user.id}`, "/api/clubs");
      toast("Club registered", "The BaskyCLub team will review it. You can already set it up from Manage club.");
      router.replace(`/clubs/${r.id}`);
    } catch (e) {
      toast("Couldn't register the club", errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Register a club" back={{ href: "/clubs", label: "Clubs" }} />
      <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
        <Field label="Club name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gudiyatham Giants" maxLength={LIMITS.clubName.max} />
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-2">Type</span>
          <Segmented value={kind} onChange={setKind} options={[{ value: "club", label: "Club" }, { value: "academy", label: "Academy" }]} />
        </div>
        <DistrictSelect value={chosen} onChange={setDistrict} />
        <Field label="Motto (optional)" value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="Defend the fort" />
        <TextArea label="About the club (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Where you play, who can join" />
        <Toggle label="I play for this club" checked={iPlay} onChange={setIPlay} />
        {iPlay && (
          <Select label="Your position" value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">Not set</option>
            {positions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        )}
        <p className="text-[13px] text-muted">New clubs are checked by the BaskyCLub team before they appear in search.</p>
        <Button block loading={busy} disabled={!fits(name, LIMITS.clubName) || !chosen} onClick={submit}>
          Register club
        </Button>
      </div>
    </>
  );
}
