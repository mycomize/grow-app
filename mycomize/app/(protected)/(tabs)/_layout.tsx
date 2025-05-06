import { Tabs } from 'expo-router';
import { CircuitBoard, User, Package, Flower, House } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'black',
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
