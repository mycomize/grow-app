import { Stack } from 'expo-router';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

export default function GrowDetailsLayout() {
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
      <Stack.Screen
        name="index"
        options={{
          title: 'Grow Details',
          headerShown: false, // This will be redirected anyway
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Manage Grow',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
