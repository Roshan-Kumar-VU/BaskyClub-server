import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { youtubeThumbnail, type PostCard } from "@baskyclub/shared";
import { cache } from "react";
import { apiUrl } from "../../_lib/config";

// Share link for a post: the API's shareUrl() = WEB_URL/p/:id.
// Rendered on the server so WhatsApp / social apps get a title, text and photo preview.
// Read from GET /api/posts/:id as a visitor (no login), so the API's visibility rules apply:
// members-only, in-review, deleted and suspended-author posts are "not found".

type Props = { params: Promise<{ id: string }> };

/** One API call per request, shared by generateMetadata and the page. */
const loadPost = cache(async (id: string): Promise<PostCard | null> => {
  const res = await fetch(`${apiUrl}/api/posts/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  // 404: hidden or missing · 400: not a valid post id
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API answered ${res.status} for post ${id}`);
  return (await res.json()) as PostCard;
});

type Post = PostCard;

/** Who the post is from: the association or club it was posted for, else the person. */
function postedBy(post: Post) {
  return post.organization?.name ?? post.author.name;
}

function summary(text: string | null, max = 160) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPost((await params).id);
  if (!post) return { title: "Post not found", robots: { index: false, follow: false } };

  const title = `${postedBy(post)} on BaskyCLub`;
  const description = summary(post.content) || "A post on BaskyCLub, the basketball community.";
  const photo = post.media.find((m) => m.mediaType === "image")?.url;
  const video = post.media.find((m) => m.mediaType === "youtube")?.url;
  const image = photo ?? (video ? youtubeThumbnail(video) : null);
  return {
    title: { absolute: title }, // already ends in "BaskyCLub"; skip the layout's " · BaskyCLub"
    description,
    alternates: { canonical: `/p/${post.id}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/p/${post.id}`,
      siteName: "BaskyCLub",
      publishedTime: post.createdAt,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function SharedPostPage({ params }: Props) {
  const post = await loadPost((await params).id);
  if (!post) notFound();

  const from = post.organization?.shortName || post.organization?.name || post.club?.name;
  const thumbs = post.media.map((m) => (m.mediaType === "youtube" ? youtubeThumbnail(m.url) : null));
  const initials = post.author.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="card">
      <header className="post-head">
        {/* Plain <img>: photos come from any https host (uploads, CDN), not a fixed list for next/image */}
        {post.author.photoUrl ? (
          <img className="avatar" src={post.author.photoUrl} alt="" />
        ) : (
          <div className="avatar" aria-hidden>
            {initials}
          </div>
        )}
        <div>
          <div className="post-author">{post.author.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {from ? `${from} · ` : ""}
            <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
            {post.edited ? " · edited" : ""}
          </div>
        </div>
      </header>

      {post.content && <p className="post-content">{post.content}</p>}

      {post.media.length > 0 && (
        <div className="post-media">
          {post.media.map((m, i) =>
            m.mediaType === "youtube" ? (
              <a key={m.url} className={thumbs[i] ? "youtube" : undefined} href={m.url} target="_blank" rel="noopener noreferrer">
                {thumbs[i] ? <img src={thumbs[i]!} alt="YouTube video" /> : "Watch on YouTube"}
              </a>
            ) : (
              <img key={m.url} src={m.url} alt="" loading="lazy" width={m.width ?? undefined} height={m.height ?? undefined} />
            ),
          )}
        </div>
      )}

      <div className="post-stats">
        <span>{post.likeCount} likes</span>
        <span>{post.commentCount} comments</span>
      </div>

      <a className="button" href={`baskyclub://post/${post.id}`}>
        Open in the BaskyCLub app
      </a>
    </article>
  );
}
