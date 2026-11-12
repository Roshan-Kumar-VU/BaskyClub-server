'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Card, Choice, DistrictSelect, Page, Row } from '@/components/form';
import { Text } from '@/components/text';
import { createOrg, getAllOrgs, updateOrg } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

const statusLabel = { draft: 'Draft (hidden)', published: 'Managed by BaskyCLub', claimed: 'Official (run by them)' } as const;

/** Basky team: create associations (start as hidden drafts), publish them, hand them over (#59, #60). */
export default function AdminAssociations() {
  useStoreVersion();
  const orgs = getAllOrgs();
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [level, setLevel] = useState<'district' | 'state' | 'national' | 'league_operator'>('district');
  const [district, setDistrict] = useState<string>();
  const [busy, setBusy] = useState(false);
  const tnba = orgs.find((o) => o.level === 'state' && o.stateCode === 'TN');

  const create = async () => {
    setBusy(true);
    try {
      const r = await createOrg({
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        level,
        stateCode: level === 'district' || level === 'state' ? 'TN' : undefined,
        parentId: level === 'district' ? tnba?.id : undefined,
        districtCodes: level === 'district' && district ? [district] : [],
      });
      setName('');
      setShortName('');
      notify('Created as a draft', 'Publish it below when the page is ready.');
      router.push({ pathname: '/association/[id]/manage', params: { id: r.id } });
    } catch (e) {
      notify("Couldn't create", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (id: string, pageStatus: string) => updateOrg(id, { pageStatus }).catch((e) => notify('Error', errorMessage(e)));

  return (
    <Page>
      <Card title={`Associations (${orgs.length})`}>
        {orgs.map((o, i) => (
          <View key={o.id}>
            <Row first={i === 0} label={o.name} sub={`${o.level}${o.stateCode ? ` · ${o.stateCode}` : ''}`} right={<Tag label={statusLabel[o.pageStatus as keyof typeof statusLabel]} />} onPress={() => router.push({ pathname: '/association/[id]/manage', params: { id: o.id } })} />
            <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md }}>
              {o.pageStatus !== 'published' && <Button compact kind="secondary" label="Publish" onPress={() => setStatus(o.id, 'published')} />}
              {o.pageStatus !== 'claimed' && <Button compact kind="secondary" label="Mark as official" onPress={() => setStatus(o.id, 'claimed')} />}
              {o.pageStatus !== 'draft' && <Button compact kind="ghost" label="Back to draft" onPress={() => setStatus(o.id, 'draft')} />}
            </View>
          </View>
        ))}
      </Card>
      <Card title="Create an association">
        <View style={{ padding: space.lg, gap: space.md }}>
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Ranipet District Basketball Association" />
          <Field label="Short name" value={shortName} onChangeText={setShortName} placeholder="Ranipet DBA" />
          <Choice label="Level" value={level} onChange={setLevel} options={[{ value: 'district', label: 'District' }, { value: 'state', label: 'State' }, { value: 'national', label: 'National' }, { value: 'league_operator', label: 'League operator' }]} />
          {level === 'district' && <DistrictSelect label="Covers district" value={district} onChange={setDistrict} />}
          <Text variant="caption" color="textMuted">New associations start as hidden drafts{level === 'district' ? ', under TNBA' : ''}. Add the owner from its Manage page.</Text>
          <Button label="Create" loading={busy} disabled={name.trim().length < 3 || (level === 'district' && !district)} onPress={create} />
        </View>
      </Card>
    </Page>
  );
}
