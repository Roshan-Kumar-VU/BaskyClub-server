"use client";

import type { ReactNode } from "react";
import { useSession } from "@/lib/session";
import { Empty, LinkButton, Loading, PageTitle } from "./ui";

/** BaskyCLub staff pages. mod: any platform role · team: Basky team or super admin · super: super admin. */
export function AdminGuard({ need, title, children }: { need: "mod" | "team" | "super"; title: string; children: ReactNode }) {
  const { user, ready, isMod, isTeam } = useSession();
  if (!ready) return <Loading />;
  if (!user) return <Empty title="Please log in" action={<LinkButton href="/login">Log in</LinkButton>} />;
  const ok = need === "mod" ? isMod : need === "team" ? isTeam : user.platformRoles.includes("super_admin");
  if (!ok) return <Empty title={need === "mod" ? "Moderators only" : need === "team" ? "BaskyCLub team only" : "Super admins only"} />;
  return (
    <>
      <PageTitle title={title} back={title === "Admin" ? undefined : { href: "/admin", label: "Admin" }} />
      {children}
    </>
  );
}
