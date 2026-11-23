// YouTube links in posts and Media/Legacy records. The server stores only the clean
// https://www.youtube.com/watch?v=ID form; the apps use the same check before sending.

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Accepts the usual YouTube link shapes and returns a clean watch link, or null.
 * youtube.com/watch?v=ID · youtu.be/ID · youtube.com/shorts/ID · m.youtube.com/... · youtube.com/live/ID · /embed/ID
 */
export function normalizeYouTubeUrl(input: string): string | null {
  const id = youtubeId(input);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

/** The 11-character video id of a YouTube link, or null if it isn't one. */
export function youtubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(shorts|live|embed)\/([^/]+)/);
      if (m) id = m[2];
    }
  }
  return id && ID.test(id) ? id : null;
}

/** Thumbnail for a YouTube link (YouTube's own image host), or null if it isn't one. */
export function youtubeThumbnail(input: string): string | null {
  const id = youtubeId(input);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
