"use client";

import type { AlertPage } from "@baskyclub/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/store";
import { Avatar, cx } from "./ui";

export const ALERTS = "/api/alerts?limit=50";

export function Wordmark() {
  return (
    <Link href="/" className="font-display text-xl font-bold tracking-tight text-ink">
      Basky<span className="text-accent">CLub</span>
    </Link>
  );
}

/** Header (all screens) and a bottom tab bar on phones, like the app's tabs. */
export function SiteNav() {
  const path = usePathname();
  const { user, ready } = useSession();
  const alerts = useApi<AlertPage>(user ? ALERTS : null).data;
  const alertCount = alerts?.alerts.length ?? 0;
  const tabs = [
    { href: "/", label: "Home", active: path === "/" },
    { href: "/clubs", label: "Clubs", active: path.startsWith("/clubs") },
    { href: user ? "/profile" : "/login", label: user ? "Profile" : "Log in", active: path.startsWith("/profile") || path.startsWith("/settings") },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Wordmark />
          <nav className="hidden gap-1 md:flex">
            {tabs.slice(0, 2).map((t) => (
              <Link key={t.href} href={t.href} className={cx("rounded-lg px-3 py-1.5 font-bold", t.active ? "bg-fill text-ink" : "text-ink-2 hover:text-ink")}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {ready && user && (
              <>
                <Link href="/post/new" className="hidden h-9 items-center rounded-xl bg-accent px-3.5 text-sm font-bold text-white sm:inline-flex">
                  + Post
                </Link>
                <Link href="/alerts" aria-label={`Alerts${alertCount ? ` (${alertCount})` : ""}`} className="relative rounded-lg p-2 hover:bg-fill">
                  <BellIcon />
                  {alertCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold text-white">
                      {alertCount > 99 ? "99+" : alertCount}
                    </span>
                  )}
                </Link>
                <Link href="/profile" aria-label="Your profile" className="hidden md:block">
                  <Avatar name={user.name} src={user.photoUrl} size={32} />
                </Link>
              </>
            )}
            {ready && !user && (
              <>
                <Link href="/login" className="rounded-lg px-3 py-1.5 font-bold text-ink-2 hover:text-ink">
                  Log in
                </Link>
                <Link href="/signup" className="h-9 items-center rounded-xl bg-accent px-3.5 text-sm leading-9 font-bold text-white">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card md:hidden">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={cx("flex-1 py-3 text-center text-sm font-bold", t.active ? "text-accent" : "text-ink-2")}>
            {t.label}
          </Link>
        ))}
        {user && (
          <Link href="/post/new" className="flex-1 py-3 text-center text-sm font-bold text-ink-2">
            + Post
          </Link>
        )}
      </nav>
    </>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
