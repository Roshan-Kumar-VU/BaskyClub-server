import { youtubeId, youtubeThumbnail } from '@baskyclub/shared';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { CourtArt } from './court-art';
import { Icon } from './icon';
import { Text } from './text';

/** YouTube link in a post: thumbnail with a play button; opens YouTube. */
export function YouTubeCard({ url }: { url: string }) {
  const { c } = useTheme();
  const id = youtubeId(url);
  const thumbnail = youtubeThumbnail(url);
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={{ aspectRatio: 16 / 9, backgroundColor: c.fill }}>
      <CourtArt seed={id ?? url} />
      {thumbnail && <Image source={thumbnail} style={StyleSheet.absoluteFill} contentFit="cover" />}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: 64, height: 44, borderRadius: 12, backgroundColor: '#FF0033', alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios="play.fill" android="play_arrow" size={22} color="#fff" />
        </View>
      </View>
      <View style={{ position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Text variant="micro" style={{ color: '#fff' }}>Watch on YouTube</Text>
      </View>
    </Pressable>
  );
}
