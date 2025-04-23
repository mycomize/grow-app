import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth';
import { growApi, Grow } from '../../services/grow';

export default function GrowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [grow, setGrow] = useState<Grow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch grow details
  useEffect(() => {
    const fetchGrow = async () => {
      if (!token || !id) return;

      setLoading(true);
      setError(null);

      try {
        const growData = await growApi.getGrow(token, parseInt(id));
        setGrow(growData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grow details');
        console.error('Error fetching grow:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrow();
  }, [id, token]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Handle editing the grow
  const handleEdit = () => {
    // To be implemented in the future
    Alert.alert('Coming Soon', 'Editing grows will be available in a future update.');
  };

  // Handle deleting the grow
  const handleDelete = () => {
    Alert.alert(
      'Delete Grow',
      'Are you sure you want to delete this grow? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  // Confirm and execute deletion
  const confirmDelete = async () => {
    if (!token || !id) return;

    setDeleting(true);

    try {
      await growApi.deleteGrow(token, parseInt(id));
      router.replace('/(tabs)/grows' as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete grow');
      console.error('Error deleting grow:', err);
      setDeleting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="mt-4 text-gray-700 dark:text-gray-300">Loading grow details...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4 dark:bg-gray-900">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text className="mt-4 text-center text-xl font-medium text-gray-800 dark:text-gray-200">
          Error Loading Grow
        </Text>
        <Text className="mt-2 text-center text-gray-600 dark:text-gray-400">{error}</Text>
        <TouchableOpacity
          className="mt-6 rounded-md bg-blue-500 px-4 py-2"
          onPress={() => router.back()}>
          <Text className="font-medium text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No grow found
  if (!grow) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4 dark:bg-gray-900">
        <Ionicons name="leaf-outline" size={64} color="#9ca3af" />
        <Text className="mt-4 text-center text-xl font-medium text-gray-800 dark:text-gray-200">
          Grow Not Found
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-md bg-blue-500 px-4 py-2"
          onPress={() => router.replace('/(tabs)/grows' as any)}>
          <Text className="font-medium text-white">Return to Grows</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header with species and variant */}
      <View className="border-b border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-800">
        <Text className="text-2xl font-bold text-gray-800 dark:text-white">{grow.species}</Text>
        <Text className="mt-1 text-lg text-gray-600 dark:text-gray-400">{grow.variant}</Text>
      </View>

      {/* Main content */}
      <View className="p-6">
        {/* Dates section */}
        <View className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <View className="mb-4 flex-row items-center">
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            <Text className="ml-2 font-medium text-gray-800 dark:text-gray-200">
              Inoculation Date
            </Text>
          </View>
          <Text className="text-lg text-gray-700 dark:text-gray-300">
            {formatDate(grow.inoculation_date)}
          </Text>
        </View>

        {/* Substrate section */}
        <View className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <Text className="mb-3 font-medium text-gray-800 dark:text-gray-200">Substrates</Text>

          <View className="mb-3">
            <Text className="text-sm text-gray-500 dark:text-gray-400">Spawn Substrate</Text>
            <Text className="text-lg text-gray-700 dark:text-gray-300">{grow.spawn_substrate}</Text>
          </View>

          <View>
            <Text className="text-sm text-gray-500 dark:text-gray-400">Bulk Substrate</Text>
            <Text className="text-lg text-gray-700 dark:text-gray-300">{grow.bulk_substrate}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row space-x-4">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-md bg-blue-500 p-3"
            onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color="white" />
            <Text className="ml-2 font-medium text-white">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-md bg-red-500 p-3"
            onPress={handleDelete}
            disabled={deleting}>
            {deleting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="white" />
                <Text className="ml-2 font-medium text-white">Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
