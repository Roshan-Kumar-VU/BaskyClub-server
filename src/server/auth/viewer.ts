import { prisma } from "../db";
import { AppError, forbidden, unauthorized } from "../errors";
import { ageOn } from "../lib/dates";
import { readLoginToken } from "./token";

export const PLATFORM_ROLES = ["super_admin", "basky_admin", "moderator"] as const;
export type PlatformRoleName = (typeof PLATFORM_ROLES)[number];

/** The person making the request, as the API sees them. */
export interface Viewer {
  id: string;
  name: string;
  status: string; // "active" | "limited" | "suspended"
  isMinor: boolean;
  platformRoles: Set<PlatformRoleName>;
}

export const LOGIN_COOKIE = "basky_token";

function tokenFrom(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  const cookie = req.headers.get("cookie");
  const match = cookie?.match(new RegExp(`(?:^|;\\s*)${LOGIN_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Who is calling? null for visitors (no token). Throws for bad tokens or blocked accounts. */
export async function getViewer(req: Request): Promise<Viewer | null> {
  const token = tokenFrom(req);
  if (!token) return null;

  const userId = await readLoginToken(token);
  if (!userId) throw unauthorized("Your login has expired. Please log in again.");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      status: true,
      dateOfBirth: true,
      platformRoles: { where: { toAt: null }, select: { role: true } },
    },
  });
  if (!user || user.status === "deleted") throw unauthorized("This account no longer exists.");
  if (user.status === "suspended") {
    throw new AppError(403, "account_suspended", "This account is suspended. Contact the BaskyCLub team.");
  }

  return {
    id: user.id,
    name: user.name,
    status: user.status,
    isMinor: ageOn(user.dateOfBirth) < 18,
    platformRoles: new Set(user.platformRoles.map((r) => r.role as PlatformRoleName)),
  };
}

/** Same as getViewer, but visitors get "Please log in". */
export async function requireViewer(req: Request): Promise<Viewer> {
  const viewer = await getViewer(req);
  if (!viewer) throw unauthorized();
  return viewer;
}

/**
 * For anything that creates content or changes data.
 * Under-18 accounts stay "limited" (browse only) until a parent confirms (#67).
 */
export function requireActive(viewer: Viewer): void {
  if (viewer.status === "limited") {
    throw forbidden(
      "awaiting_parent",
      "Your parent or guardian needs to confirm your account first. We sent them an email.",
    );
  }
}
