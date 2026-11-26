"use client";

import type { ClubCard } from "@baskyclub/shared";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { PersonPicker } from "@/components/person-picker";
import { Button, Card, confirmAction, Field, Loaded, Row, toast } from "@/components/ui";
import { del, errorMessage, post, qs } from "@/lib/api";
import { invalidate, useApi } from "@/lib/store";

type Badge = { id: string; badge: "creator" | "basky_verified"; club?: { name: string } | null; user?: { name: string } | null };

/** Verified clubs/academies and Creators (#35). */
export default function AdminBadgesPage() {
  return (
    <AdminGuard need="team" title="Badges">
      <Badges />
    </AdminGuard>
  );
}

function Badges() {
  const badges = useApi<{ badges: Badge[] }>("/api/admin/badges");
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const clubs = useApi<{ clubs: ClubCard[] }>(term.length >= 2 ? `/api/clubs${qs({ q: term, limit: 20 })}` : null).data?.clubs.filter((c) => c.kind === "club" || c.kind === "academy") ?? [];

  const run = async (p: Promise<unknown>, ok?: string) => {
    try {
      await p;
      if (ok) toast(ok);
    } catch (e) {
      toast("Couldn't save", errorMessage(e));
    } finally {
      invalidate("/api/admin/badges", "/api/clubs", "/api/users/", "/api/feed");
    }
  };

  return (
    <div className="space-y-4">
      <Loaded q={badges}>
        {({ badges: list }) => (
          <Card title={`Active badges (${list.length})`}>
            {list.map((b) => (
              <Row
                key={b.id}
                label={b.club?.name ?? b.user?.name ?? "—"}
                sub={b.badge === "creator" ? "Creator" : "Verified by BaskyCLub"}
                right={<Button small kind="secondary" onClick={() => confirmAction("Remove this badge?") && run(del(`/api/admin/badges/${b.id}`), "Badge removed")}>Remove</Button>}
              />
            ))}
            {!list.length && <div className="px-4 py-3 text-muted">No badges yet.</div>}
          </Card>
        )}
      </Loaded>
      <Card title="Verify a club or academy">
        <div className="space-y-2 p-4">
          <Field label="Search clubs" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type 2+ letters" />
        </div>
        {clubs.map((c) => (
          <Row
            key={c.id}
            label={c.name}
            sub={`${c.districtName ?? ""}${c.isVerified ? " · already verified" : ""}`}
            right={c.isVerified ? undefined : <Button small onClick={() => run(post("/api/admin/badges", { badge: "basky_verified", clubId: c.id }), `${c.name} is verified`)}>Verify</Button>}
          />
        ))}
      </Card>
      <Card title="Make someone a Creator">
        <div className="p-4">
          <PersonPicker label="Person" onPick={(p) => run(post("/api/admin/badges", { badge: "creator", userId: p.id }), `${p.name} is now a Creator`)} />
        </div>
      </Card>
    </div>
  );
}
