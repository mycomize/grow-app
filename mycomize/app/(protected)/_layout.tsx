import { Stack, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { CalendarProvider } from '~/lib/CalendarContext';
import { 
  useAuthToken, 
  useIsAuthLoading,
  useIsEncryptionReady,
  useIsEncryptionLoading, 
  useNeedsEncryptionSetup,
  useIsInitializing
} from '~/lib/stores/authEncryptionStore';

export default function ProtectedLayout() {
  const token = useAuthToken();
  const isAuthLoading = useIsAuthLoading();
  const isEncryptionReady = useIsEncryptionReady();
  const isEncryptionLoading = useIsEncryptionLoading();
  const needsEncryptionSetup = useNeedsEncryptionSetup();
  const isInitializing = useIsInitializing();
  const { theme } = useTheme();

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';

  // Show loading while the store is initializing or checking auth/encryption status
  if (isInitializing || isAuthLoading || isEncryptionLoading) {
    return <Text>Loading...</Text>;
  }

  // First check authentication
  if (!token) {
    return <Redirect href="/login" />;
  }

  // Then check encryption setup - redirect if user needs encryption setup
  if (needsEncryptionSetup) {
    return <Redirect href="/encryption-setup" />;
  }

  // If encryption is not ready and we don't explicitly need setup, still wait
  if (!isEncryptionReady) {
    return <Text>Loading...</Text>;
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
