"use client";

import { use, useState } from "react";
import { FollowButton } from "@/components/follow-button";
import { ProfileView } from "@/components/profile-view";
import { ReportDialog } from "@/components/report-dialog";
import { Empty, LinkButton, Loaded } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/store";
import type { Profile } from "@/lib/types";

/** Someone's profile (#72). */
export default function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useSession();
  const q = useApi<Profile>(`/api/users/${id}`);
  const [reporting, setReporting] = useState(false);
  const mine = user?.id === id;
  return (
    <Loaded q={q} notFound={<Empty title="Profile not found" />}>
      {(p) => (
        <>
          <ProfileView p={p} actions={mine ? <LinkButton small kind="secondary" href="/settings/profile">Edit profile</LinkButton> : <FollowButton type="user" id={id} following={!!p.viewer?.isFollowing} />} />
          {user && !mine && (
            <button type="button" onClick={() => setReporting(true)} className="mt-6 block w-full text-center text-sm text-muted hover:underline">
              Report this account
            </button>
          )}
          <ReportDialog target={reporting ? { type: "user", id } : null} onClose={() => setReporting(false)} />
        </>
      )}
    </Loaded>
  );
}
