"use client";

import { useState } from "react";
import { Button, Card, confirmAction, Loading, PageTitle, Row, toast } from "@/components/ui";
import { del, errorMessage, post } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useSession } from "@/lib/session";

/** Ask the BaskyCLub team for the Creator badge, and see where the request stands. */
export default function CreatorBadgePage() {
  const { user, ready, refreshMe } = useSession();
  const [busy, setBusy] = useState(false);
  if (!ready) return <Loading />;
  if (!user) return null;
  const b = user.creatorBadge;
  const missing = [!user.bio && "a bio", !user.instagram && !user.youtube && "your Instagram or YouTube"].filter(Boolean) as string[];

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      await refreshMe();
      toast(done);
    } catch (e) {
      toast("Couldn't do that", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Creator badge" back={{ href: "/profile", label: "Profile" }} />
      <div className="space-y-4">
        <Card title="What Creators get">
          <div className="space-y-2 p-4">
            <p>• A Creator tag on your profile and posts</p>
            <p className="text-[13px] text-muted">For people who share basketball content regularly: drills, highlights, coaching tips. The BaskyCLub team looks at your profile and posts before deciding.</p>
          </div>
        </Card>
        {user.isMinor ? (
          <p className="text-muted">The Creator badge is for people aged 18 or over.</p>
        ) : b.status === "active" ? (
          <Card title="Status">
            <Row label="You're a BaskyCLub Creator" sub={`Since ${formatDate(b.since)}`} />
          </Card>
        ) : b.status === "requested" ? (
          <>
            <Card title="Status">
              <Row label="Waiting for the BaskyCLub team" sub={`Asked on ${formatDate(b.since)}. You'll get an alert when they decide.`} />
            </Card>
            <Button block kind="secondary" loading={busy} onClick={() => confirmAction("Withdraw your request? You can ask again any time.") && run(() => del("/api/badges/creator"), "Request withdrawn")}>
              Withdraw request
            </Button>
          </>
        ) : b.status === "declined" ? (
          <Card title="Status">
            <Row label="Not this time" sub={`You can ask again from ${formatDate(b.canAskFrom)}.`} />
            {b.note && <p className="px-4 pb-4">From the team: {b.note}</p>}
          </Card>
        ) : (
          <>
            {missing.length > 0 && (
              <Card title="Before you ask">
                <Row label={`Add ${missing.join(" and ")}`} sub="It helps the team see what you make." href="/settings/profile" />
              </Card>
            )}
            <Button block loading={busy} disabled={user.awaitingParent} onClick={() => run(() => post("/api/badges/creator", {}), "Request sent to the BaskyCLub team")}>
              Request Creator badge
            </Button>
          </>
        )}
      </div>
    </>
  );
}
