import { Drawer } from 'expo-router/drawer';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { List, PlusCircle, Layers, Calendar } from 'lucide-react-native';

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
          title: 'Grow List',
          drawerLabel: 'Grow List',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <List size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="templates"
        options={{
          title: 'Templates',
          drawerLabel: 'Templates',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Layers size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          drawerLabel: 'Calendar',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Calendar size={size} color={color} />
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
