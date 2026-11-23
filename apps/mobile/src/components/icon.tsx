import { SymbolView, type SymbolViewProps } from 'expo-symbols';

/**
 * One icon component for both platforms: SF Symbols on iOS,
 * Material Symbols on Android/web.
 */
type Props = {
  ios: SymbolViewProps['name'] & string;
  android: string;
  size?: number;
  color: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
};

export function Icon({ ios, android, size = 22, color, weight = 'regular' }: Props) {
  return (
    <SymbolView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name={{ ios, android, web: android } as any}
      size={size}
      tintColor={color}
      weight={weight}
    />
  );
}
