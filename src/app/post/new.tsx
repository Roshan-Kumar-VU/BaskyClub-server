import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { SheetHeader } from '@/components/sheet-header';
import { LoginPromptBody } from '@/components/login-prompt';
import { Text } from '@/components/text';
import { createPost, getDistrict, getMyClubs } from '@/data/repo';
import { useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

/**
 * New post. District is filled automatically: club post → club's district,
 * personal post → your home district. No manual district tagging.
 */
export default function NewPost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const clubs = getMyClubs(user?.userId);
  const [clubId, setClubId] = useState<string | undefined>(clubs[0]?.clubId);
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; ratio: number } | null>(null);
  if (!user) return <LoginPromptBody reason="Log in to post or start a match room." />;

  const club = clubs.find((x) => x.clubId === clubId);
  const district = getDistrict(club?.districtCode ?? user.homeDistrictCode);

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!r.canceled && r.assets[0]) setImage({ uri: r.assets[0].uri, ratio: r.assets[0].width / Math.max(1, r.assets[0].height) });
  };

  const share = () => {
    const res = createPost({ userId: user.userId, clubId, content: text.trim(), imageUri: image?.uri, aspectRatio: image?.ratio });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
    if (res.status === 'pending_review') {
      Alert.alert('Sent for review', 'Posts from accounts without a club are checked by the BaskyCLub team before they appear.');
    }
  };

  const option = (id: string | undefined, label: string) => {
    const active = clubId === id;
    return (
      <Pressable key={label} onPress={() => setClubId(id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 8, paddingRight: 14, borderRadius: radius.full, borderWidth: 1.5, borderColor: active ? c.accent : c.line, backgroundColor: active ? c.accentSoft : c.card }}>
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
            {clubs.map((cl) => option(cl.clubId, cl.clubName))}
            {option(undefined, 'Just me')}
          </View>
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Share an achievement, a game or club news…"
          placeholderTextColor={c.textMuted}
          selectionColor={c.accent}
          multiline
          autoFocus
          style={{ minHeight: 120, color: c.text, fontFamily: fonts.body, fontSize: 17, lineHeight: 24, textAlignVertical: 'top' }}
        />
        {image ? (
          <View>
            <Image source={image.uri} style={{ width: '100%', aspectRatio: image.ratio, borderRadius: radius.lg }} contentFit="cover" />
            <Pressable onPress={() => setImage(null)} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon ios="xmark" android="close" size={13} color="#fff" weight="bold" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pick} style={{ height: 120, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon ios="photo.badge.plus" android="add_photo_alternate" size={28} color={c.accent} />
            <Text variant="caption" color="textSecondary">Add a photo</Text>
          </Pressable>
        )}
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, backgroundColor: c.cardMuted }}>
          <Icon ios="info.circle" android="info" size={16} color={c.textMuted} />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            Posting to {district?.name ?? 'All India'}. {club ? 'Checked automatically before it goes live.' : 'Checked automatically and reviewed by the BaskyCLub team.'}
          </Text>
        </View>
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md }}>
        <Button label="Share post" disabled={!text.trim() && !image} onPress={share} />
      </View>
    </KeyboardAvoidingView>
  );
}
