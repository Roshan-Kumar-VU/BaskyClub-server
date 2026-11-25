"use client";

import { ProfileView } from "@/components/profile-view";
import { Button, Card, Empty, LinkButton, Loaded, Loading, Row } from "@/components/ui";
import { useScope } from "@/lib/scope";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/store";
import type { Profile } from "@/lib/types";

/** Your profile and settings. Visitors see log in / sign up. */
export default function MyProfilePage() {
  const { user, ready, logout, isMod, isTeam } = useSession();
  const { places } = useScope();
  const q = useApi<Profile>(user ? `/api/users/${user.id}` : null);

  if (!ready) return <Loading />;
  if (!user) {
    return (
      <Empty
        title="Your basketball profile"
        body="Log in to post, join clubs and follow players, clubs and associations."
        action={
          <div className="flex justify-center gap-2">
            <LinkButton href="/login?next=/profile">Log in</LinkButton>
            <LinkButton href="/signup" kind="secondary">
              Create account
            </LinkButton>
          </div>
        }
      />
    );
  }

  const badge = { none: undefined, requested: "Requested", active: "Active", declined: "Not this time" }[user.creatorBadge.status];
  const district = places?.districts.find((d) => d.code === user.homeDistrictCode)?.name ?? "Not set";

  return (
    <div className="space-y-6">
      {user.awaitingParent && (
        <div className="rounded-xl bg-official-soft px-4 py-3 text-sm text-official">Your parent or guardian needs to confirm your account. Until then you can look around but not post, comment or join clubs.</div>
      )}
      <Loaded q={q}>{(p) => <ProfileView p={p} actions={<LinkButton small kind="secondary" href="/settings/profile">Edit profile</LinkButton>} />}</Loaded>
      <Card title="Settings">
        <Row label="Home district" sub={district} href="/settings/profile" />
        <Row label="Edit profile" href="/settings/profile" />
        <Row label="Change password" href="/settings/password" />
        {!user.isMinor && <Row label="Register a club" href="/clubs/new" />}
        {!user.isMinor && <Row label="Creator badge" href="/settings/creator" right={badge ? <span className="text-sm text-muted">{badge}</span> : undefined} />}
        {user.orgMemberships.map((m) => (
          <Row key={m.organizationId} label={m.organization.name} sub={`Association ${m.accessLevel}`} href={`/associations/${m.organizationId}/manage`} />
        ))}
        {isMod && <Row label="Review queue" href="/admin/moderation" />}
        {isTeam && <Row label="Admin" href="/admin" />}
      </Card>
      <Button block kind="danger" onClick={() => logout()}>
        Log out
      </Button>
    </div>
  );
}
