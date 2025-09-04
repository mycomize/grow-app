import * as SecureStore from 'expo-secure-store';
import { UserStorageKeys } from '../types/authEncryptionTypes';

/**
 * Manages user-specific encryption context switching and storage isolation
 */
export class UserContextManager {
  
  /**
   * Generate user-specific storage keys for encryption isolation
   */
  static getUserStorageKeys(userId: string): UserStorageKeys {
    return {
      masterKey: `opentek_master_key_${userId}`,
      encryptionConfig: `opentek_encryption_config_${userId}`,
      authState: `opentek_auth_state_${userId}`,
    };
  }

  /**
   * Check if user has existing encryption setup
   */
  static async hasUserEncryptionSetup(userId: string): Promise<boolean> {
    try {
      const keys = this.getUserStorageKeys(userId);
      const masterKeyData = await SecureStore.getItemAsync(keys.masterKey);
      const testKey = `opentek_encryption_test_${userId}`;
      const testData = await SecureStore.getItemAsync(testKey);
      
      return masterKeyData !== null && testData !== null;
    } catch (error) {
      console.error(`Error checking encryption setup for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Clean up encryption data for a specific user
   */
  static async clearUserEncryptionData(userId: string): Promise<void> {
    try {
      const keys = this.getUserStorageKeys(userId);
      const testKey = `opentek_encryption_test_${userId}`;
      
      // Remove all user-specific encryption data
      await Promise.allSettled([
        SecureStore.deleteItemAsync(keys.masterKey),
        SecureStore.deleteItemAsync(keys.encryptionConfig),
        SecureStore.deleteItemAsync(testKey),
      ]);
      
      console.log(`Cleared encryption data for user ${userId}`);
    } catch (error) {
      console.error(`Error clearing encryption data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Store user authentication state (including their token)
   */
  static async storeUserAuthState(userId: string, authData: { token: string; user: any }): Promise<void> {
    try {
      const keys = this.getUserStorageKeys(userId);
      await SecureStore.setItemAsync(
        keys.authState,
        JSON.stringify({
          ...authData,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error(`Error storing auth state for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Load user authentication state (including their token)
   */
  static async loadUserAuthState(userId: string): Promise<{ token: string; user: any } | null> {
    try {
      const keys = this.getUserStorageKeys(userId);
      const authDataString = await SecureStore.getItemAsync(keys.authState);
      
      if (!authDataString) {
        return null;
      }
      
      return JSON.parse(authDataString);
    } catch (error) {
      console.error(`Error loading auth state for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Clear user authentication state
   */
  static async clearUserAuthState(userId: string): Promise<void> {
    try {
      const keys = this.getUserStorageKeys(userId);
      await SecureStore.deleteItemAsync(keys.authState);
    } catch (error) {
      console.error(`Error clearing auth state for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Store the current user ID for session persistence
   */
  static async storeCurrentUserId(userId: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('opentek_current_user_id', userId);
    } catch (error) {
      console.error('Error storing current user ID:', error);
      throw error;
    }
  }

  /**
   * Load the current user ID
   */
  static async loadCurrentUserId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('opentek_current_user_id');
    } catch (error) {
      console.error('Error loading current user ID:', error);
      return null;
    }
  }

  /**
   * Clear the current user ID
   */
  static async clearCurrentUserId(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('opentek_current_user_id');
    } catch (error) {
      console.error('Error clearing current user ID:', error);
      throw error;
    }
  }

  /**
   * Get the current user's token
   */
  static async getCurrentUserToken(): Promise<string | null> {
    try {
      const currentUserId = await this.loadCurrentUserId();
      if (!currentUserId) {
        return null;
      }

      const authState = await this.loadUserAuthState(currentUserId);
      return authState?.token || null;
    } catch (error) {
      console.error('Error loading current user token:', error);
      return null;
    }
  }

  /**
   * Perform complete cleanup when a user logs out
   */
  static async performLogoutCleanup(userId?: string): Promise<void> {
    try {
      // Clear current user session
      await this.clearCurrentUserId();

      // If specific user ID provided, clear their auth state
      if (userId) {
        await this.clearUserAuthState(userId);
      }
      
      console.log('Completed logout cleanup');
    } catch (error) {
      console.error('Error during logout cleanup:', error);
      throw error;
    }
  }

  /**
   * Switch to a different user context
   */
  static async switchUserContext(fromUserId: string, toUserId: string): Promise<void> {
    try {
      // Store the current user as the new active user
      await this.storeCurrentUserId(toUserId);
      
      console.log(`Switched user context from ${fromUserId} to ${toUserId}`);
    } catch (error) {
      console.error(`Error switching user context from ${fromUserId} to ${toUserId}:`, error);
      throw error;
    }
  }

  /**
   * Debug method to list all stored keys for a user (development only)
   */
  static async debugListUserKeys(userId: string): Promise<{ [key: string]: boolean }> {
    if (__DEV__) {
      const keys = this.getUserStorageKeys(userId);
      const testKey = `opentek_encryption_test_${userId}`;
      
      const results: { [key: string]: boolean } = {};
      
      try {
        results[keys.masterKey] = await SecureStore.getItemAsync(keys.masterKey) !== null;
        results[keys.encryptionConfig] = await SecureStore.getItemAsync(keys.encryptionConfig) !== null;
        results[keys.authState] = await SecureStore.getItemAsync(keys.authState) !== null;
        results[testKey] = await SecureStore.getItemAsync(testKey) !== null;
        results['current_user'] = await SecureStore.getItemAsync('opentek_current_user_id') !== null;
        
        return results;
      } catch (error) {
        console.error('Error in debug key listing:', error);
        return {};
      }
    }
    return {};
  }
}
