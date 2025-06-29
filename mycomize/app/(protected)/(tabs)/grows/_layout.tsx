import { Drawer } from 'expo-router/drawer';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { Waypoints, Layers, Calendar, ChartNoAxesCombined, ArrowLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function GrowsLayout() {
  const { theme } = useTheme();
  const router = useRouter();

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';
  const drawerActiveTintColor = theme === 'dark' ? '#4ade80' : '#16a34a';
  const drawerInactiveTintColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const drawerBackgroundColor = theme === 'dark' ? '#111827' : '#f9fafb';

  // Custom back button component
  const BackButton = () => (
    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16, padding: 4 }}>
      <ArrowLeft size={24} color={headerTintColor} />
    </TouchableOpacity>
  );

  return (
    <Drawer
      screenOptions={{
        headerStyle,
        headerTintColor,
        headerTitleAlign: 'center',
        drawerActiveTintColor,
        drawerInactiveTintColor,
        drawerStyle: {
          backgroundColor: drawerBackgroundColor,
        },
      }}>
      <Drawer.Screen
        name="index"
        options={{
          title: 'Grow Control',
          drawerLabel: 'Grow Control',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Waypoints size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="templates"
        options={{
          title: 'Grow Templates',
          drawerLabel: 'Grow Templates',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Layers size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="calendar"
        options={{
          title: 'Grow Calendar',
          drawerLabel: 'Grow Calendar',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="statistics"
        options={{
          title: 'Grow Statistics',
          drawerLabel: 'Grow Statistics',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <ChartNoAxesCombined size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="new"
        options={{
          title: 'Add Grow',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="[id]"
        options={{
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          title: 'Manage Grow',
          headerShown: true,
          headerLeft: () => <BackButton />, // Custom back button instead of hamburger
          swipeEnabled: false, // Disable drawer swipe for this screen
        }}
      />
    </Drawer>
  );
}
