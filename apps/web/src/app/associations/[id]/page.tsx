"use client";

import { youtubeThumbnail, type PostCard as Post } from "@baskyclub/shared";
import Link from "next/link";
import { use, useState } from "react";
import { ClubBadge } from "@/components/club-row";
import { FollowButton } from "@/components/follow-button";
import { PostCard } from "@/components/post-card";
import { Avatar, Card, Empty, LinkButton, Loaded, Segmented, Tag } from "@/components/ui";
import { levelLabel, pageStatusLabel } from "@/lib/labels";
import { useScope } from "@/lib/scope";
import { useApi } from "@/lib/store";
import type { BearerRow, LegacyRecord, OrgPage } from "@/lib/types";

const year = (d: string) => new Date(d).getFullYear();

/** An association's page (#59–#66): about, office bearers, Media / Legacy and affiliated clubs. */
export default function AssociationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useApi<OrgPage>(`/api/associations/${id}`);
  return (
    <Loaded q={q} notFound={<Empty title="Not yet on BaskyCLub" body="This association's page isn't public yet." />}>
      {(org) => <OrgView org={org} />}
    </Loaded>
  );
}

function OrgView({ org }: { org: OrgPage }) {
  const [section, setSection] = useState<"about" | "media" | "clubs">("about");
  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-2xl bg-scoreboard p-6 text-white">
        <Avatar name={org.shortName ?? org.name} src={org.logoUrl} size={72} square />
        <h1 className="pt-2 font-display text-[26px] leading-tight font-bold tracking-tight">{org.name}</h1>
        <div className="opacity-75">{levelLabel[org.level ?? ""] ?? org.level}</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{pageStatusLabel[org.pageStatus ?? ""] ?? org.pageLabel}</span>
          <span className="opacity-75">{org.followerCount} followers</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <FollowButton type="organization" id={org.id} following={org.viewer.isFollowing} />
          {(org.viewer.canManage || org.viewer.canPostOfficially) && (
            <LinkButton small kind="secondary" href={`/associations/${org.id}/manage`}>
              Manage association
            </LinkButton>
          )}
        </div>
      </div>
      <Segmented
        value={section}
        onChange={setSection}
        options={[
          { value: "about", label: "About" },
          { value: "media", label: "Media" },
          { value: "clubs", label: `Clubs (${org.affiliatedClubs.length})` },
        ]}
      />
      {section === "about" && <About org={org} />}
      {section === "media" && <Media orgId={org.id} />}
      {section === "clubs" && <Clubs org={org} />}
    </div>
  );
}

