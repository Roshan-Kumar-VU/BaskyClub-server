'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { Card, Page } from '@/components/form';
import { Text } from '@/components/text';
import { getAssociationForDistrict, getClubRaw, getDistrict } from '@/data/repo';
import { decideAffiliation, endAffiliation, getClubAffiliations, requestAffiliation } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** The club's yearly link to its district association (#58, #69). "Affiliated" shows while it's active and in date. */
export default function ClubAffiliation() {
  useStoreVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const club = getClubRaw(id);
  const rows = getClubAffiliations(id);
  if (!club) return null;
  const district = getDistrict(club.districtCode);
  const assoc = getAssociationForDistrict(club.districtCode);
  const open = rows.find((r) => r.status === 'pending' || r.status === 'active');
  const run = (p: Promise<unknown>, done?: string) => p.then(() => done && notify(done)).catch((e) => notify('Error', errorMessage(e)));

  return (
    <Page>
      {assoc ? (
        <Card>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Text variant="caption" color="textMuted">{district?.name} is covered by</Text>
            <Text variant="subheading">{assoc.name}</Text>
            {!open && club.status === 'approved' && <Button label="Ask to affiliate" onPress={() => run(requestAffiliation(id, assoc.id), 'Request sent to the association')} />}
            {club.status !== 'approved' && <Text variant="caption" color="textMuted">The club must be approved by BaskyCLub first.</Text>}
          </View>
        </Card>
      ) : (
        <Text color="textMuted">No district association for {district?.name ?? 'this district'} is on BaskyCLub yet.</Text>
      )}
      {rows.map((r) => (
        <Card key={r.id}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>{r.organization.shortName ?? r.organization.name}</Text>
              <Tag label={r.status} />
            </View>
            <Text variant="caption" color="textMuted">{r.startedBy === 'association' ? 'Invited by the association' : `Asked by ${r.requestedBy?.name ?? 'the club'}`}{r.tnbaNumber ? ` · ${r.tnbaNumber}` : ''}{r.validUntil ? ` · valid until ${fmt(r.validUntil)}` : ''}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {r.status === 'pending' && r.startedBy === 'association' && <Button compact label="Accept invite" onPress={() => run(decideAffiliation(r.id, 'approve'), 'Affiliated')} />}
              {r.status === 'pending' && r.startedBy === 'association' && <Button compact kind="secondary" label="Decline" onPress={() => run(decideAffiliation(r.id, 'reject'))} />}
              {(r.status === 'pending' || r.status === 'active') && (
                <Button compact kind="ghost" label={r.status === 'pending' ? 'Withdraw' : 'End affiliation'} onPress={() => confirm(r.status === 'pending' ? 'Withdraw the request?' : 'End the affiliation?', 'The Affiliated badge goes away.', 'Yes', () => run(endAffiliation(r.id)))} />
              )}
            </View>
          </View>
        </Card>
      ))}
    </Page>
  );
}
