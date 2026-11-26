"use client";

import { LIMITS, type Comment, type CommentPage, type PostCard as Post, type ReplyPage } from "@baskyclub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { PostCard } from "@/components/post-card";
import { ReportDialog } from "@/components/report-dialog";
import { Avatar, Button, confirmAction, cx, toast } from "@/components/ui";
import { del, errorMessage, get, patch, post as send } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { ME, useSession } from "@/lib/session";
import { invalidate } from "@/lib/store";

const PAGE = 20;
type Paged<T> = { items: T[]; next: string | null; loaded: boolean };

/** Union by id (newer copy wins), oldest first like the server. */
function merge(older: Comment[], newer: Comment[]): Comment[] {
  const byId = new Map(older.map((x) => [x.id, x]));
  for (const x of newer) byId.set(x.id, x);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** Post page body: the post, its actions and comments with one level of replies (PRD §7). */
export function PostDetail({ initial }: { initial: Post }) {
  const router = useRouter();
  const { user, requireLogin } = useSession();
  const [post, setPost] = useState(initial);
  const [comments, setComments] = useState<Paged<Comment>>({ items: [], next: null, loaded: false });
  const [replies, setReplies] = useState<Record<string, Paged<Comment>>>({});
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<{ type: "post" | "comment"; id: string } | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const id = post.id;

  const refreshPost = useCallback(async () => {
    try {
      setPost(await get<Post>(`/api/posts/${id}`));
    } catch {
      // keep what we have
    }
  }, [id]);

  // Comments load (and refresh) when the post opens: no live stream (PRD §7)
  useEffect(() => {
    get<CommentPage>(`/api/posts/${id}/comments?limit=${PAGE}`)
      .then((r) => setComments({ items: r.comments, next: r.nextCursor, loaded: true }))
      .catch(() => setComments((c) => ({ ...c, loaded: true })));
  }, [id]);

  const moreComments = async () => {
    if (!comments.next) return;
    const r = await get<CommentPage>(`/api/posts/${id}/comments?limit=${PAGE}&cursor=${encodeURIComponent(comments.next)}`);
    setComments((c) => ({ items: merge(c.items, r.comments), next: r.nextCursor, loaded: true }));
  };

  const openThread = async (topId: string, cursor?: string) => {
    const r = await get<ReplyPage>(`/api/comments/${topId}/replies?limit=${PAGE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    setReplies((x) => ({ ...x, [topId]: { items: merge(x[topId]?.items ?? [], r.replies), next: r.nextCursor, loaded: true } }));
  };

  const startReply = (c: Comment) =>
    requireLogin(() => {
      setReplyTo(c);
      setText(c.user && c.user.id !== user?.id ? `@${c.user.name} ` : "");
      input.current?.focus();
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    requireLogin(async () => {
      const content = text.trim();
      if (!content || busy) return;
      setBusy(true);
      try {
        const created = await send<Comment>(`/api/posts/${id}/comments`, { content, ...(replyTo ? { parentId: replyTo.id } : {}) });
        const topId = created.parentId;
        if (topId) {
          setComments((c) => ({ ...c, items: c.items.map((x) => (x.id === topId ? { ...x, replyCount: (x.replyCount ?? 0) + 1 } : x)) }));
          setReplies((x) => ({ ...x, [topId]: { items: merge(x[topId]?.items ?? [], [created]), next: x[topId]?.next ?? null, loaded: true } }));
          if (!replies[topId]) openThread(topId).catch(() => {});
        } else {
          setComments((c) => ({ ...c, items: merge(c.items, [created]) }));
        }
        setText("");
        setReplyTo(null);
        refreshPost();
      } catch (err) {
        toast("Couldn't post the comment", errorMessage(err));
      } finally {
        setBusy(false);
      }
    });
  };

  /** Same rules as the server: a removed reply disappears; a removed comment with replies stays as "Comment removed". */
  const remove = async (c: Comment) => {
    if (!confirmAction("Delete this comment?")) return;
    try {
      await del(`/api/comments/${c.id}`);
      if (c.parentId) {
        const topId = c.parentId;
        setReplies((x) => ({ ...x, [topId]: { ...x[topId], items: x[topId].items.filter((r) => r.id !== c.id) } }));
        setComments((s) => ({ ...s, items: s.items.map((x) => (x.id === topId ? { ...x, replyCount: Math.max(0, (x.replyCount ?? 1) - 1) } : x)) }));
      } else {
        setComments((s) => ({
          ...s,
          items: s.items.flatMap((x) => (x.id !== c.id ? [x] : (x.replyCount ?? 0) > 0 ? [{ ...x, isRemoved: true, content: null, user: null, canDelete: false }] : [])),
        }));
      }
      refreshPost();
    } catch (err) {
      toast("Couldn't delete", errorMessage(err));
    }
  };

  const deletePost = async () => {
    if (!confirmAction("Delete this post? It disappears for everyone.")) return;
    try {
      await del(`/api/posts/${id}`);
      invalidate("/api/feed", "/api/users/", "/api/clubs/", "/api/associations/");
      toast("Post deleted");
      router.replace("/");
    } catch (err) {
      toast("Couldn't delete the post", errorMessage(err));
    }
  };

  const pinned = user?.pinnedPostId === id;
  const togglePin = async () => {
    try {
      await patch(ME, { pinnedPostId: pinned ? null : id });
      invalidate(ME, `/api/users/${user!.id}`);
      toast(pinned ? "Unpinned" : "Pinned to your profile");
    } catch (err) {
      toast("Couldn't change the pin", errorMessage(err));
    }
  };

  const row = (c: Comment, reply: boolean) => (
    <div key={c.id} className={cx("flex gap-3 py-2", reply && "pl-12")}>
      {c.isRemoved ? (
        <>
          <Avatar name="?" size={reply ? 28 : 34} />
          <div className="pt-1.5 text-sm text-muted italic">Comment removed</div>
        </>
      ) : (
        <>
          <Link href={c.user ? `/u/${c.user.id}` : "#"} className="shrink-0">
            <Avatar name={c.user?.name ?? "?"} src={c.user?.photoUrl} size={reply ? 28 : 34} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-sm">
              {c.user && (
                <Link href={`/u/${c.user.id}`} className="font-bold hover:underline">
                  {c.user.name}
                </Link>
              )}
              <span className="ml-2 text-muted">{timeAgo(c.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{c.content}</p>
            <div className="mt-1 flex gap-4 text-sm font-bold text-muted">
              <button type="button" onClick={() => startReply(c)} className="hover:text-ink">
                Reply
              </button>
              {c.canDelete && (
                <button type="button" onClick={() => remove(c)} className="hover:text-danger">
                  Delete
                </button>
              )}
              {user && c.user && c.user.id !== user.id && (
                <button type="button" onClick={() => setReporting({ type: "comment", id: c.id })} className="hover:text-ink">
                  Report
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <PostCard key={`${post.id}-${post.likeCount}-${post.likedByMe}`} post={post} linkToPost={false} />

      {user && (
        <div className="flex flex-wrap gap-4 px-1 text-sm font-bold">
          {post.author.id === user.id && post.moderationStatus === "published" && post.visibility !== "members" && !post.organization && (
            <button type="button" onClick={togglePin} className="text-accent-ink hover:underline">
              {pinned ? "Unpin from profile" : "Pin to profile"}
            </button>
          )}
          {post.canDelete && (
            <button type="button" onClick={deletePost} className="text-danger hover:underline">
              Delete post
            </button>
          )}
          {post.author.id !== user.id && (
            <button type="button" onClick={() => setReporting({ type: "post", id })} className="text-muted hover:underline">
              Report
            </button>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 font-display text-lg font-bold">{post.commentCount ? `${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}` : "No comments yet"}</h2>
        {!comments.loaded && <div className="py-4 text-muted">Loading comments…</div>}
        {comments.items.map((c) => {
          const thread = replies[c.id];
          const count = c.replyCount ?? 0;
          return (
            <div key={c.id}>
              {row(c, false)}
              {count > 0 && !thread && (
                <button type="button" onClick={() => openThread(c.id).catch((e) => toast("Couldn't load replies", errorMessage(e)))} className="py-1 pl-12 text-sm font-bold text-muted hover:text-ink">
                  — View {count} {count === 1 ? "reply" : "replies"}
                </button>
              )}
              {thread?.items.map((r) => row(r, true))}
              {thread?.next && (
                <button type="button" onClick={() => openThread(c.id, thread.next!)} className="py-1 pl-12 text-sm font-bold text-accent-ink">
                  View more replies
                </button>
              )}
            </div>
          );
        })}
        {comments.next && (
          <button type="button" onClick={() => moreComments().catch((e) => toast("Couldn't load comments", errorMessage(e)))} className="py-2 text-sm font-bold text-accent-ink">
            Load more comments
          </button>
        )}

        <form onSubmit={submit} className="mt-3 border-t border-line pt-3">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between text-sm text-muted">
              <span>Replying to {replyTo.user?.name ?? "comment"}</span>
              <button type="button" onClick={() => { setReplyTo(null); setText(""); }} className="font-bold hover:text-ink">
                Cancel
              </button>
            </div>
          )}
          {user ? (
            <div className="flex items-end gap-2">
              <textarea
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={LIMITS.comment.max}
                rows={1}
                placeholder="Add a comment…"
                className="min-h-10 flex-1 resize-y rounded-xl border border-line bg-bg px-3.5 py-2 focus:outline-2 focus:outline-accent"
              />
              <Button type="submit" small loading={busy} disabled={!text.trim()}>
                Send
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => requireLogin(() => {})} className="w-full rounded-xl bg-fill px-4 py-2.5 text-left text-muted">
              Log in to comment
            </button>
          )}
        </form>
      </section>

      <ReportDialog target={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
