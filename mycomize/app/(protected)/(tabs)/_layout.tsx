import { Tabs } from 'expo-router';
import { CircuitBoard, User, Shrub, ThumbsUp } from 'lucide-react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

export default function TabLayout() {
  const { theme } = useTheme();

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

  return (
    <Tabs
      screenOptions={{
        headerStyle,
        headerTintColor,
        tabBarActiveTintColor,
        tabBarInactiveTintColor,
        tabBarStyle,
        tabBarHideOnKeyboard: true,
      }}
      initialRouteName="grows">
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="grows"
        options={{
          title: 'Grows',
          tabBarLabel: 'Grows',
          tabBarIcon: ({ color, size }) => <Shrub size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="iot"
        options={{
          title: 'IoT',
          tabBarIcon: ({ color }) => <CircuitBoard color={color} />,
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
