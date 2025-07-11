import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const CACHED_IMAGE_PATH = `${FileSystem.documentDirectory}cached_profile_image.jpg`;
const CACHE_METADATA_KEY = 'cached_image_user_id';

/**
 * Cache a profile image for a user
 */
export const cacheProfileImage = async (userId: string, imageUri: string): Promise<void> => {
  try {
    // Save base64 image directly to file
    await FileSystem.writeAsStringAsync(CACHED_IMAGE_PATH, imageUri.split(',')[1], {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Store which user this cached image belongs to
    await AsyncStorage.setItem(CACHE_METADATA_KEY, userId);
  } catch (error) {
    console.error('Error caching profile image:', error);
    throw error;
  }
};

/**
 * Get cached profile image for a user
 */
export const getCachedProfileImage = async (userId: string): Promise<string | null> => {
  try {
    // Check if we have a cached image for this user
    const cachedUserId = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    if (cachedUserId !== userId) {
      return null; // Cached image is for a different user
    }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(CACHED_IMAGE_PATH);
    if (!fileInfo.exists) {
      // File was deleted, clear metadata
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
      return null;
    }

    return CACHED_IMAGE_PATH;
  } catch (error) {
    console.error('Error getting cached profile image:', error);
    return null;
  }
};

/**
 * Clear cached profile image for a user
 */
export const clearCachedProfileImage = async (userId: string): Promise<void> => {
  try {
    // Check if the cached image belongs to this user
    const cachedUserId = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    if (cachedUserId === userId) {
      // Delete the cached file
      await FileSystem.deleteAsync(CACHED_IMAGE_PATH, { idempotent: true });

      // Clear metadata
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
    }
  } catch (error) {
    console.error('Error clearing cached profile image:', error);
  }
};
