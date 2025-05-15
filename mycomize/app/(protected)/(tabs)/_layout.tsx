import { Tabs } from 'expo-router';
import { CircuitBoard, User, Package, Flower, House } from 'lucide-react-native';
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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor,
        tabBarInactiveTintColor,
        tabBarStyle,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <House color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="grows"
        options={{
          title: 'Grows',
          tabBarIcon: ({ color }) => <Flower color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color }) => <Package color={color} />,
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
