import Svg, { Text as SvgText } from 'react-native-svg';

import { fonts } from '@/theme';

/**
 * Outlined ("hollow") display text — jersey numbers and club initials.
 * Same treatment as the website's .hollow-text, drawn with SVG because
 * React Native text has no stroke.
 */
export function Hollow({
  text,
  size,
  color,
  width,
  strokeWidth = 1.5,
  fill = 'none',
  anchor = 'start',
}: {
  text: string;
  size: number;
  color: string;
  width?: number;
  strokeWidth?: number;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
}) {
  const w = width ?? size * 0.68 * text.length + strokeWidth * 2;
  const h = size * 1.02;
  const x = anchor === 'start' ? strokeWidth : anchor === 'middle' ? w / 2 : w - strokeWidth;
  return (
    <Svg width={w} height={h}>
      <SvgText
        x={x}
        y={size * 0.86}
        fontFamily={fonts.display}
        fontSize={size}
        letterSpacing={-size * 0.04}
        stroke={color}
        strokeWidth={strokeWidth}
        fill={fill}
        textAnchor={anchor}>
        {text}
      </SvgText>
    </Svg>
  );
}
