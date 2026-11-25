"use client";

import { useState } from "react";
import { errorMessage, uploadPhoto } from "@/lib/api";
import { toast } from "./ui";

const MAX_BYTES = 10 * 1024 * 1024; // apps/api uploads.service

/** A button that uploads one photo and hands back its link. */
export function PhotoUpload({ label, onUploaded }: { label: string; onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) return toast("That photo is too big", "Photos can be up to 10 MB.");
    setBusy(true);
    try {
      onUploaded(await uploadPhoto(file));
    } catch (e) {
      toast("Couldn't upload the photo", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-fill px-3 text-sm font-bold hover:bg-line has-[:disabled]:opacity-50">
      {busy ? "Uploading…" : label}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );
}
