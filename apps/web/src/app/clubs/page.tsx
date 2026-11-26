"use client";

import type { ClubCard } from "@baskyclub/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ClubRow } from "@/components/club-row";
import { ClubsMap } from "@/components/clubs-map";
import { ScopeBar } from "@/components/scope-bar";
import { Avatar, Card, Chips, Empty, LinkButton, Loaded, PageTitle, Segmented } from "@/components/ui";
import { qs } from "@/lib/api";
import { scopedDistrict, useScope } from "@/lib/scope";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/store";
import type { Profile } from "@/lib/types";

type Filter = "all" | "affiliated" | "community" | "academy";
const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "affiliated", label: "Affiliated clubs" },
  { value: "community", label: "Community clubs" },
  { value: "academy", label: "Academies" },
];

/** Clubs (PRD §3, §5): a List / Map switch; the list has search and filters. */
export default function ClubsPage() {
  const s = useScope();
  const { user } = useSession();
  const [view, setView] = useState<"list" | "map">("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  // Search after typing stops, not on every key
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const district = scopedDistrict(s);
  const list = useApi<{ clubs: ClubCard[] }>(`/api/clubs${qs({ limit: 50, districtCode: district, q, kind: filter === "academy" ? "academy" : undefined })}`);
  const mine = useApi<Profile>(user ? `/api/users/${user.id}` : null).data?.clubs ?? [];

  return (
    <>
      <PageTitle title="Clubs" action={user && !user.isMinor ? <LinkButton small href="/clubs/new">Register a club</LinkButton> : undefined} />
      <ScopeBar />
      <div className="mb-4">
        <Segmented value={view} onChange={setView} options={[{ value: "list", label: "List" }, { value: "map", label: "Map" }]} />
      </div>
      {view === "map" ? (
        <ClubsMap />
      ) : (
        <div className="space-y-4">
          {mine.length > 0 && (
            <div>
              <h2 className="mb-2 font-display text-lg font-bold">My clubs</h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {mine.map((c) => (
                  <Link key={c.id} href={`/clubs/${c.id}`} className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl bg-card p-3 text-center hover:bg-fill">
                    <Avatar name={c.name} src={c.logoUrl} size={52} square />
                    <span className="line-clamp-2 text-sm font-bold">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <input value={text} onChange={(e) => setText(e.target.value)} type="search" placeholder="Search clubs and academies" className="h-11 w-full rounded-xl bg-fill px-4 focus:outline-2 focus:outline-accent" />
          <Chips options={filters} value={filter} onChange={setFilter} />
          <Loaded q={list}>
            {({ clubs }) => {
              const shown = clubs.filter((c) => (filter === "affiliated" ? c.kind === "club" && !!c.affiliatedTo : filter === "community" ? c.kind === "club" && !c.affiliatedTo : true));
              return (
                <>
                  <div className="text-[13px] text-muted">
                    {shown.length} {shown.length === 1 ? "result" : "results"} in {district ? s.districtName : "India"}
                  </div>
                  {shown.length ? (
                    <Card>
                      {shown.map((c) => (
                        <ClubRow key={c.id} club={c} />
                      ))}
                    </Card>
                  ) : (
                    <Empty title="No clubs found" body={q ? `Nothing matches “${q}”.` : "Try All India, or another filter."} />
                  )}
                </>
              );
            }}
          </Loaded>
        </div>
      )}
    </>
  );
}
