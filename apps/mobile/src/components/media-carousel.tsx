import { useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';

import type { PostMedia } from '@/types/models';
import { useTheme } from '@/theme';

import { Photo } from './photo';

/** Several photos in a post: swipe sideways, dots show which one. */
export function MediaCarousel({ media, seed }: { media: PostMedia[]; seed: string }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const ratio = media[0]?.aspectRatio ?? 1;
  if (media.length === 1) return <Photo uri={media[0]!.url} seed={seed} aspectRatio={ratio} />;
  return (
    <View>
      <FlatList
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(m) => m.id}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <View style={{ width }}>
            <Photo uri={item.url} seed={`${seed}-${i}`} aspectRatio={ratio} />
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingTop: 8 }}>
        {media.map((m, i) => (
          <View key={m.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === index ? c.accent : c.line }} />
        ))}
      </View>
    </View>
  );
}
