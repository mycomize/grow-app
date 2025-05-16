import { Stack } from 'expo-router';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

export default function IoTGatewayLayout() {
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
      <Stack.Screen name="index" options={{ title: 'IoT Gateway', headerShown: true }} />
    </Stack>
  );
}
