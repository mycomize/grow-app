import '~/global.css';
import '@/global.css';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/components/ui/themeprovider/themeprovider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { useInitializeStore } from '~/lib/stores/authEncryptionStore';

// Wrapper component to use the theme context and initialize the store
function ThemedApp() {
  const { theme } = useTheme();
  const initializeStore = useInitializeStore();

  // Initialize the auth encryption store on app startup
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';

  // Status bar background color that matches the theme
  const statusBarBgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode={theme}>
        <StatusBar
          style={theme === 'dark' ? 'light' : 'dark'}
          backgroundColor={theme === 'dark' ? '#1a1a1a' : '#ffffff'}
          translucent={true}
        />
        <Stack
          screenOptions={{
            headerStyle,
            headerTintColor,
            headerTransparent: true,
            headerTitleStyle: {
              color: headerTintColor,
            },
            contentStyle: { paddingTop: 0 },
          }}>
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="encryption-setup" options={{ headerShown: false }} />
        </Stack>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
