import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { hueFor } from '@/lib/format';

/**
 * Placeholder artwork for posts without real photos yet: a half-court drawn
 * from plain views on a gradient tinted by the club. Replaced by real images
 * once uploads exist.
 */
/** Pass aspectRatio to size by width; omit it to fill the parent. */
export function CourtArt({ seed, aspectRatio }: { seed: string; aspectRatio?: number }) {
  const base = hueFor(seed);
  const line = 'rgba(255,255,255,0.35)';
  return (
    <View style={aspectRatio ? { aspectRatio, overflow: 'hidden' } : { flex: 1, overflow: 'hidden' }}>
      <LinearGradient colors={[base, '#1A1C1C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Three-point arc */}
      <View style={[styles.arc, { borderColor: line }]} />
      {/* Key */}
      <View style={[styles.key, { borderColor: line }]} />
      {/* Free-throw circle */}
      <View style={[styles.ftCircle, { borderColor: line }]} />
      {/* Rim */}
      <View style={[styles.rim, { borderColor: '#FF6B00' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  arc: {
    position: 'absolute',
    width: '120%',
    aspectRatio: 1,
    borderRadius: 9999,
    borderWidth: 2,
    left: '-10%',
    bottom: '38%',
  },
  key: {
    position: 'absolute',
    width: '34%',
    height: '58%',
    left: '33%',
    top: 0,
    borderWidth: 2,
    borderTopWidth: 0,
  },
  ftCircle: {
    position: 'absolute',
    width: '34%',
    aspectRatio: 1,
    borderRadius: 9999,
    borderWidth: 2,
    left: '33%',
    top: '41%',
  },
  rim: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    left: '50%',
    marginLeft: -13,
    top: '8%',
  },
});
