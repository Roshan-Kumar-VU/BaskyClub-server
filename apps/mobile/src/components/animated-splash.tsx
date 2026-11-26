import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { fonts } from '@/theme';

/**
 * ~1 second branded opener on top of the native splash (same orange), then
 * fades away to reveal Home. No permission prompts here (APP_NAV section 2).
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const [gone, setGone] = useState(false);
  const ball = useSharedValue(-120);
  const word = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (!ready) return;
    ball.value = withSequence(withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }), withSpring(0, { damping: 6, stiffness: 300 }));
    word.value = withDelay(220, withSpring(1, { damping: 14 }));
    const t = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 260);
    fade.value = withDelay(950, withTiming(0, { duration: 280 }, (done) => done && runOnJS(setGone)(true)));
    return () => clearTimeout(t);
  }, [ready, ball, word, fade]);

  const wrap = useAnimatedStyle(() => ({ opacity: fade.value }));
  const ballStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ball.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ scale: 0.85 + word.value * 0.15 }, { skewX: '-10deg' }] }));

  if (gone) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center', zIndex: 100 }, wrap]}>
      <Animated.View style={[{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', marginBottom: 18, alignItems: 'center', justifyContent: 'center' }, ballStyle]}>
        <Animated.View style={{ width: 64, height: 2, backgroundColor: '#FF6B00' }} />
        <Animated.View style={{ position: 'absolute', width: 2, height: 64, backgroundColor: '#FF6B00' }} />
      </Animated.View>
      <Animated.Text style={[{ fontFamily: fonts.display, fontSize: 34, letterSpacing: -2, color: '#fff' }, wordStyle]}>BASKYCLUB</Animated.Text>
    </Animated.View>
  );
}
