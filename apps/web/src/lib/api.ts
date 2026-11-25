// Browser-side calls to the API. The browser always calls this site's own /api/... (next.config.ts
// forwards it to apps/api); the login cookie (httpOnly, set by /session/*) rides along by itself.
// Errors come back as ApiFailure with the server's code and message (apps/api src/server/http.ts).

export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Body = Record<string, unknown> | unknown[] | FormData | undefined;

export async function api<T = unknown>(method: string, path: string, body?: Body): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined && !isForm) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiFailure(0, "offline", "Can't reach BaskyCLub. Check your internet connection and try again.");
  }
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // not JSON (e.g. a proxy error page)
  }
  if (!res.ok) {
    let message: string = json?.error?.message ?? "Something went wrong. Please try again.";
    const ref = json?.error?.requestId ?? res.headers.get("x-request-id");
    if (res.status >= 500 && ref) message += ` (ref ${ref})`;
    throw new ApiFailure(res.status, json?.error?.code ?? "error", message);
  }
  return json as T;
}

export const get = <T = unknown>(path: string) => api<T>("GET", path);
export const post = <T = unknown>(path: string, body?: Body) => api<T>("POST", path, body ?? {});
export const put = <T = unknown>(path: string, body: Body) => api<T>("PUT", path, body);
export const patch = <T = unknown>(path: string, body: Body) => api<T>("PATCH", path, body);
export const del = <T = unknown>(path: string) => api<T>("DELETE", path);

/** Same as post(); kept for the token pages (reset password, parent consent). */
export const postJson = post;

/** Uploads one photo chosen in the browser and returns its link (API: up to 10 MB). */
export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name || "photo.jpg");
  return (await api<{ url: string }>("POST", "/api/uploads", form)).url;
}

/** Query string from an object, skipping empty values. */
export function qs(o: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** A readable message for any error. */
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/** ?token=… may arrive missing or repeated; use the first non-empty value. */
export function firstParam(value: string | string[] | undefined): string {
  const values = Array.isArray(value) ? value : [value];
  return values.map((v) => v?.trim() ?? "").find(Boolean) ?? "";
}

/** Where to go after logging in: only paths on this site (never another site from ?next=). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
