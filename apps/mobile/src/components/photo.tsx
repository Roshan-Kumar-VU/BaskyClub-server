import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CourtArt } from './court-art';

/** A photo with the court artwork underneath, so a missing or slow image never shows a blank box. */
export function Photo({ uri, seed, aspectRatio, fill }: { uri?: string; seed: string; aspectRatio?: number; fill?: boolean }) {
  return (
    <View style={fill ? StyleSheet.absoluteFill : { aspectRatio: aspectRatio ?? 1 }}>
      <CourtArt seed={seed} />
      {uri && <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />}
    </View>
  );
}
