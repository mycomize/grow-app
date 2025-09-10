import { Drawer } from 'expo-router/drawer';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { List, CalendarDays, ChartNoAxesCombined, ArrowLeft } from 'lucide-react-native';
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
  const drawerActiveTintColor = theme === 'dark' ? '#5f8afe' : '#16a34a';
  const drawerInactiveTintColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const drawerBackgroundColor = theme === 'dark' ? '#0a0a0a' : '#f9fafb';

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
          title: 'Grow',
          drawerLabel: 'Grow List',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <List size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="calendar"
        options={{
          title: 'Grow',
          drawerLabel: 'Calendar',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <CalendarDays size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="statistics"
        options={{
          title: 'Grow',
          drawerLabel: 'Statistics',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <ChartNoAxesCombined size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="new"
        options={{
          title: 'New Grow',
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          headerShown: true,
          headerLeft: () => <BackButton />, // Custom back button instead of hamburger
        }}
      />
      <Drawer.Screen
        name="[id]/index"
        options={{
          drawerItemStyle: { display: 'none' }, // Hide from drawer menu
          title: 'Edit Grow',
          headerShown: true,
          headerLeft: () => <BackButton />, // Custom back button instead of hamburger
          swipeEnabled: false, // Disable drawer swipe for this screen
        }}
      />
    </Drawer>
  );
}
