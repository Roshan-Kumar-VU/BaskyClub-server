import type { ClubCard, ClubKind } from "@baskyclub/shared";
import Link from "next/link";
import { clubKindLabel } from "@/lib/labels";
import { Avatar, Tag } from "./ui";

/**
 * Club badge. Affiliated comes from an active, unexpired affiliation (#58); academies with a
 * basky_verified badge show "Verified by BaskyCLub".
 */
export function ClubBadge({ kind, affiliated, verified }: { kind: ClubKind; affiliated: boolean; verified: boolean }) {
  if (verified) return <Tag tone="accent" label="✓ Verified by BaskyCLub" />;
  if (kind === "club" && affiliated) return <Tag tone="official" label="Affiliated" />;
  return <Tag label={clubKindLabel[kind]} />;
}

/** One club in a list: name, place, size and badge. */
export function ClubRow({ club }: { club: ClubCard }) {
  return (
    <Link href={`/clubs/${club.id}`} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-fill/40">
      <Avatar name={club.name} src={club.logoUrl} size={52} square />
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{club.name}</div>
        <div className="text-[13px] text-muted">
          {[club.districtName, club.memberCount ? `${club.memberCount} ${club.memberCount === 1 ? "member" : "members"}` : null].filter(Boolean).join(" · ")}
        </div>
        <div className="mt-1">
          <ClubBadge kind={club.kind} affiliated={!!club.affiliatedTo} verified={club.isVerified} />
        </div>
      </div>
      <span className="text-muted">›</span>
    </Link>
  );
}
