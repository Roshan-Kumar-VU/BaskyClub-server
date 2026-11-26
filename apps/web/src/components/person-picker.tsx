"use client";

import type { Person } from "@baskyclub/shared";
import { useEffect, useState } from "react";
import { get } from "@/lib/api";
import { Avatar } from "./ui";

type Found = Person & { homeDistrictCode?: string | null };

/** Find someone on BaskyCLub by name or phone (GET /api/users?q=, logged in). */
export function PersonPicker({ label, onPick, exclude = [] }: { label: string; onPick: (p: Found) => void; exclude?: string[] }) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Found[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setPeople([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      get<{ people: Found[] }>(`/api/users?q=${encodeURIComponent(term)}`)
        .then((r) => live && setPeople(r.people))
        .catch(() => live && setPeople([]));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink-2">{label}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or mobile number" className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 focus:outline-2 focus:outline-accent" />
      </label>
      {people
        .filter((p) => !exclude.includes(p.id))
        .map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onPick(p);
              setQ("");
              setPeople([]);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-fill"
          >
            <Avatar name={p.name} src={p.photoUrl} size={32} />
            <span className="flex-1 font-semibold">{p.name}</span>
            <span className="text-[13px] text-muted">{p.homeDistrictCode?.replace(/^[A-Z]{2}-/, "") ?? ""}</span>
          </button>
        ))}
    </div>
  );
}
