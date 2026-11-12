'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Area, Choice, DistrictSelect, Page, Toggle } from '@/components/form';
import { LoginPromptBody } from '@/components/login-prompt';
import { Text } from '@/components/text';
import { registerClub } from '@/data/manage';
import { notify } from '@/lib/notify';
import { useScope } from '@/lib/scope';
import { errorMessage, useSession } from '@/lib/session';

const positions = [{ value: 'PG', label: 'PG' }, { value: 'SG', label: 'SG' }, { value: 'SF', label: 'SF' }, { value: 'PF', label: 'PF' }, { value: 'C', label: 'C' }] as const;

/** Register a club or academy. It waits for BaskyCLub approval; you become its owner. */
export default function NewClub() {
  const { user } = useSession();
  const { districtCode } = useScope();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'club' | 'academy'>('club');
  const [district, setDistrict] = useState<string | undefined>(user?.homeDistrictCode ?? districtCode ?? undefined);
  const [description, setDescription] = useState('');
  const [motto, setMotto] = useState('');
  const [iPlay, setIPlay] = useState(true);
  const [position, setPosition] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (!user) return <LoginPromptBody reason="Log in to register a club." />;
  if (user.isMinor) return <Page><Text variant="heading">Clubs are registered by adults</Text><Text color="textSecondary">Ask your coach or a parent to register the club; they can add you as a member.</Text></Page>;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await registerClub({ name: name.trim(), kind, districtCode: district!, description: description.trim() || undefined, motto: motto.trim() || undefined, iPlay, primaryPosition: iPlay ? position : undefined });
      notify('Club registered', 'The BaskyCLub team will review it. You can already set it up from Manage club.');
      router.replace({ pathname: '/club/[id]', params: { id: r.id } });
    } catch (e) {
      notify("Couldn't register the club", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Field label="Club name" value={name} onChangeText={setName} placeholder="e.g. Gudiyatham Giants" />
      <Choice label="Type" value={kind} onChange={setKind} options={[{ value: 'club', label: 'Club' }, { value: 'academy', label: 'Academy' }]} />
      <DistrictSelect label="District" value={district} onChange={setDistrict} />
      <Field label="Motto (optional)" value={motto} onChangeText={setMotto} placeholder="Defend the fort" />
      <Area label="About the club (optional)" value={description} onChangeText={setDescription} placeholder="Where you play, who can join" />
      <Toggle label="I play for this club" value={iPlay} onChange={setIPlay} />
      {iPlay && <Choice label="Your position" value={position} onChange={setPosition} options={positions.map((p) => ({ ...p }))} />}
      <Text variant="caption" color="textMuted">New clubs are checked by the BaskyCLub team before they appear in search.</Text>
      <Button label="Register club" loading={busy} disabled={name.trim().length < 2 || !district} onPress={submit} />
    </Page>
  );
}
