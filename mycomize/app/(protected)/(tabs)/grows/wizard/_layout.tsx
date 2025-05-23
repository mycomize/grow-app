import React from 'react';
import { Stack } from 'expo-router';

export default function GrowWizardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[step]"
        options={{
          title: 'Grow Wizard',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
