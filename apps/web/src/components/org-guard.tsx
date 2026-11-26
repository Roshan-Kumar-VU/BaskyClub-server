"use client";

import type { ReactNode } from "react";
import { useApi } from "@/lib/store";
import type { OrgPage } from "@/lib/types";
import { Empty, Loaded } from "./ui";

/** Loads an association and shows the page only to people with these powers. */
export function OrgGuard({ id, need, children }: { id: string; need: "manage" | "post"; children: (org: OrgPage) => ReactNode }) {
  const q = useApi<OrgPage>(`/api/associations/${id}`);
  return (
    <Loaded q={q} notFound={<Empty title="Association not found" />}>
      {(org) =>
        (need === "manage" ? org.viewer.canManage : org.viewer.canManage || org.viewer.canPostOfficially) ? (
          children(org)
        ) : (
          <Empty title="Owners and admins only" body="Association members are listed on the page but can't change it." />
        )
      }
    </Loaded>
  );
}
