import * as SecureStore from 'expo-secure-store';
import QuickCrypto from 'react-native-quick-crypto';
import * as bip39 from 'bip39';

interface EncryptionConfig {
  algorithm: string;
  keyDerivation: {
    algorithm: string;
    iterations: number;
    hashFunction: string;
  };
  cipherPrefix: string;
  version: string;
}

const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'AES-256-GCM',
  keyDerivation: {
    algorithm: 'PBKDF2',
    iterations: 600000,
    hashFunction: 'SHA-256',
  },
  cipherPrefix: 'enc_',
  version: 'v1',
};

export class EncryptionService {
  private masterKey: Buffer | null = null;
  private isReady = false;
  private canUseBiometricAuthentication: true | false | undefined = undefined;
  private currentUserId: string | null = null;

  private getMasterKeyKey(userId: string): string {
    return `opentek_master_key_${userId}`;
  }

  /**
   * Generate a new 12-word BIP39 seed phrase
   */
  async generateSeedPhrase(): Promise<string[]> {
    try {
      const mnemonic = bip39.generateMnemonic(128); // 128 bits = 12 words
      return mnemonic.split(' ');
    } catch (error: any) {
      console.error('Failed to generate seed phrase:', error);
      throw new Error('Failed to generate seed phrase');
    }
  }

  /**
   * Validate a BIP39 seed phrase
   */
  validateSeedPhrase(seedWords: string[]): boolean {
    try {
      const mnemonic = seedWords.join(' ');
      return bip39.validateMnemonic(mnemonic);
    } catch (error) {
      console.error('Failed to validate seed phrase:', error);
      return false;
    }
  }

  /**
   * Initialize encryption with seed phrase and optional password for a specific user
   */
  async initializeEncryption(
    userId: string,
    seedWords: string[],
    password?: string
  ): Promise<boolean> {
    
    try {
      // Validate seed phrase
      if (!this.validateSeedPhrase(seedWords)) {
        throw new Error('Invalid seed phrase');
      }
      // Generate master key from seed phrase and password
      const masterKey = await this.deriveMasterKey(seedWords, password);

      // Store encrypted master key in secure storage
      await this.storeMasterKey(userId, masterKey);

      this.masterKey = masterKey;
      this.currentUserId = userId;
      this.isReady = true;

      return true;
    } catch (error) {
      this.clearKeys();
      return false;
    }
  }

