import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { Segmented } from '@/components/segmented';
import { SheetHeader } from '@/components/sheet-header';
import { LoginPromptBody } from '@/components/login-prompt';
import { Text } from '@/components/text';
import { createMatch, findPlayer, getUser } from '@/data/repo';
import { useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

/** Create a match room. Every player needs an account; only your phone scores. */
export default function NewMatch() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const [category, setCategory] = useState<'friendly' | 'practice'>('friendly');
  const [nameA, setNameA] = useState('Whites');
  const [nameB, setNameB] = useState('Darks');
  const [venue, setVenue] = useState('');
  const [teamA, setTeamA] = useState<string[]>(user ? [user.userId] : []);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [lookup, setLookup] = useState('');
  if (!user) return <LoginPromptBody reason="Log in to post or start a match room." />;

  const add = (side: 'A' | 'B') => {
    const p = findPlayer(lookup);
    if (!p) {
      Alert.alert('No account found', 'Every player needs a BaskyCLub account. Ask them to sign up with this number.');
      return;
    }
    if (teamA.includes(p.userId) || teamB.includes(p.userId)) return;
    Haptics.selectionAsync();
    (side === 'A' ? setTeamA : setTeamB)((t) => [...t, p.userId]);
    setLookup('');
  };

  const roster = (ids: string[], side: 'A' | 'B') => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {ids.map((id) => (
        <Pressable key={id} onPress={() => (side === 'A' ? setTeamA : setTeamB)((t) => t.filter((x) => x !== id))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 6, paddingRight: 10, borderRadius: radius.full, backgroundColor: c.fill }}>
          <Avatar name={getUser(id)?.name ?? '?'} size={22} />
          <Text variant="caption" style={{ fontFamily: fonts.bodySemi }}>{getUser(id)?.name.split(' ')[0]}</Text>
          <Icon ios="xmark" android="close" size={10} color={c.textMuted} weight="bold" />
        </Pressable>
      ))}
      {ids.length === 0 && <Text variant="caption" color="textMuted">No players yet</Text>}
    </View>
  );

  const start = () => {
    const id = createMatch({ userId: user.userId, category, nameA: nameA.trim() || 'Team A', nameB: nameB.trim() || 'Team B', venue: venue.trim(), playersA: teamA, playersB: teamB });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
    router.push({ pathname: '/match/[id]', params: { id } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SheetHeader title="New match room" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Segmented value={category} onChange={setCategory} options={[{ value: 'friendly', label: 'Friendly' }, { value: 'practice', label: 'Practice' }]} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><Field label="Side A" value={nameA} onChangeText={setNameA} /></View>
          <View style={{ flex: 1 }}><Field label="Side B" value={nameB} onChangeText={setNameB} /></View>
        </View>
        <Field label="Court" value={venue} onChangeText={setVenue} placeholder="e.g. Besant Nagar beach court" />
        <View style={{ gap: space.sm }}>
          <Field label="Add a player" value={lookup} onChangeText={setLookup} placeholder="Mobile number or name" hint="Try “Arjun”, “Vikram” or “Meera” in this prototype." />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><Button compact kind="secondary" label={`Add to ${nameA || 'A'}`} onPress={() => add('A')} disabled={!lookup.trim()} /></View>
            <View style={{ flex: 1 }}><Button compact kind="secondary" label={`Add to ${nameB || 'B'}`} onPress={() => add('B')} disabled={!lookup.trim()} /></View>
          </View>
        </View>
        <View style={{ gap: space.sm }}>
          <Text variant="subheading">{nameA || 'Side A'}</Text>
          {roster(teamA, 'A')}
        </View>
        <View style={{ gap: space.sm }}>
          <Text variant="subheading">{nameB || 'Side B'}</Text>
          {roster(teamB, 'B')}
        </View>
        <Text variant="caption" color="textMuted">Sides are temporary for this game. Only your phone can score; you can hand scoring over later.</Text>
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md }}>
        <Button label="Start match room" onPress={start} />
      </View>
    </KeyboardAvoidingView>
  );
}
