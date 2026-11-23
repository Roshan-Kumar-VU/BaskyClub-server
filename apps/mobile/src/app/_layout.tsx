import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplash } from '@/components/animated-splash';
import { useAlertTaps } from '@/lib/push';
import { ScopeProvider, useScope } from '@/lib/scope';
import { SessionProvider, useSession } from '@/lib/session';
import { colors, fonts, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <ScopeProvider>
          <App />
        </ScopeProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

function App() {
  const { dark } = useTheme();
  const session = useSession();
  const scope = useScope();
  const ready = session.ready && scope.ready;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  useAlertTaps(ready);

  const c = dark ? colors.dark : colors.light;
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, primary: c.accent, background: c.background, card: c.card, text: c.text, border: c.line } };
  const sheet = { presentation: 'formSheet' as const, sheetAllowedDetents: 'fitToContents' as const, sheetGrabberVisible: true, headerShown: false, sheetCornerRadius: 24 };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="auto" />
      {ready && (
        <Stack
          screenOptions={{
            headerTitleStyle: { fontFamily: fonts.bodyBold },
            headerBackButtonDisplayMode: 'minimal',
            headerTintColor: c.accent,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: c.background },
            contentStyle: { backgroundColor: c.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login-prompt" options={sheet} />
          <Stack.Screen name="location-explainer" options={sheet} />
          <Stack.Screen name="district-picker" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
          <Stack.Screen name="post/new" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="alerts" options={{ title: 'Alerts' }} />
          <Stack.Screen name="club/[id]/index" options={{ headerTransparent: true, title: '', headerTintColor: '#fff' }} />
          <Stack.Screen name="club/[id]/requests" options={{ title: 'Requests' }} />
          <Stack.Screen name="association/[id]/index" options={{ title: "" }} />
          <Stack.Screen name="user/[id]" options={{ title: '' }} />
          <Stack.Screen name="auth/login" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="auth/signup" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="auth/forgot" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="settings/profile" options={{ title: 'Edit profile' }} />
          <Stack.Screen name="settings/password" options={{ title: 'Change password' }} />
          <Stack.Screen name="settings/creator" options={{ title: 'Creator badge' }} />
          <Stack.Screen name="report" options={{ title: 'Report' }} />
          <Stack.Screen name="announce" options={{ title: 'Send an alert' }} />
          <Stack.Screen name="club/new" options={{ title: 'Register a club' }} />
          <Stack.Screen name="club/[id]/manage" options={{ title: 'Manage club' }} />
          <Stack.Screen name="club/[id]/members" options={{ title: 'People and roles' }} />
          <Stack.Screen name="club/[id]/timings" options={{ title: 'Practice hours' }} />
          <Stack.Screen name="club/[id]/affiliation" options={{ title: 'Affiliation' }} />
          <Stack.Screen name="association/[id]/manage" options={{ title: 'Manage association' }} />
          <Stack.Screen name="association/[id]/team" options={{ title: 'Association team' }} />
          <Stack.Screen name="association/[id]/bearers" options={{ title: 'Office bearers' }} />
          <Stack.Screen name="association/[id]/legacy" options={{ title: 'Media / Legacy' }} />
          <Stack.Screen name="association/[id]/affiliations" options={{ title: 'Affiliated clubs' }} />
          <Stack.Screen name="association/[id]/post" options={{ title: 'Official post' }} />
          <Stack.Screen name="admin/index" options={{ title: 'Admin' }} />
          <Stack.Screen name="admin/moderation" options={{ title: 'Review queue' }} />
          <Stack.Screen name="admin/clubs" options={{ title: 'Clubs to approve' }} />
          <Stack.Screen name="admin/courts" options={{ title: 'Courts to approve' }} />
          <Stack.Screen name="admin/badges" options={{ title: 'Badges' }} />
          <Stack.Screen name="admin/creators" options={{ title: 'Creator requests' }} />
          <Stack.Screen name="admin/users" options={{ title: 'Users' }} />
          <Stack.Screen name="admin/roles" options={{ title: 'BaskyCLub roles' }} />
          <Stack.Screen name="admin/associations" options={{ title: 'Associations' }} />
          <Stack.Screen name="admin/history" options={{ title: 'Change history' }} />
        </Stack>
      )}
      <AnimatedSplash ready={ready} />
    </ThemeProvider>
  );
}
