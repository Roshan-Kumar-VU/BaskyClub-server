import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { locateDistrict } from '@/lib/location';
import { useScope } from '@/lib/scope';
import { space, useTheme } from '@/theme';

/** Explain first, then the system prompt. Only the district code is saved. */
export default function LocationExplainer() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { chooseDistrict } = useScope();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    const r = await locateDistrict();
    setBusy(false);
    if (r.ok) {
      chooseDistrict(r.districtCode);
      router.back();
      return;
    }
    setMsg(r.reason === 'denied' ? 'Location is off for BaskyCLub. Pick your district instead.' : "We couldn't match your location to a district. Pick it from the list.");
  };

  return (
    <View style={{ backgroundColor: c.card, padding: space.xl, paddingBottom: insets.bottom + space.xl, gap: space.md }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: space.md }}>
        <Icon ios="location.fill" android="near_me" size={26} color={c.accent} />
      </View>
      <Text variant="title" style={{ textAlign: 'center' }}>Find your district</Text>
      <Text color="textSecondary" style={{ textAlign: 'center' }}>
        We use your location once to work out your district. We save only the district — never your exact location.
      </Text>
      {msg && <Text variant="bodyStrong" color="accentText" style={{ textAlign: 'center' }}>{msg}</Text>}
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {!msg && <Button label="Allow location" loading={busy} onPress={go} />}
        <Button label="Pick district instead" kind={msg ? 'primary' : 'secondary'} onPress={() => { router.back(); router.push('/district-picker'); }} />
      </View>
    </View>
  );
}
