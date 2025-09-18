import * as SecureStore from 'expo-secure-store';

/**
 * Auth Preferences Management
 * 
 * Manages user authentication preferences using secure storage.
 * Preferences are stored per-user using their user ID as a key prefix.
 */

export interface AuthPreferences {
  enableDbEncryption: boolean;
  enableBiometrics: boolean;
}

const DEFAULT_PREFERENCES: AuthPreferences = {
  enableDbEncryption: false,
  enableBiometrics: false,
};

/**
 * Generate secure storage keys for user preferences
 */
const getStorageKey = (userId: string, preference: keyof AuthPreferences): string => {
  return `auth_pref_${userId}_${preference}`;
};

/**
 * Get user's auth preferences from secure storage
 */
export const getUserAuthPreferences = async (userId: string): Promise<AuthPreferences> => {
  console.log(`[AuthPreferences] Loading preferences for user: ${userId}`);
  
  try {
    const enableDbEncryptionKey = getStorageKey(userId, 'enableDbEncryption');
    const enableBiometricsKey = getStorageKey(userId, 'enableBiometrics');

    const [dbEncryptionValue, biometricsValue] = await Promise.all([
      SecureStore.getItemAsync(enableDbEncryptionKey),
      SecureStore.getItemAsync(enableBiometricsKey),
    ]);

    const preferences: AuthPreferences = {
      enableDbEncryption: dbEncryptionValue === 'true',
      enableBiometrics: biometricsValue === 'true',
    };

    console.log(`[AuthPreferences] Loaded preferences for user ${userId}:`, preferences);
    return preferences;

  } catch (error) {
    console.error(`[AuthPreferences] Error loading preferences for user ${userId}:`, error);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Save user's auth preferences to secure storage
 */
export const saveUserAuthPreferences = async (
  userId: string, 
  preferences: AuthPreferences
): Promise<void> => {
  console.log(`[AuthPreferences] Saving preferences for user: ${userId}`, preferences);
  
  try {
    const enableDbEncryptionKey = getStorageKey(userId, 'enableDbEncryption');
    const enableBiometricsKey = getStorageKey(userId, 'enableBiometrics');

    await Promise.all([
      SecureStore.setItemAsync(enableDbEncryptionKey, preferences.enableDbEncryption.toString()),
      SecureStore.setItemAsync(enableBiometricsKey, preferences.enableBiometrics.toString()),
    ]);

    console.log(`[AuthPreferences] Successfully saved preferences for user: ${userId}`);

  } catch (error) {
    console.error(`[AuthPreferences] Error saving preferences for user ${userId}:`, error);
    throw new Error(`Failed to save auth preferences: ${error}`);
  }
};

/**
 * Update a specific auth preference for a user
 */
export const updateUserAuthPreference = async (
  userId: string,
  preference: keyof AuthPreferences,
  value: boolean
): Promise<void> => {
  console.log(`[AuthPreferences] Updating ${preference} to ${value} for user: ${userId}`);
  
  try {
    const currentPreferences = await getUserAuthPreferences(userId);
    const updatedPreferences = {
      ...currentPreferences,
      [preference]: value,
    };
    
    await saveUserAuthPreferences(userId, updatedPreferences);
    console.log(`[AuthPreferences] Successfully updated ${preference} for user: ${userId}`);

  } catch (error) {
    console.error(`[AuthPreferences] Error updating ${preference} for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Clear all auth preferences for a user (useful during logout/account deletion)
 */
export const clearUserAuthPreferences = async (userId: string): Promise<void> => {
  console.log(`[AuthPreferences] Clearing preferences for user: ${userId}`);
  
  try {
    const enableDbEncryptionKey = getStorageKey(userId, 'enableDbEncryption');
    const enableBiometricsKey = getStorageKey(userId, 'enableBiometrics');

    await Promise.all([
      SecureStore.deleteItemAsync(enableDbEncryptionKey),
      SecureStore.deleteItemAsync(enableBiometricsKey),
    ]);

    console.log(`[AuthPreferences] Successfully cleared preferences for user: ${userId}`);

  } catch (error) {
    console.error(`[AuthPreferences] Error clearing preferences for user ${userId}:`, error);
    throw new Error(`Failed to clear auth preferences: ${error}`);
  }
};

/**
 * Check if user has DB encryption enabled
 */
export const isDbEncryptionEnabled = async (userId: string): Promise<boolean> => {
  const preferences = await getUserAuthPreferences(userId);
  return preferences.enableDbEncryption;
};

/**
 * Check if user has biometrics enabled
 */
export const isBiometricsEnabled = async (userId: string): Promise<boolean> => {
  const preferences = await getUserAuthPreferences(userId);
  return preferences.enableBiometrics;
};
