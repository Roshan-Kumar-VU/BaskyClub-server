// Reads live data from the repository cache: opt out of React Compiler memoisation so updates show.
'use no memo';

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { ScopeToggle } from './scope-toggle';
import { Text } from './text';

/** Header for the tab screens: title row, optional actions, optional scope toggle. */
export function ScreenHeader({
  title,
  titleNode,
  right,
  scoped,
  children,
}: {
  title?: string;
  titleNode?: React.ReactNode;
  right?: React.ReactNode;
  scoped?: boolean;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + space.sm, backgroundColor: c.background, borderBottomWidth: 0.5, borderBottomColor: c.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, minHeight: 40 }}>
        {titleNode ?? <Text variant="title">{title}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>{right}</View>
      </View>
      {scoped && (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
          <ScopeToggle />
        </View>
      )}
      {children}
      <View style={{ height: scoped || children ? 0 : space.md }} />
      {scoped && !children && <View style={{ height: space.md }} />}
    </View>
  );
}
