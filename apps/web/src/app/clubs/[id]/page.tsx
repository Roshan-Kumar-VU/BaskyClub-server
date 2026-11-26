"use client";

import { practiceHours, type ClubMember, type PostCard as Post } from "@baskyclub/shared";
import Link from "next/link";
import { use, useState } from "react";
import { ClubBadge } from "@/components/club-row";
import { FollowButton } from "@/components/follow-button";
import { PostCard } from "@/components/post-card";
import { Avatar, Button, Card, confirmAction, Empty, LinkButton, Loaded, Segmented, Tag, toast } from "@/components/ui";
import { del, errorMessage, post } from "@/lib/api";
import { positionName } from "@/lib/format";
import { ME, useSession } from "@/lib/session";
import { invalidate, useApi, usePaged } from "@/lib/store";
import type { ClubPage as Club } from "@/lib/types";

/** A club's page: about, join / follow, posts and people (the app's club screen). */
export default function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useApi<Club>(`/api/clubs/${id}`);
  return (
    <Loaded q={q} notFound={<Empty title="Club not found" />}>
      {(club) => <ClubView club={club} />}
    </Loaded>
  );
}

function ClubView({ club }: { club: Club }) {
  const id = club.id;
  const { user, requireLogin } = useSession();
  const [section, setSection] = useState<"posts" | "people">("posts");
  const [busy, setBusy] = useState(false);
  const membership = club.viewer.membership;
  const manager = club.viewer.canManage;
  const requests = useApi<{ requests: unknown[] }>(manager ? `/api/clubs/${id}/requests` : null).data?.requests.length ?? 0;
  const posts = usePaged<Post, { posts: Post[]; nextCursor: string | null }>(`/api/clubs/${id}/posts?limit=20`, (r) => ({ items: r.posts, nextCursor: r.nextCursor ?? null }));
  const hours = practiceHours(club.timings ?? []);

  const refresh = () => invalidate(`/api/clubs/${id}`, "/api/clubs?", ME, ...(user ? [`/api/users/${user.id}`] : []));
  const act = async (fn: () => Promise<unknown>, failed: string, done?: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) toast(done);
    } catch (e) {
      toast(failed, errorMessage(e));
    } finally {
      refresh();
      setBusy(false);
    }
  };

  const join = () => requireLogin(() => act(() => post(`/api/clubs/${id}/join`, { isPlayer: true }), "Couldn't send the request", "Request sent"));
  const cancel = () => act(() => del(`/api/clubs/${id}/join`), "Couldn't cancel");
  const leave = () => confirmAction(`Leave ${club.name}? You can ask to join again later.`) && act(() => post(`/api/clubs/${id}/leave`), "Couldn't leave", "You left the club");

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="h-40 bg-gradient-to-br from-official to-accent sm:h-48">{club.bannerUrl && <img src={club.bannerUrl} alt="" className="size-full object-cover" />}</div>
        <div className="space-y-3 px-5 pb-5">
          <div className="-mt-10 w-fit rounded-3xl bg-card p-1">
            <Avatar name={club.name} src={club.logoUrl} size={80} square />
          </div>
          <div>
            <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight">{club.name}</h1>
            {club.motto && <div className="font-bold text-accent-ink">{club.motto}</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <ClubBadge kind={club.kind} affiliated={!!club.affiliatedTo} verified={club.isVerified} />
            {club.districtName && <Tag label={club.districtName} />}
            {club.status !== "approved" && <Tag tone="danger" label={club.status === "pending" ? "Waiting for BaskyCLub review" : "Suspended"} />}
          </div>
          {club.description && <p className="whitespace-pre-wrap text-ink-2">{club.description}</p>}
          {club.affiliatedTo && (
            <Link href={`/associations/${club.affiliatedTo.id}`} className="flex items-center gap-3 rounded-xl bg-scoreboard px-4 py-3 text-white">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{club.affiliatedTo.name}</div>
                {club.affiliatedTo.validUntil && (
                  <div className="text-xs opacity-75">
                    {[club.affiliatedTo.tnbaNumber, `valid until ${new Date(club.affiliatedTo.validUntil).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
              <span>›</span>
            </Link>
          )}
          {hours.length > 0 && (
            <div className="rounded-xl bg-fill px-4 py-3 text-sm">
              <div className="mb-1 font-bold">Practice hours</div>
              {hours.map((h) => (
                <div key={h}>{h}</div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line text-center">
            {[
              { v: club.memberCount, l: "Members" },
              { v: club.followerCount, l: "Followers" },
              { v: posts.items.length + (posts.hasMore ? "+" : ""), l: "Posts" },
            ].map((x) => (
              <div key={x.l} className="py-2">
                <div className="font-display text-xl font-bold tabular-nums">{x.v}</div>
                <div className="text-xs text-muted">{x.l}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {membership?.status === "active" ? (
              <Button kind="secondary" disabled>
                ✓ Member
              </Button>
            ) : membership?.status === "pending" ? (
              <Button kind="secondary" loading={busy} onClick={cancel}>
                Requested · Cancel
              </Button>
            ) : (
              <Button loading={busy} onClick={join}>
                Join
              </Button>
            )}
            <FollowButton type="club" id={id} following={club.viewer.isFollowing} large />
            {manager && (
              <>
                <LinkButton kind="secondary" href={`/clubs/${id}/manage`}>
                  Manage club
                </LinkButton>
                <LinkButton kind="ghost" href={`/clubs/${id}/requests`}>
                  {requests ? `Join requests (${requests})` : "Join requests"}
                </LinkButton>
              </>
            )}
            {membership?.status === "active" && (
              <Button kind="ghost" onClick={leave}>
                Leave club
              </Button>
            )}
          </div>
          {membership?.status === "pending" && <p className="text-[13px] text-muted">Waiting for the club owner or an admin to accept.</p>}
        </div>
      </div>

      <Segmented value={section} onChange={setSection} options={[{ value: "posts", label: "Posts" }, { value: "people", label: "People" }]} />

      {section === "posts" &&
        (posts.loading ? null : posts.items.length ? (
          <div className="space-y-4">
            {posts.items.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {posts.hasMore && (
              <Button block kind="secondary" loading={posts.loadingMore} onClick={posts.loadMore}>
                Load more posts
              </Button>
            )}
          </div>
        ) : (
          <Empty title="No posts yet" body={`Posts by ${club.name} members show up here.`} />
        ))}
      {section === "people" && <People club={club} />}
    </div>
  );
}

function People({ club }: { club: Club }) {
  const members = useApi<{ members: ClubMember[] }>(`/api/clubs/${club.id}/members?limit=50`);
  const person = (key: string, name: string, role: string, userId?: string | null, photo?: string | null) => {
    const body = (
      <>
        <Avatar name={name} src={photo} size={40} />
        <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
        <Tag label={role} />
      </>
    );
    const cls = "flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0";
    return userId ? (
      <Link key={key} href={`/u/${userId}`} className={`${cls} hover:bg-fill/40`}>
        {body}
      </Link>
    ) : (
      <div key={key} className={cls}>
        {body}
      </div>
    );
  };
  const roleName = { owner: "Owner", admin: "Admin", captain: "Captain" } as const;

  return (
    <div className="space-y-4">
      <Card title="Runs the club">
        {club.staff.map((s) => person(s.roleId, s.name, roleName[s.role], s.id, s.photoUrl))}
        {club.coaches.map((c) => person(c.id, c.name, c.role === "head" ? "Head coach" : "Assistant coach", c.userId))}
      </Card>
      <Loaded q={members}>
        {({ members: list }) => {
          const players = list.filter((m) => m.isPlayer);
          const others = list.filter((m) => !m.isPlayer);
          return (
            <>
              {players.length > 0 && <Card title={`Plays for the club (${players.length})`}>{players.map((m) => person(m.id, m.user.name, m.primaryPosition ? positionName[m.primaryPosition] : "Player", m.user.id, m.user.photoUrl))}</Card>}
              {others.length > 0 && <Card title="Other members">{others.map((m) => person(m.id, m.user.name, "Member", m.user.id, m.user.photoUrl))}</Card>}
              {!list.length && <Empty title="No members yet" />}
            </>
          );
        }}
      </Loaded>
    </div>
  );
}
