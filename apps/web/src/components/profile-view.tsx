"use client";

import type { PostCard as Post } from "@baskyclub/shared";
import Link from "next/link";
import type { ReactNode } from "react";
import { positionName } from "@/lib/format";
import { usePaged } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { ClubBadge } from "./club-row";
import { CreatorBadge, PostCard } from "./post-card";
import { Avatar, Button, Card, Empty } from "./ui";

/**
 * Phase 1 profile (#72): cover, photo, name, bio, Instagram/YouTube (the API hides them for
 * under-18s), one pinned post, clubs with position, posts. Email, phone and birthday never show.
 */
export function ProfileView({ p, actions }: { p: Profile; actions?: ReactNode }) {
  const posts = usePaged<Post, { posts: Post[]; nextCursor: string | null }>(`/api/users/${p.id}/posts?limit=20`, (r) => ({ items: r.posts, nextCursor: r.nextCursor ?? null }));
  const others = posts.items.filter((x) => x.id !== p.pinnedPost?.id);
  const links = [
    p.instagram && { label: `@${p.instagram}`, url: `https://instagram.com/${encodeURIComponent(p.instagram)}` },
    p.youtube && { label: p.youtube, url: `https://youtube.com/@${encodeURIComponent(p.youtube.replace(/^@/, ""))}` },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="h-36 bg-gradient-to-br from-accent to-accent-ink sm:h-44">{p.coverPhotoUrl && <img src={p.coverPhotoUrl} alt="" className="size-full object-cover" />}</div>
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <div className="rounded-full bg-card p-1">
              <Avatar name={p.name} src={p.photoUrl} size={84} />
            </div>
            {actions}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight">{p.name}</h1>
            {p.isCreator && <CreatorBadge />}
          </div>
          {p.bio && <p className="mt-1 whitespace-pre-wrap text-ink-2">{p.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {p.homeDistrict?.name && <span className="text-muted">📍 {p.homeDistrict.name}</span>}
            {links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-accent-ink hover:underline">
                {l.label}
              </a>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-sm text-muted">
            <span>
              <b className="text-ink">{p.followerCount}</b> followers
            </span>
            <span>
              <b className="text-ink">{p.followingCount}</b> following
            </span>
          </div>
        </div>
      </div>

      {p.clubs.length > 0 && (
        <Card title="Clubs">
          {p.clubs.map((c) => (
            <Link key={c.id} href={`/clubs/${c.id}`} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-fill/40">
              <Avatar name={c.name} src={c.logoUrl} size={40} square />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{c.name}</div>
                <div className="text-[13px] text-muted">{c.isPlayer ? (c.position ? positionName[c.position] : "Player") : "Member"}</div>
              </div>
              <ClubBadge kind={c.kind} affiliated={!!c.affiliatedTo} verified={!!c.isVerified} />
            </Link>
          ))}
        </Card>
      )}

      {p.pinnedPost && (
        <div>
          <h2 className="mb-2 font-display text-lg font-bold">📌 Pinned</h2>
          <PostCard post={p.pinnedPost} />
        </div>
      )}

      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Posts</h2>
        {posts.loading ? null : others.length ? (
          <div className="space-y-4">
            {others.map((x) => (
              <PostCard key={x.id} post={x} />
            ))}
            {posts.hasMore && (
              <Button block kind="secondary" loading={posts.loadingMore} onClick={posts.loadMore}>
                Load more posts
              </Button>
            )}
          </div>
        ) : (
          <Empty title="No other posts yet" />
        )}
      </div>
    </div>
  );
}