  /**
   * Load existing master key from secure storage for a specific user
   */
  async loadMasterKey(userId: string): Promise<boolean> {
    this.canUseBiometricAuthentication = SecureStore.canUseBiometricAuthentication();
    console.log("Can use biometrics:", this.canUseBiometricAuthentication);

    try {
      console.log(`[EncryptionService] Loading master key for user: ${userId}`);
      const encryptedKeyData = await SecureStore.getItemAsync(
        this.getMasterKeyKey(userId)
     );
      if (!encryptedKeyData) {
        console.log(`[EncryptionService] No master key found for user: ${userId}`);
        return false;
      }

      const keyData = JSON.parse(encryptedKeyData);

      // Convert stored key array back to Buffer
      this.masterKey = Buffer.from(keyData.key);

      this.currentUserId = userId;
      this.isReady = true;
      console.log(`[EncryptionService] Master key loaded successfully for user: ${userId}`);
      return true;
    } catch (error) {
      console.error(`[EncryptionService] Failed to load master key for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if encryption service is initialized
   */
  isInitialized(): boolean {
    return this.isReady && this.masterKey !== null;
  }

  /**
   * Clear all encryption keys from memory
   */
  clearKeys(): void {
    this.masterKey = null;
    this.currentUserId = null;
    this.isReady = false;
  }

  /**
   * Delete master key from secure storage for the current user
   */
  async deleteMasterKey(): Promise<void> {
    try {
      if (this.currentUserId) {
        await SecureStore.deleteItemAsync(this.getMasterKeyKey(this.currentUserId));
      }
    } catch (error) {
      console.error('Failed to delete master key:', error);
    }
  }

  /**
   * Switch to a different user context for encryption operations
   */
  async switchUser(userId: string): Promise<boolean> {
    try {
      console.log(`[EncryptionService] Switching user context from ${this.currentUserId} to ${userId}`);
      
      // Clear current user context first
      this.clearUserContext();
      
      // Try to load the new user's encryption key
      const keyLoaded = await this.loadMasterKey(userId);
      
      if (keyLoaded) {
        console.log(`[EncryptionService] Successfully switched to user context: ${userId}`);
        return true;
      } else {
        console.log(`[EncryptionService] Failed to switch to user context ${userId} - no encryption key found`);
        return false;
      }
    } catch (error) {
      console.error(`[EncryptionService] Error switching to user context ${userId}:`, error);
      this.clearUserContext();
      return false;
    }
  }

  /**
   * Get basic encryption status for a specific user (just checks if they have encryption setup)
   */
  async getUserEncryptionStatus(userId: string): Promise<{
    hasEncryptionSetup: boolean;
  }> {
    try {
      console.log(`[EncryptionService] Checking encryption status for user: ${userId}`);
      
      // Check if user has master key stored
      const masterKeyData = await SecureStore.getItemAsync(this.getMasterKeyKey(userId));
      const hasEncryptionSetup = masterKeyData !== null; 

      const status = { hasEncryptionSetup };
      console.log(`[EncryptionService] Encryption status for user ${userId}:`, status);
      return status;
    } catch (error) {
      console.error(`[EncryptionService] Error checking encryption status for user ${userId}:`, error);
      return { hasEncryptionSetup: false };
    }
  }

  /**
   * Clear current user context without affecting stored data
   */
  clearUserContext(): void {
    console.log(`[EncryptionService] Clearing user context for user: ${this.currentUserId}`);

    this.masterKey = null;
    this.currentUserId = null;
    this.isReady = false;
  }

  /**
   * Get the current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Validate that current user ID matches expected user ID for security
   */
  validateCurrentUser(expectedUserId: string): boolean {
    const isValid = this.currentUserId === expectedUserId && this.isReady;
    if (!isValid) {
      console.warn(`[EncryptionService] User validation failed. Expected: ${expectedUserId}, Current: ${this.currentUserId}, Ready: ${this.isReady}`);
    }
    return isValid;
  }

  /**
   * Get SQLCipher database key as hex string
   * This is used for PRAGMA key in SQLCipher databases
   */
  async getDatabaseKey(): Promise<string | null> {
    try {
      if (!this.isInitialized()) {
        console.warn('[EncryptionService] Cannot get database key - encryption not initialized');
        return null;
      }

      if (!this.masterKey) {
        console.warn('[EncryptionService] Cannot get database key - master key not available');
        return null;
      }

      // Convert master key buffer to hex string for SQLCipher
      const hexKey = this.masterKey.toString('hex');
      console.log('[EncryptionService] Database key generated successfully');

      return hexKey;
    } catch (error) {
      console.error('[EncryptionService] Failed to generate database key:', error);
      return null;
    }
  }

  /**
   * Initialize database encryption for a user
   * This prepares the encryption service for database operations
   */
  async initializeDatabaseEncryption(userId: string): Promise<boolean> {
    try {
      console.log(`[EncryptionService] Initializing database encryption for user: ${userId}`);

      // Check if encryption is already initialized for this user
      if (this.isInitialized() && this.currentUserId === userId) {
        console.log(`[EncryptionService] Database encryption already initialized for user: ${userId}`);
        return true;
      }

      // Load master key for the user
      const keyLoaded = await this.loadMasterKey(userId);
      if (!keyLoaded) {
        console.error(`[EncryptionService] Failed to load master key for database encryption - user: ${userId}`);
        return false;
      }

      console.log(`[EncryptionService] Database encryption initialized successfully for user: ${userId}`);
      return true;
    } catch (error) {
      console.error(`[EncryptionService] Failed to initialize database encryption for user ${userId}:`, error);
      this.clearUserContext();
      return false;
    }
  }

  /**
   * Verify that database encryption can be set up for current user
   * This checks that the user has encryption setup and key is available
   */
  async verifyDatabaseEncryptionReady(): Promise<boolean> {
    try {
      if (!this.isInitialized()) {
        console.warn('[EncryptionService] Database encryption not ready - not initialized');
        return false;
      }

      if (!this.currentUserId) {
        console.warn('[EncryptionService] Database encryption not ready - no current user');
        return false;
      }

      const databaseKey = await this.getDatabaseKey();
      if (!databaseKey) {
        console.warn('[EncryptionService] Database encryption not ready - cannot get database key');
        return false;
      }

      console.log(`[EncryptionService] Database encryption ready for user: ${this.currentUserId}`);
      return true;
    } catch (error) {
      console.error('[EncryptionService] Failed to verify database encryption readiness:', error);
      return false;
    }
  }

  // Private helper methods

  /**
   * Derive master key from seed phrase and optional password
   */
  private async deriveMasterKey(seedWords: string[], password?: string): Promise<Buffer> {
    const mnemonic = seedWords.join(' ');

    // Convert mnemonic to seed
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // Create salt with password
    const salt = password ? `opentek-${password}` : 'opentek';

    // Derive master key using PBKDF2 with QuickCrypto
    const masterKey = QuickCrypto.pbkdf2Sync(
      seed,
      salt,
      ENCRYPTION_CONFIG.keyDerivation.iterations,
      32,
      'sha256'
    ) as unknown as Buffer;

    return masterKey;
  }

  /**
   * Store master key in secure storage for a specific user
   */
  private async storeMasterKey(userId: string, key: Buffer): Promise<void> {
    // Convert Buffer to array for JSON serialization
    const keyArray = Array.from(key);

    const storageData = {
      key: keyArray,
      version: ENCRYPTION_CONFIG.version,
      timestamp: Date.now(),
    };

    await SecureStore.setItemAsync(
      this.getMasterKeyKey(userId),
      JSON.stringify(storageData),
    );
  }
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

/**
 * Get the singleton encryption service instance
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}

/**
 * Reset the encryption service instance (for testing)
 */
export function resetEncryptionService(): void {
  encryptionServiceInstance = null;
}
