// Browser-side POST to this site's own API. Returns the JSON reply, or throws ApiFailure
// with the server's error code/message (see src/server/http.ts for the error shape).

export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function postJson<T = unknown>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiFailure(0, "offline", "Can't reach BaskyCLub. Check your internet connection and try again.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiFailure(
      res.status,
      json?.error?.code ?? "error",
      json?.error?.message ?? "Something went wrong. Please try again.",
    );
  }
  return json as T;
}

/** ?token=… may arrive missing or repeated; use the first non-empty value. */
export function firstParam(value: string | string[] | undefined): string {
  const values = Array.isArray(value) ? value : [value];
  return values.map((v) => v?.trim() ?? "").find(Boolean) ?? "";
}
