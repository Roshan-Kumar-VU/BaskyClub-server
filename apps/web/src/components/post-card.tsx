"use client";

import { youtubeThumbnail, type PostCard as Post } from "@baskyclub/shared";
import Link from "next/link";
import { useState } from "react";
import { del, errorMessage, post as send } from "@/lib/api";
import { compact, timeAgo } from "@/lib/format";
import { useSession } from "@/lib/session";
import { Avatar, cx, Tag, toast } from "./ui";

const visibilityLabel = { members: "Members only", club_page: "Club page only", public: undefined } as const;

export function CreatorBadge() {
  return <Tag tone="accent" label="✦ Creator" />;
}

/**
 * A post in a list or on its own page (the app's PostCard). Posts linked from an association
 * announcement get the blue Official band (#75). One like per person.
 */
export function PostCard({ post, linkToPost = true }: { post: Post; linkToPost?: boolean }) {
  const { requireLogin } = useSession();
  const [like, setLike] = useState<{ liked: boolean; count: number } | null>(null);
  const liked = like?.liked ?? post.likedByMe;
  const likeCount = like?.count ?? post.likeCount;

  const byOrg = !!post.organization;
  const name = byOrg ? post.organization!.name : post.author.name;
  const sub = byOrg ? `Posted by ${post.author.name}` : (post.club?.name ?? "Personal post");
  const authorHref = byOrg ? `/associations/${post.organization!.id}` : `/u/${post.author.id}`;
  const images = post.media.filter((m) => m.mediaType === "image");
  const video = post.media.find((m) => m.mediaType === "youtube");
  const thumb = video ? youtubeThumbnail(video.url) : null;
  const vis = visibilityLabel[post.visibility];
  const href = `/p/${post.id}`;

  const toggleLike = () =>
    requireLogin(async () => {
      const next = !liked;
      setLike({ liked: next, count: Math.max(0, likeCount + (next ? 1 : -1)) });
      try {
        const r = next ? await send<{ likeCount: number }>(`/api/posts/${post.id}/like`) : await del<{ likeCount: number }>(`/api/posts/${post.id}/like`);
        setLike({ liked: next, count: r.likeCount });
      } catch (e) {
        setLike({ liked: !next, count: likeCount });
        toast("Couldn't update the like", errorMessage(e));
      }
    });

  const share = async () => {
    let url = post.shareUrl ?? `${location.origin}${href}`;
    try {
      url = (await send<{ shareUrl: string }>(`/api/posts/${post.id}/share`)).shareUrl ?? url;
    } catch {
      // counting the share is optional
    }
    try {
      if (navigator.share) await navigator.share({ title: `${name} on BaskyCLub`, text: post.content ?? undefined, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      }
    } catch {
      // cancelled
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-card">
      {post.isPinned && <div className="bg-scoreboard px-4 py-1.5 text-xs font-bold text-white">📌 Official announcement</div>}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Link href={authorHref} className="shrink-0">
          <Avatar name={byOrg ? (post.organization!.shortName ?? name) : name} src={byOrg ? post.organization!.logoUrl : post.author.photoUrl} size={40} square={byOrg} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={authorHref} className="truncate font-bold hover:underline">
              {name}
            </Link>
            {!byOrg && post.author.isCreator && <CreatorBadge />}
          </div>
          <div className="truncate text-[13px] text-muted">
            {post.club && !byOrg ? (
              <Link href={`/clubs/${post.club.id}`} className="hover:underline">
                {sub}
              </Link>
            ) : (
              sub
            )}
          </div>
        </div>
        <Link href={href} className="text-[13px] text-muted hover:underline">
          <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
        </Link>
      </header>

      {(post.moderationStatus !== "published" || vis || post.edited) && (
        <div className="flex flex-wrap gap-2 px-4 pt-2">
          {post.moderationStatus === "in_review" && <Tag label="In review by the BaskyCLub team" />}
          {post.moderationStatus === "hidden" && <Tag tone="danger" label="Hidden by moderators (only you see it)" />}
          {vis && <Tag label={vis} />}
          {post.edited && <Tag label="Edited" />}
        </div>
      )}

      {post.content && <p className="px-4 pt-3 whitespace-pre-wrap [overflow-wrap:anywhere]">{post.content}</p>}

      {images.length > 0 && (
        <div className={cx("mt-3 grid gap-0.5", images.length > 1 && "grid-cols-2")}>
          {images.map((m, i) => (
            <a key={`${m.url}-${i}`} href={m.url} target="_blank" rel="noopener noreferrer" className={cx(images.length === 3 && i === 0 && "col-span-2")}>
              <img src={m.url} alt="" loading="lazy" width={m.width ?? undefined} height={m.height ?? undefined} className="max-h-[560px] w-full bg-fill object-cover" />
            </a>
          ))}
        </div>
      )}
      {video && (
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="relative mx-4 mt-3 block overflow-hidden rounded-xl bg-fill">
          {thumb ? <img src={thumb} alt="YouTube video" loading="lazy" className="aspect-video w-full object-cover" /> : <div className="p-4">Watch on YouTube</div>}
          <span className="absolute bottom-3 left-3 rounded-lg bg-black/75 px-2.5 py-1 text-[13px] font-bold text-white">▶ Watch on YouTube</span>
        </a>
      )}

      <footer className="flex items-center gap-1 px-2 py-2">
        <button type="button" onClick={toggleLike} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold hover:bg-fill">
          <span className={cx("text-lg leading-none", liked ? "text-accent" : "text-ink")}>{liked ? "♥" : "♡"}</span>
          <span className="tabular-nums">{compact(likeCount)}</span>
        </button>
        {linkToPost ? (
          <Link href={href} aria-label="Comments" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold hover:bg-fill">
            <span className="text-lg leading-none">💬</span>
            <span className="tabular-nums">{compact(post.commentCount)}</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 font-bold">
            <span className="text-lg leading-none">💬</span>
            <span className="tabular-nums">{compact(post.commentCount)}</span>
          </span>
        )}
        <span className="flex-1" />
        {post.visibility === "public" && (
          <button type="button" onClick={share} className="rounded-lg px-2.5 py-1.5 text-sm font-bold text-ink-2 hover:bg-fill">
            Share
          </button>
        )}
      </footer>
    </article>
  );
}

/** A list of posts with an empty message. */
export function PostList({ posts, empty }: { posts: Post[]; empty: React.ReactNode }) {
  if (!posts.length) return <>{empty}</>;
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
