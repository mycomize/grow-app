import { Drawer } from 'expo-router/drawer';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { Waypoints, Layers, Calendar, ChartNoAxesCombined } from 'lucide-react-native';

export default function GrowsLayout() {
  const { theme } = useTheme();

  // Set header styles based on theme
  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
  };

  const headerTintColor = theme === 'dark' ? '#ffffff' : '#000000';
  const drawerActiveTintColor = theme === 'dark' ? '#4ade80' : '#16a34a';
  const drawerInactiveTintColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const drawerBackgroundColor = theme === 'dark' ? '#111827' : '#f9fafb';

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
        }}
      />
    </Drawer>
  );
}
