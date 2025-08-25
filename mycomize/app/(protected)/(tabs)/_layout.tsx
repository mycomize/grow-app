import { useEffect, useContext } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { CircuitBoard, User, FlaskConical, Layers } from 'lucide-react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import MushroomIcon from '~/components/icons/MushroomIcon';
import { AuthContext } from '~/lib/api/AuthContext';
import { useGrowStore } from '~/lib/stores';

export default function TabLayout() {
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { token } = useContext(AuthContext);
  const fetchGrows = useGrowStore((state) => state.fetchGrows);

  // Initial data fetch on app startup and redirect if no token
  useEffect(() => {
    const initialSetup = async () => {
      if (!token) {
        router.replace('/login');
        return;
      }
      
      try {
        await fetchGrows(token);
      } catch (error) {
        console.error('Error fetching initial grows:', error);
      }
    };

    initialSetup();
  }, [token, fetchGrows, router]);

  // Set tab bar styles based on theme
  const tabBarStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingTop: 5,
    height: 65,
  };

  const tabBarActiveTintColor = theme === 'dark' ? '#ffffff' : '#000000';
  const tabBarInactiveTintColor = theme === 'dark' ? '#999999' : '#666666';

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';

  const iconColor = theme === 'dark' ? '#ffffff' : '#000000';

  return (
    <Tabs
      screenOptions={{
        headerStyle,
        headerTintColor,
        tabBarActiveTintColor,
        tabBarInactiveTintColor,
        tabBarStyle,
        tabBarHideOnKeyboard: true,
        headerStatusBarHeight: 0,
      }}
      initialRouteName="grows">
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="grows"
        options={{
          title: 'Grow',
          tabBarLabel: 'Grow',
          tabBarIcon: ({ color }) => <MushroomIcon height={24} width={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="teks"
        options={{
          title: 'Tek',
          tabBarLabel: 'Tek',
          tabBarIcon: ({ color }) => <Layers color={color} />,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="iot"
        options={{
          title: 'IoT',
          tabBarLabel: 'IoT',
          tabBarIcon: ({ color }) => <CircuitBoard color={color} />,
          headerShown: true,
        }}
        listeners={{
          tabPress: (e) => {
            // Check if we're currently on a nested IoT route by examining the pathname
            const currentPath = segments.join('/');
            const isOnNestedIoTRoute =
              currentPath.includes('iot') &&
              (currentPath.match(/iot\/\d+/) || // matches /iot/[id]
                currentPath.includes('states') ||
                currentPath.includes('services') ||
                currentPath.includes('sensor'));

            if (isOnNestedIoTRoute) {
              // Prevent default tab press behavior
              e.preventDefault();
              // Navigate to IoT index
              router.push('/iot');
            }
          },
        }}
      />
      <Tabs.Screen
        name="lab"
        options={{
          title: 'Lab',
          tabBarLabel: 'Lab',
          tabBarIcon: ({ color }) => <FlaskConical color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
