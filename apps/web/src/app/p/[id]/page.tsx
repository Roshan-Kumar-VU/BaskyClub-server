import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { youtubeThumbnail, type PostCard } from "@baskyclub/shared";
import { cookies } from "next/headers";
import { cache } from "react";
import { apiUrl } from "../../_lib/config";
import { PostDetail } from "./post-detail";

// Share link for a post: the API's shareUrl() = WEB_URL/p/:id.
// Rendered on the server so WhatsApp / social apps get a title, text and photo preview.
// Read from GET /api/posts/:id as whoever opens it (the login cookie is passed on), so the API's
// visibility rules apply: a visitor or link-preview bot gets "not found" for members-only, hidden,
// deleted and suspended-author posts; club members see their club's members-only posts.

type Props = { params: Promise<{ id: string }> };

/** One API call per request, shared by generateMetadata and the page. */
const loadPost = cache(async (id: string): Promise<PostCard | null> => {
  const token = (await cookies()).get("basky_token")?.value;
  const res = await fetch(`${apiUrl}/api/posts/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: { accept: "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(10_000),
  });
  // 404: hidden or missing · 400: not a valid post id
  // 401: the login cookie expired; show the post as a visitor would see it
  if (res.status === 401 && token) return loadAsVisitor(id);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API answered ${res.status} for post ${id}`);
  return (await res.json()) as PostCard;
});

async function loadAsVisitor(id: string): Promise<PostCard | null> {
  const res = await fetch(`${apiUrl}/api/posts/${encodeURIComponent(id)}`, { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API answered ${res.status} for post ${id}`);
  return (await res.json()) as PostCard;
}

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
  // Only public posts belong in search results and link previews
  if (post.visibility !== "public") return { title: { absolute: title }, robots: { index: false, follow: false } };
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

export default async function PostPage({ params }: Props) {
  const post = await loadPost((await params).id);
  if (!post) notFound();
  return <PostDetail initial={post} />;
}
