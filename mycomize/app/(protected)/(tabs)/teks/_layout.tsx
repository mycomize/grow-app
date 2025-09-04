import { Stack } from 'expo-router';
import { BackButton } from '~/components/ui/back-button';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

export default function TekLayout() {
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
          title: 'Tek',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'New Tek',
          headerShown: true,
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: 'Edit Tek',
          headerShown: true,
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="[id]/view"
        options={{
          title: 'View Tek',
          headerShown: true,
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}
