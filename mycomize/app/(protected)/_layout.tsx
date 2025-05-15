import { Stack, Redirect } from 'expo-router';
import { AuthContext } from '~/lib/AuthContext';
import { useContext } from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

export default function ProtectedLayout() {
  const authState = useContext(AuthContext);
  const { theme } = useTheme();

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';

  if (authState.isTokenLoading) {
    return <Text>Loading...</Text>;
  }

  if (!authState.token) {
    return <Redirect href="/login" />;
  }

  return (
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
  );
}
