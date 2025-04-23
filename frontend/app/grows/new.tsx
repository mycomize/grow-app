import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/auth';
import { growApi } from '../../services/grow';

export default function AddGrowScreen() {
  const { token } = useAuth();
  const router = useRouter();

  // Form state
  const [species, setSpecies] = useState('');
  const [variant, setVariant] = useState('');
  const [inoculationDate, setInoculationDate] = useState(new Date());
  const [spawnSubstrate, setSpawnSubstrate] = useState('');
  const [bulkSubstrate, setBulkSubstrate] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form validation
  const validateForm = () => {
    if (!species.trim()) {
      setError('Species is required');
      return false;
    }
    if (!variant.trim()) {
      setError('Variant is required');
      return false;
    }
    if (!spawnSubstrate.trim()) {
      setError('Spawn substrate is required');
      return false;
    }
    if (!bulkSubstrate.trim()) {
      setError('Bulk substrate is required');
      return false;
    }
    return true;
  };

  // Handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setInoculationDate(selectedDate);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!token) {
      setError('You must be logged in to add a grow');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format date as ISO string for API
      const formattedDate = inoculationDate.toISOString().split('T')[0];

      // Call API to create grow
      await growApi.createGrow(token, {
        species,
        variant,
        inoculation_date: formattedDate,
        spawn_substrate: spawnSubstrate,
        bulk_substrate: bulkSubstrate,
      });

      // Navigate back to grows list on success
      router.replace('/(tabs)/grows' as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create grow');
      console.error('Error creating grow:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="p-4">
        <Text className="mb-6 text-center text-2xl font-bold text-gray-800 dark:text-white">
          Add New Grow
        </Text>

        {/* Species */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Species *
          </Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="e.g., Pleurotus ostreatus"
            placeholderTextColor="#9CA3AF"
            value={species}
            onChangeText={setSpecies}
            testID="species-input"
          />
        </View>

        {/* Variant */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Variant *
          </Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="e.g., Pearl Oyster"
            placeholderTextColor="#9CA3AF"
            value={variant}
            onChangeText={setVariant}
            testID="variant-input"
          />
        </View>

        {/* Inoculation Date */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Inoculation Date *
          </Text>

          {/* Date picker button - show differently based on platform */}
          <TouchableOpacity
            className="h-12 w-full flex-row items-center justify-between rounded-md border border-gray-300 bg-white px-4 dark:border-gray-700 dark:bg-gray-800"
            onPress={() => setShowDatePicker(true)}>
            <Text className="text-black dark:text-white">
              {inoculationDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {/* Date picker - show based on platform */}
          {showDatePicker && (
            <DateTimePicker
              value={inoculationDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Spawn Substrate */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Spawn Substrate *
          </Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="e.g., Rye Grain"
            placeholderTextColor="#9CA3AF"
            value={spawnSubstrate}
            onChangeText={setSpawnSubstrate}
            testID="spawn-substrate-input"
          />
        </View>

        {/* Bulk Substrate */}
        <View className="mb-6">
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Bulk Substrate *
          </Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="e.g., Hardwood Sawdust"
            placeholderTextColor="#9CA3AF"
            value={bulkSubstrate}
            onChangeText={setBulkSubstrate}
            testID="bulk-substrate-input"
          />
        </View>

        {/* Error message */}
        {error && (
          <View className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
            <Text className="text-red-800 dark:text-red-200">{error}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          className="h-12 w-full items-center justify-center rounded-md bg-blue-600 disabled:bg-blue-400"
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-medium text-white">Add Grow</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
