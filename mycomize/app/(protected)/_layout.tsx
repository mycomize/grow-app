import { Stack, Redirect } from 'expo-router';
import { AuthContext } from '~/lib/AuthContext';
import { useContext } from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { CalendarProvider } from '~/lib/CalendarContext';
import { useEncryption } from '~/lib/EncryptionContext';

export default function ProtectedLayout() {
  const authState = useContext(AuthContext);
  const encryption = useEncryption();
  const { theme } = useTheme();

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';

  // Show loading while checking auth or encryption status
  if (authState.isTokenLoading || encryption.isLoading) {
    return <Text>Loading...</Text>;
  }

  // First check authentication
  if (!authState.token) {
    return <Redirect href="/login" />;
  }

  // Then check encryption setup
  if (!encryption.isInitialized) {
    return <Redirect href="/encryption-setup" />;
  }

  return (
    <CalendarProvider>
      <Stack
        screenOptions={{
          headerStyle,
          headerTintColor,
          headerTitleStyle: {
            color: headerTintColor,
          },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </CalendarProvider>
  );
}
