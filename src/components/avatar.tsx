import { Image } from 'expo-image';
import { View } from 'react-native';

import { hueFor, initials } from '@/lib/format';
import { fonts } from '@/theme';

import { Text } from './text';

type Props = { name: string; uri?: string; size?: number; square?: boolean };

/** Photo if we have one, otherwise initials on a colour picked from the name. */
export function Avatar({ name, uri, size = 40, square }: Props) {
  const r = square ? size * 0.28 : size / 2;
  if (uri) {
    return <Image source={uri} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" transition={150} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: hueFor(name),
        alignItems: 'center',
        justifyContent: 'center',
        borderCurve: 'continuous',
      }}>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.38, color: '#fff', letterSpacing: -0.5 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
