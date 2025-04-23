import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuth } from '../../context/auth';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { username, signOut, token } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    // Navigate to login screen after logout
    router.replace('/auth/login');
  };

  const navigateToGrows = () => {
    router.push('/(tabs)/grows');
  };

  // Authentication check - must be after all hooks
  if (!token) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
        <Text className="text-2xl font-bold text-gray-800 dark:text-white">Profile</Text>
      </View>

      {/* Profile Card */}
      <View className="mx-4 mt-6 overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800">
        <View className="items-center border-b border-gray-200 bg-blue-50 p-6 dark:border-gray-700 dark:bg-blue-900/20">
          <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800">
            <Ionicons name="person" size={48} color="#3b82f6" />
          </View>
          <Text className="text-xl font-bold text-gray-800 dark:text-white">{username}</Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mushroom Grower</Text>
        </View>

        <View className="p-4">
          <Text className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            Account Settings
          </Text>

          {/* Settings Options - Can be expanded later */}
          <View className="space-y-2">
            <View className="flex-row items-center rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <Ionicons name="person-outline" size={24} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="font-medium text-gray-800 dark:text-white">Account</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Manage your account details
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>

            <TouchableOpacity
              className="flex-row items-center rounded-md border border-gray-200 p-3 dark:border-gray-700"
              onPress={navigateToGrows}>
              <Ionicons name="leaf-outline" size={24} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="font-medium text-gray-800 dark:text-white">Grows</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  View your mushroom grows
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View className="flex-row items-center rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <Ionicons name="settings-outline" size={24} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="font-medium text-gray-800 dark:text-white">Settings</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  App preferences and notifications
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View className="m-4 mt-6">
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-md bg-red-500 p-4"
          onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
          <Text className="ml-2 font-medium text-white">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View className="m-4 mt-6">
        <Text className="text-center text-xs text-gray-500 dark:text-gray-400">
          Mycomize Grow v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
