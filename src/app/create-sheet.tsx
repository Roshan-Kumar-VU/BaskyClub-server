import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SheetHeader } from '@/components/sheet-header';
import { Text } from '@/components/text';
import { LoginPromptBody } from '@/components/login-prompt';
import { useSession } from '@/lib/session';
import { radius, space, useTheme } from '@/theme';

/** The + sheet: Post / Match room. Visitors see the login prompt instead (APP_NAV section 6). */
export default function CreateSheet() {
  const { c } = useTheme();
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  if (!user) return <LoginPromptBody reason="Log in to post or start a match room." />;

  const option = (title: string, body: string, ios: string, android: string, tint: string, go: () => void) => (
    <PressableScale haptic onPress={go}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.cardMuted }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, borderCurve: 'continuous', backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios={ios} android={android} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">{title}</Text>
          <Text variant="caption" color="textSecondary">{body}</Text>
        </View>
        <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} />
      </View>
    </PressableScale>
  );

  return (
    <View style={{ backgroundColor: c.card, paddingBottom: insets.bottom + space.lg }}>
      <SheetHeader title="Create" />
      <View style={{ padding: space.lg, gap: space.md }}>
        {option('Post', 'Share a photo, an achievement or club news', 'photo.on.rectangle.angled', 'add_photo_alternate', c.accent, () => {
          router.back();
          router.push('/post/new');
        })}
        {option('Match room', 'Score a game live from your phone', 'sportscourt.fill', 'scoreboard', c.official, () => {
          router.back();
          router.push('/match/new');
        })}
      </View>
    </View>
  );
}
