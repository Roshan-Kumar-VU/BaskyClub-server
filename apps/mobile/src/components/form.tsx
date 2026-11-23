'use no memo';

/** Building blocks for settings, manage and admin screens. */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { get } from '@/data/api';
import { getDistrictsOfState } from '@/data/repo';
import { fonts, radius, space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { Icon } from './icon';
import { Text } from './text';

/** Scrollable page with standard padding. */
export function Page({ children, gap = space.lg }: { children: React.ReactNode; gap?: number }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap, paddingBottom: insets.bottom + space.xxl * 2 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** A white card that groups related rows. */
export function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {title && <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>}
      <View style={{ backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

/** Tappable row with a label, optional sub-text and value, and a chevron. */
export function Row({ label, sub, value, onPress, danger, first, right }: { label: string; sub?: string; value?: string; onPress?: () => void; danger?: boolean; first?: boolean; right?: React.ReactNode }) {
  const { c } = useTheme();
  const box = { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 52, borderTopWidth: first ? 0 : 0.5, borderTopColor: c.line } as const;
  const inside = (
    <>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" style={{ color: danger ? c.live : c.text }}>{label}</Text>
        {!!sub && <Text variant="caption" color="textMuted">{sub}</Text>}
      </View>
      {!!value && <Text color="textMuted">{value}</Text>}
      {right}
      {onPress && !right && <Icon ios="chevron.right" android="chevron_right" size={13} color={c.textMuted} />}
    </>
  );
  // A row that holds its own buttons is a plain box (a button can't sit inside a button).
  if (!onPress) return <View accessibilityLabel={label} style={box}>{inside}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ ...box, backgroundColor: pressed ? c.fill : 'transparent' })}>
      {inside}
    </Pressable>
  );
}

/** On/off switch with a label. */
export function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {!!sub && <Text variant="caption" color="textMuted">{sub}</Text>}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.fill }} />
    </View>
  );
}

/** Pick one of several options (wraps onto more lines if needed). */
export function Choice<T extends string>({ label, options, value, onChange }: { label?: string; options: { value: T; label: string }[]; value: T | undefined; onChange: (v: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>{label}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.label} onPress={() => onChange(o.value)} style={{ paddingHorizontal: 14, height: 36, justifyContent: 'center', borderRadius: radius.full, borderWidth: 1.5, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : c.card }}>
              <Text variant="caption" style={{ fontFamily: fonts.bodyBold }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Multi-line text field. */
export function Area({ label, value, onChangeText, placeholder, max = 2000 }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; max?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        multiline
        maxLength={max}
        style={{ minHeight: 96, padding: space.md, borderRadius: radius.md + 2, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.card, color: c.text, fontFamily: fonts.body, fontSize: 16, textAlignVertical: 'top' }}
      />
    </View>
  );
}

export type Person = { id: string; name: string; photoUrl?: string | null; homeDistrictCode?: string | null };

/** Search people by name or phone and pick one. */
export function PersonPicker({ label, onPick, exclude = [] }: { label: string; onPick: (p: Person) => void; exclude?: string[] }) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setPeople([]);
      return;
    }
    const t = setTimeout(() => {
      get<{ people: Person[] }>(`/api/users?q=${encodeURIComponent(q.trim())}`).then((r) => setPeople(r.people)).catch(() => setPeople([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>{label}</Text>
      <TextInput accessibilityLabel={label} value={q} onChangeText={setQ} placeholder="Name or mobile number" placeholderTextColor={c.textMuted} autoCapitalize="words" style={{ height: 48, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.card, color: c.text, fontFamily: fonts.bodyMedium, fontSize: 15 }} />
      {people.filter((p) => !exclude.includes(p.id)).map((p) => (
        <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Choose ${p.name}`} onPress={() => { onPick(p); setQ(''); setPeople([]); }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm }}>
          <Avatar name={p.name} uri={p.photoUrl ?? undefined} size={32} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>{p.name}</Text>
          <Text variant="caption" color="textMuted">{p.homeDistrictCode?.replace(/^[A-Z]{2}-/, '') ?? ''}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Choose a district (Tamil Nadu first; type to search any state's districts). */
export function DistrictSelect({ label, value, onChange, stateCode = 'TN', only }: { label: string; value?: string; onChange: (code: string) => void; stateCode?: string; only?: string[] }) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const all = only ? getDistrictsOfState(stateCode).filter((d) => only.includes(d.code)) : getDistrictsOfState(stateCode);
  const list = q ? all.filter((d) => d.name.toLowerCase().includes(q.toLowerCase())) : all;
  const chosen = all.find((d) => d.code === value);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>{label}{chosen ? `: ${chosen.name}` : ''}</Text>
      {all.length > 8 && <TextInput accessibilityLabel={`Search ${label}`} value={q} onChangeText={setQ} placeholder="Search districts" placeholderTextColor={c.textMuted} style={{ height: 44, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.card, color: c.text, fontFamily: fonts.bodyMedium }} />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {list.slice(0, q ? 12 : only ? 40 : 10).map((d) => (
          <Pressable key={d.code} accessibilityRole="radio" accessibilityLabel={d.name} onPress={() => onChange(d.code)} style={{ paddingHorizontal: 12, height: 34, justifyContent: 'center', borderRadius: radius.full, borderWidth: 1.5, borderColor: d.code === value ? c.accent : c.line, backgroundColor: d.code === value ? c.accentSoft : c.card }}>
            <Text variant="caption" style={{ fontFamily: fonts.bodySemi }}>{d.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Small "back to" helper for screens opened as pages. */
export const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
