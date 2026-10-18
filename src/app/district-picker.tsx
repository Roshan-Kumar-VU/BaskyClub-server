import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { SheetHeader } from '@/components/sheet-header';
import { Text } from '@/components/text';
import { getDistrictsOfState, getStates } from '@/data/repo';
import { useScope } from '@/lib/scope';
import { fonts, radius, space, useTheme } from '@/theme';

/** State → District picker. Choosing a district switches the scope to District. */
export default function DistrictPicker() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { chooseDistrict, districtCode } = useScope();
  const [state, setState] = useState<{ code: string; name: string } | null>(null);
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const states = getStates().filter((s) => !query || s.name.toLowerCase().includes(query));
  const districts = state ? getDistrictsOfState(state.code).filter((d) => !query || [d.name, ...(d.altNames ?? [])].some((n) => n.toLowerCase().includes(query))) : [];

  const row = (key: string, label: string, sub: string | undefined, selected: boolean, onPress: () => void) => (
    <Pressable key={key} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 14, backgroundColor: pressed ? c.fill : c.card })}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {sub && <Text variant="caption" color="textMuted">{sub}</Text>}
      </View>
      {selected ? <Icon ios="checkmark" android="check" size={16} color={c.accent} weight="bold" /> : <Icon ios="chevron.right" android="chevron_right" size={13} color={c.textMuted} />}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <SheetHeader title={state ? state.name : 'Choose your state'} />
      {state && (
        <Pressable onPress={() => { setState(null); setQ(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <Icon ios="chevron.left" android="chevron_left" size={13} color={c.accent} weight="bold" />
          <Text variant="caption" color="accentText" style={{ fontFamily: fonts.bodyBold }}>All states</Text>
        </Pressable>
      )}
      <View style={{ marginHorizontal: space.lg, marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: c.fill }}>
        <Icon ios="magnifyingglass" android="search" size={16} color={c.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder={state ? 'Search districts' : 'Search states'} placeholderTextColor={c.textMuted} selectionColor={c.accent} style={{ flex: 1, color: c.text, fontFamily: fonts.bodyMedium, fontSize: 15 }} />
      </View>
      <FlashList
        data={(state ? districts : states) as ({ code: string; name: string; count?: number; stateCode?: string; altNames?: string[] })[]}
        keyExtractor={(x) => x.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
        ItemSeparatorComponent={() => <View style={{ height: 0.5, marginLeft: space.lg, backgroundColor: c.line }} />}
        renderItem={({ item }) =>
          state
            ? row(item.code, item.name, item.altNames?.join(', '), item.code === districtCode, () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                chooseDistrict(item.code);
                router.back();
              })
            : row(item.code, item.name, `${item.count} ${item.count === 1 ? 'district' : 'districts'}`, false, () => {
                setState({ code: item.code, name: item.name });
                setQ('');
              })
        }
      />
    </View>
  );
}
