import { Tabs, useRouter, useSegments } from 'expo-router';
import { CircuitBoard, User, Beaker } from 'lucide-react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import MushroomIcon from '~/components/icons/MushroomIcon';

export default function TabLayout() {
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();

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
          tabBarIcon: ({ color }) => <Beaker color={color} />,
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
