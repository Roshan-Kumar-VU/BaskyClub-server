// Reads live data from the repository cache: opt out of React Compiler memoisation so updates show.
'use no memo';

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { LoginPromptBody } from '@/components/login-prompt';
import { Segmented } from '@/components/segmented';
import { SheetHeader } from '@/components/sheet-header';
import { Text } from '@/components/text';
import { youtubeId } from '@/components/youtube-card';
import { createPost, getDistrict, getMyClubs } from '@/data/repo';
import { notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import type { Visibility } from '@/types/models';
import { fonts, radius, space, useTheme } from '@/theme';

const MAX_PHOTOS = 10;

/**
 * New post: up to 10 photos and/or one YouTube link. Posting as a club lets
 * you choose who sees it (public / club page / members). District is filled
 * automatically. No club → reviewed by the BaskyCLub team (#41).
 */
export default function NewPost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const clubs = getMyClubs(user?.userId);
  const [clubId, setClubId] = useState<string | undefined>(clubs[0]?.clubId);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [text, setText] = useState('');
  const [images, setImages] = useState<{ uri: string; ratio: number }[]>([]);
  const [yt, setYt] = useState('');
  const [sending, setSending] = useState(false);
  if (!user) return <LoginPromptBody reason="Log in to share a post." />;

  const club = clubs.find((x) => x.clubId === clubId);
  const district = getDistrict(club?.districtCode ?? user.homeDistrictCode);
  const ytValid = !yt.trim() || !!youtubeId(yt.trim());

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - images.length });
    if (!r.canceled) setImages((cur) => [...cur, ...r.assets.map((a) => ({ uri: a.uri, ratio: a.width / Math.max(1, a.height) }))].slice(0, MAX_PHOTOS));
  };

  const share = async () => {
    setSending(true);
    try {
      const res = await createPost({ userId: user.userId, clubId, content: text.trim(), visibility, images, youtube: yt.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      if (res.moderationStatus === 'in_review') notify('Sent for review', 'Posts from accounts without a club are checked by the BaskyCLub team before they appear.');
    } catch (e) {
      notify("Couldn't share the post", errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const asOption = (id: string | undefined, label: string) => {
    const active = clubId === id;
    return (
      <Pressable key={label} onPress={() => { setClubId(id); if (!id) setVisibility('public'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 8, paddingRight: 14, borderRadius: radius.full, borderWidth: 1.5, borderColor: active ? c.accent : c.line, backgroundColor: active ? c.accentSoft : c.card }}>
        <Avatar name={label} size={24} square={!!id} />
        <Text variant="caption" style={{ fontFamily: fonts.bodyBold }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SheetHeader title="New post" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space.sm }}>
          <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>Post as</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {clubs.map((cl) => asOption(cl.clubId, cl.name))}
            {asOption(undefined, 'Just me')}
          </View>
        </View>

        {club && (
          <View style={{ gap: space.sm }}>
            <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>Who can see it</Text>
            <Segmented value={visibility} onChange={setVisibility} options={[{ value: 'public', label: 'Everyone' }, { value: 'club_page', label: 'Club page' }, { value: 'members', label: 'Members' }]} />
          </View>
        )}

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Share a game, an achievement or club news…"
          placeholderTextColor={c.textMuted}
          selectionColor={c.accent}
          multiline
          autoFocus
          style={{ minHeight: 110, color: c.text, fontFamily: fonts.body, fontSize: 17, lineHeight: 24, textAlignVertical: 'top' }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {images.map((im, i) => (
            <View key={im.uri + i}>
              <Image source={im.uri} style={{ width: 96, height: 96, borderRadius: radius.md }} contentFit="cover" />
              <Pressable onPress={() => setImages((cur) => cur.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon ios="xmark" android="close" size={10} color="#fff" weight="bold" />
              </Pressable>
            </View>
          ))}
          {images.length < MAX_PHOTOS && (
            <Pressable onPress={pick} style={{ width: 96, height: 96, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon ios="photo.badge.plus" android="add_photo_alternate" size={24} color={c.accent} />
              <Text variant="micro" color="textSecondary">{images.length ? `${images.length}/${MAX_PHOTOS}` : 'Photos'}</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 48, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: ytValid ? c.line : c.live }}>
            <Icon ios="play.rectangle" android="smart_display" size={18} color="#FF0033" />
            <TextInput value={yt} onChangeText={setYt} placeholder="YouTube link (optional)" placeholderTextColor={c.textMuted} autoCapitalize="none" keyboardType="url" style={{ flex: 1, color: c.text, fontFamily: fonts.bodyMedium, fontSize: 15 }} />
          </View>
          {!ytValid && <Text variant="caption" style={{ color: c.live }}>That doesn't look like a YouTube link. Paste the link from the YouTube Share button.</Text>}
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, backgroundColor: c.cardMuted }}>
          <Icon ios="info.circle" android="info" size={16} color={c.textMuted} />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            {club ? `Posting for ${club.name} in ${district?.name ?? 'its district'}. Checked automatically before it goes live.` : `Posting to ${district?.name ?? 'All India'}. Without a club, the BaskyCLub team reviews posts before they appear.`}
          </Text>
        </View>
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md }}>
        <Button label={sending ? 'Sharing…' : 'Share post'} loading={sending} disabled={sending || (!text.trim() && !images.length && !yt.trim()) || !ytValid} onPress={share} />
      </View>
    </KeyboardAvoidingView>
  );
}
