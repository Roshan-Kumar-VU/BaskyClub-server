'use no memo';

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Card, Page, Row } from '@/components/form';
import { Text } from '@/components/text';
import { getOrgRaw } from '@/data/repo';
import { updateOrg } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

/**
 * Association tools (#59–#66). Owner/admin (and the Basky team): official posts, alerts, page, team,
 * office bearers, Media/Legacy, affiliations. Association members are read-only (PRD §2).
 */
export default function ManageAssociation() {
  useStoreVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = getOrgRaw(id);
  const [f, setF] = useState({ contactEmail: '', contactPhone: '', address: '', website: '', registrationNo: '' });
  const [init, setInit] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (org && !init) {
      setF({ contactEmail: org.contactEmail ?? '', contactPhone: org.contactPhone ?? '', address: org.address ?? '', website: org.website ?? '', registrationNo: org.registrationNo ?? '' });
      setInit(true);
    }
  }, [org, init]);

  if (!org) return null;
  const v = org.viewer as { canManage: boolean; canPostOfficially: boolean; accessLevel: string | null };
  if (!v.canManage && !v.canPostOfficially) return <EmptyState ios="lock.fill" android="lock" title="Owners and admins only" body="Association members are listed on the page but can't change it." />;
  const go = (path: 'team' | 'bearers' | 'legacy' | 'affiliations' | 'post') => router.push({ pathname: `/association/[id]/${path}`, params: { id } });
  const set = (k: keyof typeof f) => (val: string) => setF((x) => ({ ...x, [k]: val }));

  const save = async () => {
    setBusy(true);
    try {
      await updateOrg(id, { contactEmail: f.contactEmail.trim() || null, contactPhone: f.contactPhone.trim() || null, address: f.address.trim() || null, website: f.website.trim() || null, registrationNo: f.registrationNo.trim() || null });
      notify('Saved');
    } catch (e) {
      notify("Couldn't save", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Text variant="heading">{org.name}</Text>
      <Text variant="caption" color="textMuted">Your access: {v.accessLevel ?? 'BaskyCLub team'} · Page: {org.pageLabel}</Text>
      <Card title="Share news">
        <Row first label="Post as the association" sub="Shows on the page and in feeds" onPress={() => go('post')} />
        <Row label="Send an alert" sub="Club admins, affiliated members, a district, followers" onPress={() => router.push({ pathname: '/announce', params: { orgId: id } })} />
      </Card>
      {v.canManage && (
        <>
          <Card title="Run the page">
            <Row first label="Office bearers" sub="Titles and terms shown on the page" onPress={() => go('bearers')} />
            <Row label="Media / Legacy" sub="History, records, photos, videos" onPress={() => go('legacy')} />
            <Row label="Affiliated clubs" sub="Requests, invites, renewals" onPress={() => go('affiliations')} />
            <Row label="Association team" sub="Who can use these tools" onPress={() => go('team')} />
          </Card>
          <Card title="Contact details">
            <View style={{ padding: space.lg, gap: space.md }}>
              <Field label="Email" value={f.contactEmail} onChangeText={set('contactEmail')} keyboardType="email-address" autoCapitalize="none" />
              <Field label="Phone" value={f.contactPhone} onChangeText={set('contactPhone')} keyboardType="phone-pad" />
              <Field label="Address" value={f.address} onChangeText={set('address')} />
              <Field label="Website" value={f.website} onChangeText={set('website')} placeholder="https://" autoCapitalize="none" />
              <Field label="Registration number" value={f.registrationNo} onChangeText={set('registrationNo')} />
              <Button label="Save details" loading={busy} onPress={save} />
            </View>
          </Card>
        </>
      )}
    </Page>
  );
}
