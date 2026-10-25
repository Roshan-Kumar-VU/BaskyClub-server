import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Tag } from '@/components/badge';
import { ClubRow } from '@/components/club-row';
import { EmptyState } from '@/components/empty-state';
import { FollowButton } from '@/components/follow-button';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { PostCard } from '@/components/post-card';
import { PressableScale } from '@/components/pressable-scale';
import { Segmented } from '@/components/segmented';
import { SectionHeader } from '@/components/stat-tile';
import { Text } from '@/components/text';
import { getAssociationDetail } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

const levelLabel = { national: 'National federation', state: 'State association', district: 'District association', league_operator: 'League operator' } as const;
const statusLabel = { draft: 'Draft (Basky team only)', published: 'Managed by BaskyCLub', claimed: 'Official page' } as const;
const year = (d: string) => new Date(d).getFullYear();

type Section = 'about' | 'media' | 'clubs';

/** Association page (#59): draft hidden from the public; published = Managed by BaskyCLub; claimed = run by the association. */
export default function AssociationPage() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [section, setSection] = useState<Section>('about');
  const d = getAssociationDetail(id, user?.userId);
  if (!d) return <EmptyState ios="building.columns" android="account_balance" title="Not yet on BaskyCLub" body="This association's page isn't public yet." />;
  const { org } = d;
  const open = (oid: string) => router.push({ pathname: '/association/[id]', params: { id: oid } });

  return (
    <>
      <Stack.Screen options={{ title: org.shortName ?? '' }} />
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: space.xxl * 2 }}>
        <View style={{ backgroundColor: c.scoreboard, padding: space.xl, gap: space.sm }}>
          <Avatar name={org.shortName ?? org.name} size={72} square />
          <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.6, color: '#fff', marginTop: space.sm }}>{org.name}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)' }}>{levelLabel[org.level]}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm }}>
            <View style={{ paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Text variant="micro" style={{ color: '#fff' }}>{statusLabel[org.pageStatus]}</Text>
            </View>
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>{d.followers} followers</Text>
          </View>
          <View style={{ marginTop: space.md }}>
            <FollowButton type="organization" id={org.id} />
          </View>
        </View>

        <View style={{ padding: space.lg }}>
          <Segmented value={section} onChange={setSection} options={[{ value: 'about', label: 'About' }, { value: 'media', label: 'Media' }, { value: 'clubs', label: `Clubs (${d.clubs.length})` }]} />
        </View>

        {section === 'about' && (
          <View>
            {!!org.about && <Text color="textSecondary" style={{ paddingHorizontal: space.lg }}>{org.about}</Text>}
            {d.parent && (
              <PressableScale onPress={() => open(d.parent!.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, margin: space.lg, marginBottom: 0, padding: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
                  <Icon ios="arrow.up.circle" android="north" color={c.official} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color="textMuted">Part of</Text>
                    <Text variant="bodyStrong">{d.parent.name}</Text>
                  </View>
                  <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} />
                </View>
              </PressableScale>
            )}

            {d.officeBearers.length > 0 && (
              <>
                <SectionHeader title="Office bearers" />
                <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
                  {d.officeBearers.map((b) => (
                    <PressableScale key={b.id} scaleTo={0.99} disabled={!b.userId} onPress={() => b.userId && router.push({ pathname: '/user/[id]', params: { id: b.userId } })}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.line }}>
                        <Avatar name={b.name} size={40} />
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyStrong">{b.name}</Text>
                          <Text variant="caption" color="textMuted">{b.title}, since {year(b.startDate)}</Text>
                        </View>
                      </View>
                    </PressableScale>
                  ))}
                </View>
                {d.pastOfficeBearers.length > 0 && (
                  <Text variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
                    Earlier: {d.pastOfficeBearers.map((b) => `${b.name} (${b.title}, ${year(b.startDate)}–${b.endDate ? year(b.endDate) : ''})`).join('; ')}
                  </Text>
                )}
              </>
            )}

            {d.coveredDistricts.length > 0 && (
              <>
                <SectionHeader title="Covers" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg }}>
                  {d.coveredDistricts.map((x) => <Tag key={x.code} label={x.name} />)}
                </View>
              </>
            )}

            {d.children.length > 0 && (
              <>
                <SectionHeader title={`District associations on BaskyCLub (${d.children.length})`} />
                <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
                  {d.children.map((ch) => (
                    <PressableScale key={ch.id} scaleTo={0.99} onPress={() => open(ch.id)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.line }}>
                        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{ch.name}</Text>
                        {ch.pageStatus === 'claimed' && <Icon ios="checkmark.seal.fill" android="verified" size={14} color={c.official} />}
                      </View>
                    </PressableScale>
                  ))}
                </View>
              </>
            )}

            {d.posts.length > 0 && (
              <>
                <SectionHeader title="Official posts" />
                <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>{d.posts.map((p) => <PostCard key={p.postId} post={p} />)}</View>
              </>
            )}
          </View>
        )}

        {section === 'media' &&
          (d.legacy.length ? (
            <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
              {d.legacy.map((r) => (
                <View key={r.id} style={{ paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: c.line, gap: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md, paddingHorizontal: space.lg }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: -1, color: c.accent }}>{r.year}</Text>
                    <Text variant="subheading" style={{ flex: 1 }}>{r.title}</Text>
                  </View>
                  {!!r.body && <Text color="textSecondary" style={{ paddingHorizontal: space.lg }}>{r.body}</Text>}
                  {r.media.map((m) => (
                    <View key={m.id} style={{ marginTop: space.sm }}>
                      <Photo uri={m.url} seed={m.id} aspectRatio={16 / 9} />
                      {!!m.caption && <Text variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, paddingTop: 6 }}>{m.caption}</Text>}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <EmptyState ios="photo.stack" android="collections" title="No records yet" body="District history and past tournaments will be shared here by the association's media team." />
          ))}

        {section === 'clubs' &&
          (d.clubs.length ? (
            <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>{d.clubs.map((cl) => <ClubRow key={cl.clubId} club={cl} />)}</View>
          ) : (
            <EmptyState ios="shield" android="shield" title="No affiliated clubs yet" body="Clubs with a valid TNBA affiliation show up here." />
          ))}
      </ScrollView>
    </>
  );
}
