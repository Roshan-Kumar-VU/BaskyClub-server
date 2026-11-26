"use client";

import { fits, LIMITS, practiceHours } from "@baskyclub/shared";
import Link from "next/link";
import { useState } from "react";
import { errorMessage, post, qs } from "@/lib/api";
import { useScope } from "@/lib/scope";
import { useSession } from "@/lib/session";
import { invalidate, useApi } from "@/lib/store";
import type { MapPin } from "@/lib/types";
import { Button, Card, Field, Loaded, Tag, toast, Toggle } from "./ui";

const osmEmbed = (p: { latitude: number; longitude: number }) => {
  const d = 0.02;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${p.longitude - d}%2C${p.latitude - d}%2C${p.longitude + d}%2C${p.latitude + d}&layer=mapnik&marker=${p.latitude}%2C${p.longitude}`;
};
const directions = (p: { latitude: number; longitude: number }) => `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`;

/**
 * Clubs tab Map view (PRD §3, §5): approved clubs and courts in your district (All India: the
 * Vellore area for now), clubs with their practice hours, and a way to suggest a missing court.
 * The map shows the chosen spot on OpenStreetMap; no map library is loaded.
 */
export function ClubsMap() {
  const s = useScope();
  const { user, requireLogin } = useSession();
  const district = s.districtCode ?? "TN-VELLORE";
  const q = useApi<{ clubs: MapPin[]; courts: MapPin[] }>(`/api/map${qs({ districtCode: district })}`);
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [adding, setAdding] = useState(false);
  const [court, setCourt] = useState({ name: "", address: "", lat: "", lng: "", indoor: false });
  const lat = Number(court.lat);
  const lng = Number(court.lng);
  const coordsOk = court.lat.trim() !== "" && court.lng.trim() !== "" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !Number.isNaN(lat) && !Number.isNaN(lng);

  const submit = async () => {
    try {
      await post("/api/courts", { name: court.name.trim(), districtCode: district, latitude: lat, longitude: lng, address: court.address.trim() || undefined, indoor: court.indoor });
      invalidate("/api/map", "/api/admin/courts");
      toast("Thanks!", "The BaskyCLub team will check the court before it shows on the map.");
      setAdding(false);
      setCourt({ name: "", address: "", lat: "", lng: "", indoor: false });
    } catch (e) {
      toast("Couldn't add the court", errorMessage(e));
    }
  };

  return (
    <Loaded q={q}>
      {(data) => {
        const center = selected ?? data.clubs[0] ?? data.courts[0] ?? { latitude: 12.9165, longitude: 79.1325 };
        return (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-line">
              <iframe title="Map" src={osmEmbed(center)} className="h-72 w-full border-0 sm:h-96" loading="lazy" referrerPolicy="no-referrer" />
            </div>
            {selected && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold">{selected.name}</span>
                <a href={directions(selected)} target="_blank" rel="noopener noreferrer" className="font-bold text-accent-ink hover:underline">
                  Directions ↗
                </a>
              </div>
            )}
            <Card title={`Clubs (${data.clubs.length})`}>
              {data.clubs.map((x) => (
                <div key={x.id} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
                  <Link href={`/clubs/${x.id}`} className="min-w-0 flex-1 hover:underline">
                    <div className="font-semibold">{x.name}</div>
                    <div className="text-[13px] text-muted">{[x.kind, ...practiceHours(x.timings ?? [])].filter(Boolean).join(" · ")}</div>
                  </Link>
                  <Button small kind="ghost" onClick={() => setSelected(x)}>
                    Show
                  </Button>
                </div>
              ))}
              {!data.clubs.length && <div className="px-4 py-3 text-muted">No clubs on the map here yet.</div>}
            </Card>
            <Card title={`Courts (${data.courts.length})`}>
              {data.courts.map((x) => (
                <div key={x.id} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{x.name}</div>
                    {x.address && <div className="text-[13px] text-muted">{x.address}</div>}
                  </div>
                  <Tag label={x.indoor ? "Indoor" : "Outdoor"} />
                  <Button small kind="ghost" onClick={() => setSelected(x)}>
                    Show
                  </Button>
                </div>
              ))}
              {!data.courts.length && <div className="px-4 py-3 text-muted">No courts on the map here yet.</div>}
            </Card>
            {!adding ? (
              <Button block kind="secondary" onClick={() => requireLogin(() => setAdding(true))}>
                Suggest a court
              </Button>
            ) : (
              <Card title="Suggest a court">
                <div className="space-y-3 p-4">
                  <Field label="Court name" value={court.name} onChange={(e) => setCourt((x) => ({ ...x, name: e.target.value }))} maxLength={LIMITS.courtName.max} />
                  <Field label="Address" value={court.address} onChange={(e) => setCourt((x) => ({ ...x, address: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Latitude" inputMode="decimal" value={court.lat} onChange={(e) => setCourt((x) => ({ ...x, lat: e.target.value }))} placeholder="12.9165" />
                    <Field label="Longitude" inputMode="decimal" value={court.lng} onChange={(e) => setCourt((x) => ({ ...x, lng: e.target.value }))} placeholder="79.1325" />
                  </div>
                  <Toggle label="Indoor court" checked={court.indoor} onChange={(v) => setCourt((x) => ({ ...x, indoor: v }))} />
                  <p className="text-[13px] text-muted">Tip: right-click the spot in Google Maps to copy its latitude and longitude.</p>
                  <div className="flex gap-2">
                    <Button kind="secondary" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1" disabled={!user || !fits(court.name, LIMITS.courtName) || !coordsOk} onClick={submit}>
                      Send for review
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );
      }}
    </Loaded>
  );
}
