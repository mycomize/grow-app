import '~/global.css';
import '@/global.css';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Stack } from 'expo-router';
import { AuthProvider } from '~/lib/AuthContext';

export default function RootLayout() {
  return (
    <>
      <AuthProvider>
        <GluestackUIProvider mode="light">
          <Stack>
            <Stack.Screen name="(protected)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
          </Stack>
        </GluestackUIProvider>
      </AuthProvider>
    </>
  );
}
