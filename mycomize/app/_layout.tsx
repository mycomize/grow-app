import '~/global.css';
import { Stack } from 'expo-router';
import { AuthProvider } from '~/lib/AuthContext';

export default function RootLayout() {
  return (
    <>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </>
  );
}
