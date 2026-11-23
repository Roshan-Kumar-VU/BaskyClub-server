'use no memo';

import { fits, LIMITS } from '@baskyclub/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { CourtMap } from '@/components/court-map';
import { Field } from '@/components/field';
import { Card, Choice, Row, Toggle } from '@/components/form';
import { Text } from '@/components/text';
import { getMap, suggestCourt } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { notify } from '@/lib/notify';
import { useScope } from '@/lib/scope';
import { errorMessage, useSession } from '@/lib/session';
import { space, useTheme } from '@/theme';

/** Clubs-tab map: approved clubs and courts in your district (or All India: Vellore area by default). */
export default function MapScreen() {
  useStoreVersion();
  const { c } = useTheme();
  const s = useScope();
  const { user, requireLogin } = useSession();
  const district = s.districtCode ?? 'TN-VELLORE';
  const data = getMap({ districtCode: district });
  const [view, setView] = useState<'map' | 'list'>('map');
  const [adding, setAdding] = useState(false);
  const [court, setCourt] = useState({ name: '', address: '', lat: '', lng: '', indoor: false });

  const pins = [...data.clubs, ...data.courts];
  const center = pins[0] ? { latitude: pins[0].latitude, longitude: pins[0].longitude } : { latitude: 12.9165, longitude: 79.1325 };

  const submit = async () => {
    try {
      await suggestCourt({ name: court.name.trim(), districtCode: district, latitude: Number(court.lat), longitude: Number(court.lng), address: court.address.trim() || undefined, indoor: court.indoor });
      notify('Thanks!', 'The BaskyCLub team will check the court before it shows on the map.');
      setAdding(false);
      setCourt({ name: '', address: '', lat: '', lng: '', indoor: false });
    } catch (e) {
      notify("Couldn't add the court", errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ padding: space.md }}>
        <Choice value={view} onChange={setView} options={[{ value: 'map', label: 'Map' }, { value: 'list', label: `List (${pins.length})` }]} />
      </View>
      {view === 'map' && <View style={Platform.OS === 'web' ? undefined : { height: 360 }}><CourtMap clubs={data.clubs} courts={data.courts} center={center} /></View>}
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 }}>
        <Card title={`Clubs (${data.clubs.length})`}>
          {data.clubs.map((x, i) => <Row key={x.id} first={i === 0} label={x.name} sub={x.kind} onPress={() => router.push({ pathname: '/club/[id]', params: { id: x.id } })} />)}
        </Card>
        <Card title={`Courts (${data.courts.length})`}>
          {data.courts.map((x, i) => <Row key={x.id} first={i === 0} label={x.name} sub={x.address ?? ''} right={<Tag label={x.indoor ? 'Indoor' : 'Outdoor'} />} />)}
        </Card>
        {!adding ? (
          <Button kind="secondary" label="Suggest a court" onPress={() => requireLogin(() => setAdding(true))} />
        ) : (
          <Card title="Suggest a court">
            <View style={{ padding: space.lg, gap: space.md }}>
              <Field label="Court name" value={court.name} onChangeText={(v) => setCourt((x) => ({ ...x, name: v }))} maxLength={LIMITS.courtName.max} />
              <Field label="Address" value={court.address} onChangeText={(v) => setCourt((x) => ({ ...x, address: v }))} />
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <View style={{ flex: 1 }}><Field label="Latitude" value={court.lat} onChangeText={(v) => setCourt((x) => ({ ...x, lat: v }))} keyboardType="decimal-pad" placeholder="12.9165" /></View>
                <View style={{ flex: 1 }}><Field label="Longitude" value={court.lng} onChangeText={(v) => setCourt((x) => ({ ...x, lng: v }))} keyboardType="decimal-pad" placeholder="79.1325" /></View>
              </View>
              <Toggle label="Indoor court" value={court.indoor} onChange={(v) => setCourt((x) => ({ ...x, indoor: v }))} />
              <Text variant="caption" color="textMuted">Tip: long-press the spot in Google Maps to copy its latitude and longitude.</Text>
              <Button label="Send for review" disabled={!user || !fits(court.name, LIMITS.courtName) || !court.lat || !court.lng} onPress={submit} />
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
