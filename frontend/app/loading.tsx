import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <ActivityIndicator size="large" color="#0284c7" />
      <Text className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading...</Text>
    </View>
  );
}
