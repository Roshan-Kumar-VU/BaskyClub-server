"use client";

import type { AlertPage } from "@baskyclub/shared";
import Link from "next/link";
import { ALERTS } from "@/components/site-nav";
import { Avatar, cx, Empty, Loaded, PageTitle } from "@/components/ui";
import { ago } from "@/lib/format";
import { audienceLabel } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/store";

/** Alerts inbox: announcements to you and replies in threads you started (PRD §6). */
export default function AlertsPage() {
  const { user, ready } = useSession();
  const q = useApi<AlertPage>(user ? ALERTS : null);
  if (ready && !user) return <Empty title="Please log in" body="Log in to see your alerts." action={<Link href="/login?next=/alerts" className="font-bold text-accent-ink">Log in</Link>} />;
  return (
    <>
      <PageTitle title="Alerts" />
      <Loaded q={q}>
        {({ alerts }) =>
          !alerts.length ? (
            <Empty title="No alerts yet" body="Announcements from your clubs and district association, and replies to your comments, show up here." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              {alerts.map((a) => {
                const sender = a.from.type === "basky" ? "BaskyCLub team" : a.from.name;
                const photo = a.from.type === "user" ? a.from.photoUrl : a.from.type === "basky" ? null : a.from.logoUrl;
                const body = (
                  <div className="flex gap-3 px-4 py-4">
                    <Avatar name={sender} src={photo} size={44} square={a.from.type !== "user"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cx("flex-1 truncate font-bold", a.from.type === "organization" ? "text-official" : "text-ink-2")}>{sender}</span>
                        <span className="text-muted">{ago(a.sentAt)}</span>
                      </div>
                      <div className="font-bold">{a.title}</div>
                      <p className="whitespace-pre-wrap text-ink-2">{a.body}</p>
                      {a.audience && <div className="mt-1 text-xs text-muted">Sent to: {audienceLabel[a.audience]}</div>}
                    </div>
                  </div>
                );
                return a.postId ? (
                  <Link key={a.id} href={`/p/${a.postId}`} className="block border-t border-line first:border-t-0 hover:bg-fill/40">
                    {body}
                  </Link>
                ) : (
                  <div key={a.id} className="border-t border-line first:border-t-0">
                    {body}
                  </div>
                );
              })}
            </div>
          )
        }
      </Loaded>
    </>
  );
}
