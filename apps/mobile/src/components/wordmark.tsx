import { fonts, useTheme } from '@/theme';

import { Text } from './text';

/** The BASKYCLUB logo text from the website nav: heavy, italic-leaning, tight. */
export function Wordmark({ size = 22 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <Text
      style={{
        fontFamily: fonts.display,
        fontSize: size,
        letterSpacing: -size * 0.06,
        color: c.accent,
        transform: [{ skewX: '-10deg' }],
      }}>
      BASKYCLUB
    </Text>
  );
}
