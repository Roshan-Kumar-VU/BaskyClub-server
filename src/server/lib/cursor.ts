// "Load more" for lists ordered newest first. The cursor is the last item's time + id,
// so new posts arriving at the top never shift or repeat items further down.
import { badRequest } from "../errors";

export interface Cursor {
  at: Date;
  id: string;
}

export function encodeCursor(item: { createdAt: Date; id: string } | undefined): string | null {
  if (!item) return null;
  return Buffer.from(`${item.createdAt.toISOString()}|${item.id}`).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): Cursor | null {
  if (!cursor) return null;
  const [at, id] = Buffer.from(cursor, "base64url").toString().split("|");
  const date = new Date(at);
  if (!id || Number.isNaN(date.getTime())) throw badRequest("bad_cursor", "Invalid page cursor.");
  return { at: date, id };
}

/** Prisma filter: items older than the cursor (newest-first order). */
export function olderThan(cursor: Cursor | null) {
  if (!cursor) return {};
  return { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: cursor.id } }] };
}

/** Prisma filter: items newer than the cursor (oldest-first order, e.g. comments). */
export function newerThan(cursor: Cursor | null) {
  if (!cursor) return {};
  return { OR: [{ createdAt: { gt: cursor.at } }, { createdAt: cursor.at, id: { gt: cursor.id } }] };
}
