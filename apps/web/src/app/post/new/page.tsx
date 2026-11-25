"use client";

import { LIMITS, youtubeId, type PostCard, type Visibility } from "@baskyclub/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar, Button, cx, Empty, LinkButton, Loading, PageTitle, Segmented, toast } from "@/components/ui";
import { errorMessage, post, uploadPhoto } from "@/lib/api";
import { useScope } from "@/lib/scope";
import { useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { Profile } from "@/lib/types";

const MAX_PHOTOS = 10; // apps/api posts.service MAX_IMAGES
const MAX_BYTES = 10 * 1024 * 1024; // apps/api uploads.service
type Photo = { file: File; preview: string; width: number; height: number };

function measure(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const preview = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ file, preview, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(preview);
      reject(new Error(`${file.name} isn't a photo this browser can open.`));
    };
    img.src = preview;
  });
}

/** New post (PRD §7): as yourself or for one of your clubs, with photos and/or a YouTube link. */
export default function NewPostPage() {
  const router = useRouter();
  const { user, ready } = useSession();
  const { places } = useScope();
  const profile = useApi<Profile>(user ? `/api/users/${user.id}` : null);
  const clubs = profile.data?.clubs ?? [];
  const [clubId, setClubId] = useState<string | undefined>();
  const [picked, setPicked] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [yt, setYt] = useState("");
  const [sending, setSending] = useState(false);

  // Default to the first club once clubs load (like the app)
  useEffect(() => {
    if (!picked && clubs[0]) setClubId(clubs[0].id);
  }, [clubs, picked]);
  // Free the photo previews when leaving the page
  const previews = useRef<string[]>([]);
  previews.current = photos.map((p) => p.preview);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  if (!ready) return <Loading />;
  if (!user) return <Empty title="Log in to post" body="Share games, achievements and club news." action={<LinkButton href="/login?next=/post/new">Log in</LinkButton>} />;
  if (!user.canPost) {
    const [title, body] = user.awaitingParent
      ? ["Waiting for your parent", "Your parent or guardian needs to confirm your account first. We sent them an email."]
      : user.status === "limited"
        ? ["Your account can only browse", "Contact the BaskyCLub team if you think this is a mistake."]
        : ["Join a club to post", "Posting is open to members of a club or academy. Find one near you and ask to join."];
    return <Empty title={title} body={body} action={!user.awaitingParent && user.status !== "limited" ? <LinkButton href="/clubs">Find a club</LinkButton> : undefined} />;
  }

  const club = clubs.find((c) => c.id === clubId);
  const districtCode = club?.districtCode ?? user.homeDistrictCode;
  const districtName = places?.districts.find((d) => d.code === districtCode)?.name;
  const ytValid = !yt.trim() || !!youtubeId(yt.trim());
  const tooLong = text.trim().length > LIMITS.postContent.max;
  const empty = !text.trim() && !photos.length && !yt.trim();

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const list = [...files].slice(0, room);
    if (files.length > room) toast(`Up to ${MAX_PHOTOS} photos per post.`);
    const ok: Photo[] = [];
    for (const f of list) {
      if (f.size > MAX_BYTES) {
        toast(`${f.name} is too big`, "Photos can be up to 10 MB.");
        continue;
      }
      try {
        ok.push(await measure(f));
      } catch (e) {
        toast("Couldn't add a photo", errorMessage(e));
      }
    }
    setPhotos((cur) => [...cur, ...ok].slice(0, MAX_PHOTOS));
  };

  const share = async () => {
    if (empty || !ytValid || tooLong || sending) return;
    setSending(true);
    try {
      const images = [];
      for (const p of photos) images.push({ url: await uploadPhoto(p.file), width: p.width, height: p.height });
      const created = await post<PostCard>("/api/posts", {
        content: text.trim() || undefined,
        clubId: club?.id,
        visibility: club ? visibility : "public",
        images,
        youtubeUrl: yt.trim() || undefined,
      });
      invalidate("/api/feed", `/api/users/${user.id}`, ...(club ? [`/api/clubs/${club.id}`] : []));
      if (created.moderationStatus !== "published") toast("Not visible yet", "This post is waiting for a moderator.");
      router.push(`/p/${created.id}`);
    } catch (e) {
      toast("Couldn't share the post", errorMessage(e));
      setSending(false);
    }
  };

  const asOption = (id: string | undefined, label: string, logo?: string | null) => (
    <button
      key={id ?? "me"}
      type="button"
      aria-pressed={clubId === id}
      onClick={() => {
        setPicked(true);
        setClubId(id);
        if (!id) setVisibility("public");
      }}
      className={cx("flex items-center gap-2 rounded-full border-2 py-1.5 pr-3.5 pl-1.5 text-sm font-bold", clubId === id ? "border-accent bg-accent-soft" : "border-line bg-card hover:bg-fill")}
    >
      <Avatar name={label} src={id ? logo : user.photoUrl} size={24} square={!!id} />
      {label}
    </button>
  );

  return (
    <>
      <PageTitle title="New post" />
      <div className="space-y-5 rounded-2xl border border-line bg-card p-5">
        <div>
          <div className="mb-2 text-sm font-semibold text-ink-2">Post as</div>
          <div className="flex flex-wrap gap-2">
            {clubs.map((c) => asOption(c.id, c.name, c.logoUrl))}
            {asOption(undefined, "Just me")}
          </div>
        </div>

        {club && (
          <div>
            <div className="mb-2 text-sm font-semibold text-ink-2">Who can see it</div>
            <Segmented value={visibility} onChange={setVisibility} options={[{ value: "public", label: "Everyone" }, { value: "club_page", label: "Club page" }, { value: "members", label: "Members" }]} />
          </div>
        )}

        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a game, an achievement or club news…"
            rows={5}
            autoFocus
            className="w-full resize-y rounded-xl border border-line bg-bg px-3.5 py-3 text-[17px] focus:outline-2 focus:outline-accent"
          />
          {tooLong && <div className="text-[13px] text-danger">Up to {LIMITS.postContent.max} characters.</div>}
        </div>

        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.preview} className="relative">
              <img src={p.preview} alt="" className="size-24 rounded-xl object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => { URL.revokeObjectURL(p.preview); setPhotos((cur) => cur.filter((_, j) => j !== i)); }} className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-sm text-white">
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex size-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line text-sm font-bold text-ink-2 hover:bg-fill">
              <span className="text-2xl text-accent">＋</span>
              {photos.length ? `${photos.length}/${MAX_PHOTOS}` : "Photos"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>

        <div>
          <input
            value={yt}
            onChange={(e) => setYt(e.target.value)}
            type="url"
            placeholder="YouTube link (optional)"
            className={cx("w-full rounded-xl border bg-bg px-3.5 py-2.5 focus:outline-2 focus:outline-accent", ytValid ? "border-line" : "border-danger")}
          />
          {!ytValid && <div className="mt-1 text-[13px] text-danger">That doesn&apos;t look like a YouTube link. Paste the link from the YouTube Share button.</div>}
        </div>

        <div className="rounded-xl bg-fill px-3.5 py-3 text-sm text-ink-2">
          {club ? `Posting for ${club.name} in ${districtName ?? "its district"}.` : `Posting to ${districtName ?? "All India"} as yourself.`}
        </div>

        <Button block loading={sending} disabled={empty || !ytValid || tooLong} onClick={share}>
          {sending ? "Sharing…" : "Share post"}
        </Button>
      </div>
    </>
  );
}
