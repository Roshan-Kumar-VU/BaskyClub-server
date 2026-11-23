'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Card, Page } from '@/components/form';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { type CaseStatus, decideCase, getCases, type ModCase } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { ago } from '@/lib/format';
import { notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space } from '@/theme';

const sourceLabel = { no_club_review: 'No club — needs review', report: 'Reported', ai: 'AI flag' } as const;

/** Moderators (PRD §8): reported posts, comments and people. Publish/keep, hide (reversible) or remove. */
export default function Moderation() {
  useStoreVersion();
  const { user } = useSession();
  const [tab, setTab] = useState<CaseStatus>('open');
  const [busy, setBusy] = useState<string | null>(null);
  const isMod = !!user?.platformRoles.some((r) => ['moderator', 'basky_admin', 'super_admin'].includes(r));
  if (!isMod) return <EmptyState ios="lock.fill" android="lock" title="Moderators only" />;
  const cases = getCases(tab);

  const decide = async (c: ModCase, decision: 'approve' | 'hide' | 'remove') => {
    setBusy(c.id + decision);
    try {
      await decideCase(c.id, decision);
    } catch (e) {
      notify("Couldn't save the decision", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const preview = (c: ModCase) => {
    const t = c.target;
    if (!t) return 'Item no longer exists';
    if (c.targetType === 'user') return `Account: ${t.name} (${t.status})`;
    if (c.targetType === 'comment') return `Comment by ${t.user?.name}: “${t.content}”`;
    return `${t.author?.name}: ${t.content ?? '(photo or video)'}${t.media?.length ? ` · ${t.media.length} media` : ''}`;
  };

  return (
    <Page>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'open', label: 'To review' }, { value: 'hidden', label: 'Hidden' }, { value: 'approved', label: 'Kept' }, { value: 'removed', label: 'Removed' }]} />
      {tab === 'hidden' && <Text variant="caption" color="textMuted">Hidden items are seen only by their author. Publish one again, or remove it for good.</Text>}
      {!cases.length && <EmptyState ios="checkmark.circle" android="check_circle" title={tab === 'open' ? 'Nothing to review' : 'Nothing here'} />}
      {cases.map((c) => (
        <Card key={c.id}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Tag label={sourceLabel[c.source]} />
              <Tag label={c.targetType} />
              <Text variant="caption" color="textMuted" style={{ marginLeft: 'auto' }}>{ago(c.createdAt)}</Text>
            </View>
            <Text>{preview(c)}</Text>
            {!!c.reason && <Text variant="caption" color="textSecondary">Reason: {c.reason}{c.reportedBy ? ` — reported by ${c.reportedBy.name}` : ''}</Text>}
            {c.targetType === 'post' && c.target && (
              <Text variant="caption" color="accentText" onPress={() => router.push({ pathname: '/post/[id]', params: { id: c.targetId } })}>Open post</Text>
            )}
            {(tab === 'open' || tab === 'hidden') && (
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
                <View style={{ flex: 1 }}>
                  <Button
                    compact
                    label={c.targetType === 'user' ? 'Dismiss' : tab === 'hidden' || c.source === 'no_club_review' ? 'Publish' : 'Keep'}
                    loading={busy === c.id + 'approve'}
                    onPress={() => decide(c, 'approve')}
                  />
                </View>
                {c.targetType !== 'user' && tab === 'open' && (
                  <View style={{ flex: 1 }}>
                    <Button compact kind="secondary" label="Hide" loading={busy === c.id + 'hide'} onPress={() => decide(c, 'hide')} />
                  </View>
                )}
                {c.targetType !== 'user' && (
                  <View style={{ flex: 1 }}>
                    <Button compact kind="secondary" label="Remove" loading={busy === c.id + 'remove'} onPress={() => decide(c, 'remove')} />
                  </View>
                )}
              </View>
            )}
          </View>
        </Card>
      ))}
      {tab === 'open' && cases.some((c) => c.targetType === 'user') && <Text variant="caption" color="textMuted">Suspending an account is done by the Basky team in Admin → Users.</Text>}
    </Page>
  );
}
