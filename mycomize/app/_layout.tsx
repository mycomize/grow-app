import '~/global.css';
import '@/global.css';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/components/ui/themeprovider/themeprovider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { authSchema } from '~/db/schema/auth';
import authMigrations from '~/drizzle/auth/migrations';
import { setDatabaseReady } from '~/lib/db/useDatabaseReady';

// Global auth database instance
const sqliteAuthDb = openDatabaseSync('auth.db');
export const globalAuthDb = drizzle(sqliteAuthDb, { schema: authSchema });

// Wrapper component to use the theme context
function ThemedApp() {
  const { theme } = useTheme();

  // Apply migrations first
  const { success: migrationsSuccess, error: migrationsError } = useMigrations(globalAuthDb, authMigrations);

  // Set up Drizzle Studio after migrations
  useDrizzleStudio(sqliteAuthDb);

  // Log migration results and update database readiness
  useEffect(() => {
    if (migrationsSuccess) {
      console.log('[RootLayout] Database migrations successful');
      setDatabaseReady(true, false);
    } else if (migrationsError) {
      console.error('[RootLayout] Database migrations failed:', migrationsError);
      setDatabaseReady(false, true);
    }
  }, [migrationsSuccess, migrationsError]);
  
  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';

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
