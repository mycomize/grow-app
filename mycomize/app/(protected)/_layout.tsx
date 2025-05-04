import { Stack, Redirect } from 'expo-router';
import { AuthContext } from '~/lib/AuthContext';
import { useContext } from 'react';
import { Text } from 'react-native';

export default function ProtectedLayout() {
  const authState = useContext(AuthContext);

  if (authState.isTokenLoading) {
    return <Text>Loading...</Text>;
  }

  if (!authState.token) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
