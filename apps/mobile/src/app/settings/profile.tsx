'use no memo';

import { fits, LIMITS } from '@baskyclub/shared';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Area, back, Choice, DistrictSelect, Page } from '@/components/form';
import { Text } from '@/components/text';
import { uploadPhoto } from '@/data/api';
import { updateMyProfile } from '@/data/manage';
import { notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space, useTheme } from '@/theme';

/** Edit profile (#72): photo, cover, name, bio, Instagram/YouTube (hidden on the profile for under-18), district. */
export default function EditProfile() {
  const { c } = useTheme();
  const { user } = useSession();
  const [f, setF] = useState({
    name: user?.name ?? '',
    bio: user?.bio ?? '',
    instagram: user?.instagram ?? '',
    youtube: user?.youtube ?? '',
    gender: user?.gender as 'male' | 'female' | undefined,
    homeDistrictCode: user?.homeDistrictCode,
    photoUrl: user?.avatarUrl,
    coverPhotoUrl: user?.coverUrl,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'photo' | 'cover' | null>(null);
  if (!user) return null;
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const pick = async (which: 'photo' | 'cover') => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: which === 'photo' ? [1, 1] : [3, 1] });
    if (r.canceled) return;
    setUploading(which);
    try {
      const url = await uploadPhoto(r.assets[0].uri);
      setF((x) => ({ ...x, [which === 'photo' ? 'photoUrl' : 'coverPhotoUrl']: url }));
    } catch (e) {
      notify("Couldn't upload the photo", errorMessage(e));
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateMyProfile(user.userId, {
        name: f.name.trim(),
        bio: f.bio.trim() || null,
        instagram: f.instagram.trim() || null,
        youtube: f.youtube.trim() || null,
        gender: f.gender ?? null,
        photoUrl: f.photoUrl ?? null,
        coverPhotoUrl: f.coverPhotoUrl ?? null,
        ...(f.homeDistrictCode ? { homeDistrictCode: f.homeDistrictCode } : {}),
      });
      back();
    } catch (e) {
      notify("Couldn't save", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <Avatar name={f.name || '?'} uri={f.photoUrl} size={72} />
        <View style={{ gap: space.sm, flex: 1 }}>
          <Button compact kind="secondary" label={uploading === 'photo' ? 'Uploading…' : 'Change photo'} onPress={() => pick('photo')} />
          <Button compact kind="secondary" label={uploading === 'cover' ? 'Uploading…' : f.coverPhotoUrl ? 'Change cover photo' : 'Add cover photo'} onPress={() => pick('cover')} />
        </View>
      </View>
      <Field label="Name" value={f.name} onChangeText={set('name')} autoComplete="name" maxLength={LIMITS.personName.max} />
      <Area label="Bio" value={f.bio} onChangeText={set('bio')} placeholder="Position, club, what you love about the game" max={300} />
      <Field label="Instagram username" value={f.instagram} onChangeText={set('instagram')} placeholder="yourname" autoCapitalize="none" hint={user.isMinor ? 'Hidden on your profile until you turn 18.' : undefined} />
      <Field label="YouTube channel" value={f.youtube} onChangeText={set('youtube')} placeholder="@yourchannel" autoCapitalize="none" hint={user.isMinor ? 'Hidden on your profile until you turn 18.' : undefined} />
      <Choice label="Plays in" value={f.gender} onChange={set('gender')} options={[{ value: 'male', label: "Men's" }, { value: 'female', label: "Women's" }]} />
      <DistrictSelect label="Home district" value={f.homeDistrictCode} onChange={set('homeDistrictCode')} />
      <Text variant="caption" color="textMuted">Email, phone and date of birth are never shown on your profile.</Text>
      <Button label="Save" loading={saving} disabled={!fits(f.name, LIMITS.personName)} onPress={save} />
      <Pressable onPress={back}><Text color="textMuted" style={{ textAlign: 'center', color: c.textMuted }}>Cancel</Text></Pressable>
    </Page>
  );
}
