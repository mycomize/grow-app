import { Link, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HeaderButton } from '../../components/HeaderButton';
import { TabBarIcon } from '../../components/TabBarIcon';
import { useColorScheme } from '../../lib/useColorScheme';

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#3b82f6' : '#1e40af',
        tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
        },
      }}>
      <Tabs.Screen
        name="grows"
        options={{
          title: 'Grows',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size || 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
