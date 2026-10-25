import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplash } from '@/components/animated-splash';
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
          <Stack.Screen name="association/[id]" options={{ title: '' }} />
          <Stack.Screen name="user/[id]" options={{ title: '' }} />
          <Stack.Screen name="auth/login" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="auth/signup" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
      )}
      <AnimatedSplash ready={ready} />
    </ThemeProvider>
  );
}
