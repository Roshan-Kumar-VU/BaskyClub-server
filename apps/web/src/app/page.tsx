"use client";

import type { PostCard as Post } from "@baskyclub/shared";
import Link from "next/link";
import { useState } from "react";
import { PostCard } from "@/components/post-card";
import { DistrictBanner, ScopeBar } from "@/components/scope-bar";
import { Avatar, Button, Card, Empty, Loaded, Segmented, Tag } from "@/components/ui";
import { qs } from "@/lib/api";
import { scopedDistrict, useScope } from "@/lib/scope";
import { useApi, usePaged } from "@/lib/store";
import type { OrgPage } from "@/lib/types";

type Feed = { pinned: Post[]; posts: Post[]; nextCursor: string | null };

/** Home: All India feed, or the district hub (Feed · Association), like the app. */
export default function Home() {
  const s = useScope();
  const district = scopedDistrict(s);
  const [tab, setTab] = useState<"feed" | "association">("feed");
  return (
    <>
      <ScopeBar />
      <DistrictBanner />
      {district && (
        <div className="mb-4">
          <Segmented value={tab} onChange={setTab} options={[{ value: "feed", label: "Feed" }, { value: "association", label: "Association" }]} />
        </div>
      )}
      {district && tab === "association" ? <AssociationTab district={district} /> : <FeedList district={district} />}
    </>
  );
}

function FeedList({ district }: { district: string | null }) {
  const { districtName } = useScope();
  const path = `/api/feed${qs(district ? { scope: "district", districtCode: district, limit: 20 } : { limit: 20 })}`;
  const feed = usePaged<Post, Feed>(path, (r) => ({ items: r.posts, nextCursor: r.nextCursor }));
  return (
    <Loaded q={feed}>
      {(data) => {
        const pinned = data.pinned ?? [];
        const posts = feed.items.filter((p) => !pinned.some((x) => x.id === p.id));
        if (!pinned.length && !posts.length) {
          return <Empty title={`No posts in ${district ? (districtName ?? "this district") : "BaskyCLub"} yet`} body="Posts from clubs and players here will show up in this feed." />;
        }
        return (
          <div className="space-y-4">
            {[...pinned, ...posts].map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {feed.hasMore && (
              <Button block kind="secondary" loading={feed.loadingMore} onClick={feed.loadMore}>
                Load more posts
              </Button>
            )}
          </div>
        );
      }}
    </Loaded>
  );
}

function AssociationTab({ district }: { district: string }) {
  const { places, districtName } = useScope();
  const assocId = places?.districts.find((d) => d.code === district)?.associationId ?? null;
  const org = useApi<OrgPage>(assocId ? `/api/associations/${assocId}` : null);
  if (!places) return null;
  if (!assocId) return <Empty title="Not yet on BaskyCLub" body={`The basketball association for ${districtName} isn't on BaskyCLub yet.`} />;
  return (
    <Loaded q={org} notFound={<Empty title="Not yet on BaskyCLub" body={`The basketball association for ${districtName} isn't on BaskyCLub yet.`} />}>
      {(o) => (
        <div className="space-y-3">
          <Link href={`/associations/${o.id}`} className="block rounded-2xl border border-line bg-card p-4 hover:bg-fill/40">
            <div className="flex items-center gap-3">
              <Avatar name={o.shortName ?? o.name} src={o.logoUrl} size={56} square />
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-bold">{o.name}</div>
                <div className="text-sm text-muted">Covers {districtName}</div>
              </div>
            </div>
            <div className="mt-3">
              <Tag tone={o.pageStatus === "claimed" ? "official" : "neutral"} label={o.pageStatus === "claimed" ? "Official page" : o.pageStatus === "published" ? "Managed by BaskyCLub" : "Draft (Basky team only)"} />
            </div>
          </Link>
          {o.parent && (
            <Card>
              <Link href={`/associations/${o.parent.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fill/40">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-muted">State body</div>
                  <div className="font-bold">{o.parent.name}</div>
                </div>
                <span className="text-muted">›</span>
              </Link>
            </Card>
          )}
        </div>
      )}
    </Loaded>
  );
}
