import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth';
import { growApi, Grow } from '../../services/grow';

export default function GrowsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [grows, setGrows] = useState<Grow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch grows from API
  const fetchGrows = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      if (!token) throw new Error('Not authenticated');
      const data = await growApi.getGrows(token);
      setGrows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grows');
      console.error('Error fetching grows:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load grows on initial render and handle auth check
  useEffect(() => {
    if (token) {
      fetchGrows();
    }
  }, [token]);

  // Authentication check - must be after hooks
  if (!token) {
    return <Redirect href="/auth/login" />;
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchGrows(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Navigate to add grow screen
  const handleAddGrow = () => {
    router.push('/grows/new' as any);
  };

  // Render each grow item
  const renderGrowItem = ({ item }: { item: Grow }) => (
    <TouchableOpacity
      className="mb-4 rounded-lg border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      onPress={() =>
        router.push({
          pathname: '/grows/[id]',
          params: { id: item.id.toString() },
        } as any)
      }>
      <View className="flex-row justify-between">
        <Text className="text-lg font-bold text-gray-800 dark:text-white">{item.species}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">{item.variant}</Text>
      </View>

      <View className="mt-2 flex-row justify-between">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          Inoculated: {formatDate(item.inoculation_date)}
        </Text>
      </View>

      <View className="mt-2">
        <Text className="text-sm text-gray-600 dark:text-gray-300">
          Spawn: {item.spawn_substrate}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-300">
          Bulk: {item.bulk_substrate}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="mt-4 text-gray-700 dark:text-gray-300">Loading your grows...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
        <Text className="text-2xl font-bold text-gray-800 dark:text-white">My Grows</Text>
        <TouchableOpacity onPress={handleAddGrow} className="rounded-full bg-blue-500 p-2">
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {error && (
        <View className="m-4 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <Text className="text-red-800 dark:text-red-200">{error}</Text>
        </View>
      )}

      {/* Empty state */}
      {!loading && grows.length === 0 && !error && (
        <View className="flex-1 items-center justify-center p-4">
          <Ionicons name="leaf-outline" size={64} color="#9ca3af" />
          <Text className="mb-2 mt-4 text-center text-xl font-medium text-gray-700 dark:text-gray-300">
            No grows yet
          </Text>
          <Text className="mb-6 text-center text-gray-500 dark:text-gray-400">
            Start tracking your first mushroom grow by adding one.
          </Text>
          <TouchableOpacity className="rounded-md bg-blue-500 px-4 py-3" onPress={handleAddGrow}>
            <Text className="font-medium text-white">Add Your First Grow</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Grow list */}
      {!loading && grows.length > 0 && (
        <FlatList
          data={grows}
          renderItem={renderGrowItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
    </View>
  );
}
