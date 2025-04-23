import { Stack } from 'expo-router';
import { useAuth } from '../../context/auth';
import { Redirect } from 'expo-router';

export default function GrowsLayout() {
  const { isSignedIn } = useAuth();

  // If not signed in, redirect to login
  if (!isSignedIn) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="new"
        options={{
          title: 'Add New Grow',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Grow Details',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </Stack>
  );
}
