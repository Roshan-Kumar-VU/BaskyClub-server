"use client";

import { fits, LIMITS } from "@baskyclub/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DistrictSelect } from "@/components/district-select";
import { PhotoUpload } from "@/components/photo-upload";
import { Avatar, Button, Field, Loading, PageTitle, Segmented, TextArea, toast } from "@/components/ui";
import { errorMessage, patch } from "@/lib/api";
import { ME, useSession } from "@/lib/session";
import { invalidate } from "@/lib/store";
import type { Me } from "@/lib/types";

/** Edit profile (#72): photo, cover, name, bio, Instagram/YouTube (hidden on the profile for under-18), district. */
export default function EditProfilePage() {
  const { user, ready } = useSession();
  if (!ready) return <Loading />;
  if (!user) return null;
  return <EditProfile user={user} />;
}

function EditProfile({ user }: { user: Me }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: user.name,
    bio: user.bio ?? "",
    instagram: user.instagram ?? "",
    youtube: user.youtube ?? "",
    gender: user.gender,
    homeDistrictCode: user.homeDistrictCode,
    photoUrl: user.photoUrl,
    coverPhotoUrl: user.coverPhotoUrl,
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await patch(ME, {
        name: f.name.trim(),
        bio: f.bio.trim() || null,
        instagram: f.instagram.trim() || null,
        youtube: f.youtube.trim() || null,
        gender: f.gender ?? null,
        photoUrl: f.photoUrl ?? null,
        coverPhotoUrl: f.coverPhotoUrl ?? null,
        ...(f.homeDistrictCode ? { homeDistrictCode: f.homeDistrictCode } : {}),
      });
      invalidate(ME, `/api/users/${user.id}`, "/api/feed");
      toast("Profile saved");
      router.push("/profile");
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
      setSaving(false);
    }
  };
  const hidden = user.isMinor ? "Hidden on your profile until you turn 18." : undefined;

  return (
    <>
      <PageTitle title="Edit profile" back={{ href: "/profile", label: "Profile" }} />
      <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center gap-4">
          <Avatar name={f.name || "?"} src={f.photoUrl} size={72} />
          <div className="flex flex-wrap gap-2">
            <PhotoUpload label="Change photo" onUploaded={set("photoUrl")} />
            <PhotoUpload label={f.coverPhotoUrl ? "Change cover photo" : "Add cover photo"} onUploaded={set("coverPhotoUrl")} />
            {f.photoUrl && <Button small kind="ghost" onClick={() => set("photoUrl")(null)}>Remove photo</Button>}
            {f.coverPhotoUrl && <Button small kind="ghost" onClick={() => set("coverPhotoUrl")(null)}>Remove cover</Button>}
          </div>
        </div>
        {f.coverPhotoUrl && <img src={f.coverPhotoUrl} alt="" className="h-24 w-full rounded-xl object-cover" />}
        <Field label="Name" value={f.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" maxLength={LIMITS.personName.max} />
        <TextArea label="Bio" value={f.bio} onChange={(e) => set("bio")(e.target.value)} placeholder="Position, club, what you love about the game" maxLength={300} rows={3} />
        <Field label="Instagram username" value={f.instagram} onChange={(e) => set("instagram")(e.target.value)} placeholder="yourname" autoCapitalize="none" hint={hidden} />
        <Field label="YouTube channel" value={f.youtube} onChange={(e) => set("youtube")(e.target.value)} placeholder="@yourchannel" autoCapitalize="none" hint={hidden} />
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-2">Plays in</span>
          <Segmented value={f.gender ?? ""} onChange={(v) => set("gender")(v || null)} options={[{ value: "male", label: "Men's" }, { value: "female", label: "Women's" }]} />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-2">Home district</span>
          <DistrictSelect value={f.homeDistrictCode} onChange={set("homeDistrictCode")} />
        </div>
        <p className="text-[13px] text-muted">Email, phone and date of birth are never shown on your profile.</p>
        <Button block loading={saving} disabled={!fits(f.name, LIMITS.personName)} onClick={save}>
          Save
        </Button>
      </div>
    </>
  );
}
