import { View } from 'react-native';

import { space } from '@/theme';

import { Text } from './text';

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.md }}>
      <Text variant="heading">{title}</Text>
      {action}
    </View>
  );
}
