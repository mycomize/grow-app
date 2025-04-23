import '../global.css';
import 'expo-dev-client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Icon } from '@roninoss/icons';
import { Link, Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeToggle } from '~/components/ThemeToggle';
import { cn } from '~/lib/cn';
import { useColorScheme, useInitialAndroidBarSync } from '~/lib/useColorScheme';
import { NAV_THEME } from '~/theme';
import { AuthProvider, useAuth } from '../context/auth';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Root layout must be exported as default
export default function RootLayout() {
  useInitialAndroidBarSync();
  const { colorScheme, isDarkColorScheme } = useColorScheme();

  return (
    <>
      <StatusBar
        key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
        style={isDarkColorScheme ? 'light' : 'dark'}
      />
      {/* Wrap the entire app with AuthProvider */}
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ActionSheetProvider>
              <NavThemeProvider value={NAV_THEME[colorScheme]}>
                <RootLayoutNav />
              </NavThemeProvider>
            </ActionSheetProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </AuthProvider>
    </>
  );
}

// Navigation component with auth checking
function RootLayoutNav() {
  const { isLoading, isSignedIn } = useAuth();

  // Handle initial auth loading state
  if (isLoading) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="loading" options={{ title: 'Loading...' }} />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      {/* If signed in, show main tabs, else redirect to auth screens */}
      {isSignedIn ? (
        <>
          <Stack.Screen name="(tabs)" options={TABS_OPTIONS} />
          <Stack.Screen name="modal" options={MODAL_OPTIONS} />
        </>
      ) : (
        <>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </>
      )}
    </Stack>
  );
}

const SCREEN_OPTIONS = {
  animation: 'ios_from_right', // for android
} as const;

const TABS_OPTIONS = {
  headerShown: false,
} as const;

const MODAL_OPTIONS = {
  presentation: 'modal',
  animation: 'fade_from_bottom', // for android
  title: 'Settings',
  headerRight: () => <ThemeToggle />,
} as const;
