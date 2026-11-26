"use client";

import { useState } from "react";
import { del, errorMessage, post } from "@/lib/api";
import { useSession } from "@/lib/session";
import { invalidate } from "@/lib/store";
import { Button, toast } from "./ui";

/** Follow a person, club or association (#73). */
export function FollowButton({ type, id, following, large }: { type: "user" | "club" | "organization"; id: string; following: boolean; large?: boolean }) {
  const { requireLogin } = useSession();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const isOn = on ?? following;

  const toggle = () =>
    requireLogin(async () => {
      setBusy(true);
      try {
        if (isOn) await del(`/api/follows?targetType=${type}&targetId=${id}`);
        else await post("/api/follows", { targetType: type, targetId: id });
        setOn(!isOn);
        invalidate(type === "user" ? `/api/users/${id}` : type === "club" ? `/api/clubs/${id}` : `/api/associations/${id}`, "/api/feed");
      } catch (e) {
        toast("Couldn't update", errorMessage(e));
      } finally {
        setBusy(false);
      }
    });

  return (
    <Button small={!large} kind={isOn ? "secondary" : "primary"} loading={busy} onClick={toggle}>
      {isOn ? "Following" : "Follow"}
    </Button>
  );
}