function About({ org }: { org: OrgPage }) {
  const bearers = useApi<{ officeBearers: BearerRow[] }>(`/api/associations/${org.id}/office-bearers?past=1`).data?.officeBearers ?? [];
  const posts = useApi<{ posts: Post[] }>(`/api/associations/${org.id}/posts`).data?.posts ?? [];
  const current = bearers.filter((b) => b.isCurrent);
  const past = bearers.filter((b) => !b.isCurrent);
  const contact = [
    org.contactEmail && { label: org.contactEmail, href: `mailto:${org.contactEmail}` },
    org.contactPhone && { label: org.contactPhone, href: `tel:${org.contactPhone.replace(/\s/g, "")}` },
    org.website && /^https?:\/\//.test(org.website) && { label: org.website.replace(/^https?:\/\//, ""), href: org.website },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="space-y-4">
      {org.parent && (
        <Link href={`/associations/${org.parent.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 hover:bg-fill/40">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-muted">Part of</div>
            <div className="font-bold">{org.parent.name}</div>
          </div>
          <span className="text-muted">›</span>
        </Link>
      )}
      {(contact.length > 0 || org.address) && (
        <Card title="Contact">
          <div className="space-y-1 px-4 py-3">
            {contact.map((c) => (
              <a key={c.href} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer nofollow" className="block font-bold text-accent-ink hover:underline">
                {c.label}
              </a>
            ))}
            {org.address && <div className="text-ink-2">{org.address}</div>}
          </div>
        </Card>
      )}
      {current.length > 0 && (
        <Card title="Office bearers">
          {current.map((b) => {
            const body = (
              <>
                <Avatar name={b.name} src={b.photoUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-[13px] text-muted">
                    {b.designation}, since {year(b.termFrom)}
                  </div>
                </div>
              </>
            );
            const cls = "flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0";
            return b.userId ? (
              <Link key={b.id} href={`/u/${b.userId}`} className={`${cls} hover:bg-fill/40`}>
                {body}
              </Link>
            ) : (
              <div key={b.id} className={cls}>
                {body}
              </div>
            );
          })}
          {past.length > 0 && (
            <p className="border-t border-line px-4 py-3 text-[13px] text-muted">
              Earlier: {past.map((b) => `${b.name} (${b.designation}, ${year(b.termFrom)}–${b.termTo ? year(b.termTo) : ""})`).join("; ")}
            </p>
          )}
        </Card>
      )}
      {org.coveredDistricts.length > 0 && (
        <Card title="Covers">
          <div className="flex flex-wrap gap-2 p-4">
            {org.coveredDistricts.map((d) => (
              <Tag key={d.code} label={d.name} />
            ))}
          </div>
        </Card>
      )}
      {org.children.length > 0 && (
        <Card title={`District associations on BaskyCLub (${org.children.length})`}>
          {org.children.map((ch) => (
            <Link key={ch.id} href={`/associations/${ch.id}`} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-fill/40">
              <span className="min-w-0 flex-1 truncate font-semibold">{ch.name}</span>
              {ch.pageStatus === "claimed" && <Tag tone="official" label="Official" />}
            </Link>
          ))}
        </Card>
      )}
      {posts.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-lg font-bold">Official posts</h2>
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Media({ orgId }: { orgId: string }) {
  const q = useApi<{ records: LegacyRecord[] }>(`/api/associations/${orgId}/legacy`);
  return (
    <Loaded q={q}>
      {({ records }) =>
        records.length ? (
          <div className="space-y-4">
            {records.map((r) => (
              <Card key={r.id}>
                <div className="space-y-2 p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-[28px] font-bold tracking-tight text-accent">{r.year ?? year(r.createdAt)}</span>
                    <span className="font-bold">{r.title}</span>
                  </div>
                  {r.body && <p className="whitespace-pre-wrap text-ink-2">{r.body}</p>}
                  {(r.winner || r.runnerUp) && (
                    <p className="text-sm text-ink-2">
                      {r.winner && <>Winner: <b>{r.winner}</b></>}
                      {r.winner && r.runnerUp && " · "}
                      {r.runnerUp && <>Runner-up: <b>{r.runnerUp}</b></>}
                    </p>
                  )}
                  {r.media.map((m, i) =>
                    m.mediaType === "youtube" ? (
                      <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="relative block overflow-hidden rounded-xl bg-fill">
                        {youtubeThumbnail(m.url) && <img src={youtubeThumbnail(m.url)!} alt="YouTube video" className="aspect-video w-full object-cover" loading="lazy" />}
                        <span className="absolute bottom-3 left-3 rounded-lg bg-black/75 px-2.5 py-1 text-[13px] font-bold text-white">▶ Watch on YouTube</span>
                      </a>
                    ) : (
                      <img key={i} src={m.url} alt="" loading="lazy" className="w-full rounded-xl bg-fill object-cover" />
                    ),
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="No records yet" body="District history and past tournaments will be shared here by the association's media team." />
        )
      }
    </Loaded>
  );
}

function Clubs({ org }: { org: OrgPage }) {
  const { places } = useScope();
  if (!org.affiliatedClubs.length) return <Empty title="No affiliated clubs yet" body="Clubs with a valid TNBA affiliation show up here." />;
  return (
    <Card>
      {org.affiliatedClubs.map((c) => (
        <Link key={c.id} href={`/clubs/${c.id}`} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-fill/40">
          <Avatar name={c.name} src={c.logoUrl} size={44} square />
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">{c.name}</div>
            <div className="text-[13px] text-muted">{places?.districts.find((d) => d.code === c.districtCode)?.name}</div>
          </div>
          <ClubBadge kind={c.kind} affiliated verified={false} />
        </Link>
      ))}
    </Card>
  );
}
