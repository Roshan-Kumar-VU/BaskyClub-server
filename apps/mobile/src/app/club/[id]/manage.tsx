'use no memo';

import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Area, Card, Page, Row, Toggle } from '@/components/form';
import { Text } from '@/components/text';
import { uploadPhoto } from '@/data/api';
import { getClubMembersRaw, getClubRaw } from '@/data/repo';
import { transferClub, updateClub } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

/** Manage club (owner, admins, Basky team): details, people, practice hours, affiliation, alerts, hand over. */
export default function ManageClub() {
  useStoreVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const club = getClubRaw(id);
  const members = getClubMembersRaw(id);
  const [f, setF] = useState({ name: '', motto: '', description: '', logoUrl: '', bannerUrl: '' });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keepAdmin, setKeepAdmin] = useState(true);

  useEffect(() => {
    if (club && !loaded) {
      setF({ name: club.name, motto: club.motto ?? '', description: club.description ?? '', logoUrl: club.logoUrl ?? '', bannerUrl: club.bannerUrl ?? '' });
      setLoaded(true);
    }
  }, [club, loaded]);

  if (!club) return null;
  if (!club.viewer.canManage) return <EmptyState ios="lock.fill" android="lock" title="Owners and admins only" />;
  const isOwner = club.viewer.isOwner;
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const pick = async (k: 'logoUrl' | 'bannerUrl') => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: k === 'logoUrl' ? [1, 1] : [16, 9] });
    if (r.canceled) return;
    try {
      const url = await uploadPhoto(r.assets[0].uri);
      setF((x) => ({ ...x, [k]: url }));
    } catch (e) {
      notify("Couldn't upload", errorMessage(e));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateClub(id, { name: f.name.trim(), motto: f.motto.trim() || null, description: f.description.trim() || null, logoUrl: f.logoUrl || null, bannerUrl: f.bannerUrl || null });
      notify('Saved');
    } catch (e) {
      notify("Couldn't save", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const adults = members.filter((m) => !m.roles.includes('owner'));
  const handOver = (m: (typeof members)[number]) =>
    confirm(`Hand ${club.name} over to ${m.user.name}?`, keepAdmin ? 'You stay on as an admin.' : 'You will no longer have any role in the club.', 'Hand over', () =>
      transferClub(id, m.user.id, keepAdmin).then(() => notify(`${m.user.name} now owns the club`)).catch((e) => notify("Couldn't hand over", errorMessage(e))),
    );

  return (
    <Page>
      {club.status !== 'approved' && (
        <Card><View style={{ padding: space.lg }}><Text variant="bodyStrong">Status: {club.status === 'pending' ? 'waiting for BaskyCLub approval' : 'suspended'}</Text><Text variant="caption" color="textMuted">Only you and the BaskyCLub team can see the club until it's approved.</Text></View></Card>
      )}
      <Card>
        <Row first label="People and roles" sub="Positions, coach/referee, admins, captain, remove" onPress={() => router.push({ pathname: '/club/[id]/members', params: { id } })} />
        <Row label="Join requests" onPress={() => router.push({ pathname: '/club/[id]/requests', params: { id } })} />
        <Row label="Practice hours" onPress={() => router.push({ pathname: '/club/[id]/timings', params: { id } })} />
        <Row label="Association affiliation" sub={club.affiliatedTo ? `Affiliated to ${club.affiliatedTo.shortName ?? club.affiliatedTo.name}` : 'Not affiliated'} onPress={() => router.push({ pathname: '/club/[id]/affiliation', params: { id } })} />
        <Row label="Send an alert" sub="To members or followers" onPress={() => router.push({ pathname: '/announce', params: { clubId: id } })} />
      </Card>

      <Card title="Club details">
        <View style={{ padding: space.lg, gap: space.md }}>
          <Field label="Name" value={f.name} onChangeText={set('name')} />
          <Field label="Motto" value={f.motto} onChangeText={set('motto')} />
          <Area label="About" value={f.description} onChangeText={set('description')} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button compact kind="secondary" label={f.logoUrl ? 'Change logo' : 'Add logo'} onPress={() => pick('logoUrl')} />
            <Button compact kind="secondary" label={f.bannerUrl ? 'Change banner' : 'Add banner'} onPress={() => pick('bannerUrl')} />
          </View>
          <Button label="Save details" loading={saving} disabled={f.name.trim().length < 2} onPress={save} />
        </View>
      </Card>

      {isOwner && (
        <Card title="Hand over the club">
          <View style={{ padding: space.lg, gap: space.md }}>
            <Text variant="caption" color="textMuted">The new owner must be an adult member. You can only leave the club after handing it over.</Text>
            <Toggle label="Stay on as an admin" value={keepAdmin} onChange={setKeepAdmin} />
            {adults.map((m) => (
              <Row key={m.id} label={m.user.name} sub={m.roles.join(', ') || (m.isPlayer ? 'Player' : 'Member')} right={<Button compact kind="secondary" label="Make owner" onPress={() => handOver(m)} />} />
            ))}
          </View>
        </Card>
      )}
    </Page>
  );
}
