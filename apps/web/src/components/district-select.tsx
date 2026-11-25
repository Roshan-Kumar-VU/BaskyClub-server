"use client";

import { useState } from "react";
import { useScope } from "@/lib/scope";
import { Select } from "./ui";

/** State, then district (the app's district picker). Calls onChange with a district code. */
export function DistrictSelect({ value, onChange, label = "District", only }: { value: string | null | undefined; onChange: (code: string) => void; label?: string; only?: string[] }) {
  const { places: all } = useScope();
  // only: limit the choice to these districts (e.g. the ones an association covers)
  const places = all && only ? { states: all.states.filter((s) => all.districts.some((d) => d.stateCode === s.code && only.includes(d.code))), districts: all.districts.filter((d) => only.includes(d.code)) } : all;
  const current = places?.districts.find((d) => d.code === value);
  const [state, setState] = useState<string>(current?.stateCode ?? "");
  const stateCode = state || current?.stateCode || "";
  const districts = places?.districts.filter((d) => d.stateCode === stateCode) ?? [];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select label="State" value={stateCode} onChange={(e) => setState(e.target.value)} disabled={!places}>
        <option value="">{places ? "Choose a state" : "Loading…"}</option>
        {places?.states.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select label={label} value={districts.some((d) => d.code === value) ? (value ?? "") : ""} onChange={(e) => e.target.value && onChange(e.target.value)} disabled={!stateCode}>
        <option value="">Choose a district</option>
        {districts.map((d) => (
          <option key={d.code} value={d.code}>
            {d.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
