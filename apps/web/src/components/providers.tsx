"use client";

import { ScopeProvider } from "@/lib/scope";
import { SessionProvider } from "@/lib/session";
import { SiteNav } from "./site-nav";
import { Toaster } from "./ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ScopeProvider>
        <SiteNav />
        <main className="mx-auto max-w-2xl px-4 pt-6 pb-28 md:pb-16">{children}</main>
        <Toaster />
      </ScopeProvider>
    </SessionProvider>
  );
}
