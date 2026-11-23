'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Area, back, Choice, DistrictSelect, Page, Toggle } from '@/components/form';
import { Text } from '@/components/text';
import { getClubRaw, getOrgRaw } from '@/data/repo';
import { sendAnnouncement } from '@/data/manage';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';

const audienceLabel = {
  club_admins_in_area: 'Club owners and admins in our area',
  affiliated_members: 'Members of affiliated clubs',
  district_users: 'Everyone living in a district',
  followers: 'Our followers',
  club_members: 'Club members',
  everyone: 'Everyone on BaskyCLub',
} as const;
type Audience = keyof typeof audienceLabel;

/** Send an announcement (#65, #75): Alerts inbox + phone alert; optional pinned Official card in the feed. */
export default function Announce() {
  const { orgId, clubId } = useLocalSearchParams<{ orgId?: string; clubId?: string; as?: string }>();
  const org = orgId ? getOrgRaw(orgId) : undefined;
  const club = clubId ? getClubRaw(clubId) : undefined;
  const options: Audience[] = orgId ? ['affiliated_members', 'club_admins_in_area', 'district_users', 'followers'] : clubId ? ['club_members', 'followers'] : ['everyone', 'district_users'];
  const [audience, setAudience] = useState<Audience>(options[0]);
  const [district, setDistrict] = useState<string>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [inFeed, setInFeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const from = org?.name ?? club?.name ?? 'BaskyCLub team';
  const covered: string[] | undefined = org && org.level === 'district' ? org.coveredDistricts.map((d: { code: string }) => d.code) : undefined;

  const send = async () => {
    setBusy(true);
    try {
      const r = await sendAnnouncement({ senderOrgId: orgId, senderClubId: clubId, audience, districtCode: audience === 'district_users' ? district : undefined, title: title.trim(), body: body.trim(), showInFeed: inFeed });
      notify('Alert sent', r.pushed ? `Pushed to ${r.pushed} phone${r.pushed === 1 ? '' : 's'}.` : 'It is in their Alerts inbox.');
      back();
    } catch (e) {
      notify("Couldn't send", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Text variant="heading">Alert from {from}</Text>
      <Choice label="Send to" value={audience} onChange={setAudience} options={options.map((o) => ({ value: o, label: audienceLabel[o] }))} />
      {audience === 'district_users' && <DistrictSelect label="District" value={district} onChange={setDistrict} only={covered} />}
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="District league registrations open" maxLength={120} />
      <Area label="Message" value={body} onChangeText={setBody} placeholder="Details, dates, who to contact" />
      <Toggle label="Also show in the feed" sub={audience === 'club_members' ? 'As a members-only pinned card' : 'As a pinned Official card'} value={inFeed} onChange={setInFeed} />
      <Text variant="caption" color="textMuted">Alerts can't be liked or commented on. Up to 10 a day.</Text>
      <Button label="Send alert" loading={busy} disabled={title.trim().length < 3 || body.trim().length < 3 || (audience === 'district_users' && !district)} onPress={send} />
    </Page>
  );
}
