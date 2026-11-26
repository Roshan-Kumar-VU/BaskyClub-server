import type { Audience } from "@baskyclub/shared";

export const audienceLabel: Record<Audience, string> = {
  club_admins_in_area: "Club owners and admins in the area",
  affiliated_members: "Members of affiliated clubs",
  district_users: "Everyone in the district",
  followers: "Followers",
  club_members: "Club members",
  everyone: "Everyone on BaskyCLub",
};

export const clubKindLabel = { club: "Community club", academy: "Academy", creator_group: "Creator group", franchise: "Franchise" } as const;

export const positions = [
  { value: "PG", label: "Point guard" },
  { value: "SG", label: "Shooting guard" },
  { value: "SF", label: "Small forward" },
  { value: "PF", label: "Power forward" },
  { value: "C", label: "Center" },
] as const;

export const levelLabel: Record<string, string> = { national: "National federation", state: "State association", district: "District association", league_operator: "League operator" };
export const pageStatusLabel: Record<string, string> = { draft: "Draft (Basky team only)", published: "Managed by BaskyCLub", claimed: "Official page" };
