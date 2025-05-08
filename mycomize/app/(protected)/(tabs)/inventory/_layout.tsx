import { Stack } from 'expo-router';

export default function InventoryLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Inventory', headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{ title: 'Edit Inventory', headerShown: true, headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="new"
        options={{ title: 'Add Inventory', headerShown: true, headerTitleAlign: 'center' }}
      />
    </Stack>
  );
}
