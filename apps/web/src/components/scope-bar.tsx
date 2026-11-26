"use client";

import { useState } from "react";
import { useScope } from "@/lib/scope";
import { DistrictSelect } from "./district-select";
import { Button, Dialog, Segmented } from "./ui";

/** All India ↔ District switch with the district picker (the app's scope toggle). */
export function ScopeBar() {
  const s = useScope();
  const [picking, setPicking] = useState(false);
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="w-64">
        <Segmented
          value={s.scope === "district" && s.districtCode ? "district" : "india"}
          onChange={(v) => (v === "district" && !s.districtCode ? setPicking(true) : s.setScope(v))}
          options={[
            { value: "india", label: "All India" },
            { value: "district", label: s.districtName ?? "District" },
          ]}
        />
      </div>
      <button type="button" onClick={() => setPicking(true)} className="text-sm font-bold text-accent-ink hover:underline">
        {s.districtCode ? "Change district" : "Pick district"}
      </button>
      <DistrictDialog open={picking} onClose={() => setPicking(false)} />
    </div>
  );
}

export function DistrictDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useScope();
  const [code, setCode] = useState<string | null>(null);
  return (
    <Dialog open={open} onClose={onClose} title="Choose your district">
      <div className="space-y-4">
        <p className="text-ink-2">See clubs, posts and the association for your district. Logged in, it also becomes your home district.</p>
        <DistrictSelect value={code ?? s.districtCode} onChange={setCode} />
        <Button
          block
          disabled={!(code ?? s.districtCode)}
          onClick={() => {
            s.chooseDistrict((code ?? s.districtCode)!);
            onClose();
          }}
        >
          Show this district
        </Button>
      </div>
    </Dialog>
  );
}

/** "See basketball near you": shown until a district is set. */
export function DistrictBanner() {
  const { districtCode } = useScope();
  const [picking, setPicking] = useState(false);
  if (districtCode) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl bg-accent-soft p-4">
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-bold">See basketball near you</div>
        <div className="text-sm text-ink-2">Clubs, posts and your district association.</div>
      </div>
      <Button small onClick={() => setPicking(true)}>
        Pick district
      </Button>
      <DistrictDialog open={picking} onClose={() => setPicking(false)} />
    </div>
  );
}
