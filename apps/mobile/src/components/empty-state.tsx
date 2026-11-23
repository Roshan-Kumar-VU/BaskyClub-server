import { View } from 'react-native';

import { space, useTheme } from '@/theme';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

export function EmptyState({ ios, android, title, body, action, onAction }: { ios: string; android: string; title: string; body?: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: space.xxl, gap: space.sm }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm }}>
        <Icon ios={ios} android={android} size={28} color={c.textMuted} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>{title}</Text>
      {body && <Text color="textMuted" style={{ textAlign: 'center' }}>{body}</Text>}
      {action && (
        <View style={{ marginTop: space.md }}>
          <Button compact label={action} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
