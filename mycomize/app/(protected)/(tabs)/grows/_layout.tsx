import { Stack } from 'expo-router';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

export default function GrowsLayout() {
  const { theme } = useTheme();

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Grows', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Add Grow', headerShown: false }} />
      <Stack.Screen name="wizard" options={{ headerShown: false }} />
    </Stack>
  );
}
