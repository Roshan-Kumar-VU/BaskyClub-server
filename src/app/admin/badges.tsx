'use no memo';

import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Card, Page, PersonPicker, Row } from '@/components/form';
import { getClubs } from '@/data/repo';
import { getBadges, giveBadge, revokeBadge } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

/** "Verified by BaskyCLub" for clubs/academies (#35) and "Creator" for people (#73). */
export default function AdminBadges() {
  useStoreVersion();
  const [clubQ, setClubQ] = useState('');
  const badges = getBadges();
  const clubs = clubQ.length >= 2 ? getClubs({ scope: 'india', districtCode: null }, 'all', clubQ).filter((c) => c.kind === 'club' || c.kind === 'academy') : [];
  const run = (p: Promise<unknown>) => p.catch((e) => notify('Error', errorMessage(e)));

  return (
    <Page>
      <Card title={`Active badges (${badges.length})`}>
        {badges.map((b, i) => (
          <Row key={b.id} first={i === 0} label={b.club?.name ?? b.user?.name ?? '—'} sub={b.badge === 'creator' ? 'Creator' : 'Verified by BaskyCLub'} right={<Button compact kind="secondary" label="Remove" onPress={() => run(revokeBadge(b.id))} />} />
        ))}
      </Card>
      <Card title="Verify a club or academy">
        <View style={{ padding: space.lg, gap: space.sm }}>
          <Field label="Search clubs" value={clubQ} onChange={undefined} onChangeText={setClubQ} placeholder="Type 2+ letters" />
          {clubs.map((c) => (
            <Row key={c.clubId} label={c.name} sub={`${c.districtName ?? ''}${c.verified ? ' · already verified' : ''}`} right={c.verified ? undefined : <Button compact label="Verify" onPress={() => run(giveBadge({ badge: 'basky_verified', clubId: c.clubId }))} />} />
          ))}
        </View>
      </Card>
      <Card title="Make someone a Creator">
        <View style={{ padding: space.lg }}>
          <PersonPicker label="Person" onPick={(p) => run(giveBadge({ badge: 'creator', userId: p.id }).then(() => notify(`${p.name} is now a Creator`)))} />
        </View>
      </Card>
    </Page>
  );
}

