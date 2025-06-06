import { Stack } from 'expo-router';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

export default function ProfileLayout() {
  const { theme } = useTheme();

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';

  return (
    <Stack
      screenOptions={{
        headerStyle,
        headerTintColor,
        headerTitleAlign: 'center',
      }}>
      <Stack.Screen name="index" options={{ title: 'Profile', headerShown: true }} />
      <Stack.Screen
        name="change-password"
        options={{ title: 'Change Password', headerShown: true }}
      />
    </Stack>
  );
}
