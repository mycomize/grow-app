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
  private currentUserId: string | null = null;

  private getMasterKeyStorageKey(userId: string): string {
    return `opentek_master_key_${userId}`;
  }

  private getEncryptionTestKey(userId: string): string {
    return `opentek_encryption_test_${userId}`;
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

      // Test the key by encrypting and decrypting test data
      const testData = 'encryption_test_' + Date.now();
      const encrypted = await this.encryptWithKey(testData, masterKey);
      const decrypted = await this.decryptWithKey(encrypted, masterKey);

      if (decrypted !== testData) {
        throw new Error('Encryption test failed');
      }

      // Store encrypted master key in secure storage
      await this.storeMasterKey(userId, masterKey);

      // Store test data for future validation
      await SecureStore.setItemAsync(this.getEncryptionTestKey(userId), encrypted);

      this.masterKey = masterKey;
      this.currentUserId = userId;
      this.isReady = true;

      return true;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      this.clearKeys();
      return false;
    }
  }

  /**
   * Load existing master key from secure storage for a specific user
   */
  async loadMasterKey(userId: string): Promise<boolean> {
    try {
      const encryptedKeyData = await SecureStore.getItemAsync(this.getMasterKeyStorageKey(userId));
      if (!encryptedKeyData) {
        return false;
      }

      const keyData = JSON.parse(encryptedKeyData);

      // Convert stored key array back to Buffer
      this.masterKey = Buffer.from(keyData.key);

      this.currentUserId = userId;
      this.isReady = true;
      return true;
    } catch (error) {
      console.error('Failed to load master key:', error);
      return false;
    }
  }

  /**
   * Test if encryption is working with current key for the current user
   */
  async testEncryption(): Promise<boolean> {
    try {
      if (!this.isReady || !this.masterKey || !this.currentUserId) {
        return false;
      }

      // Try to decrypt the stored test data
      const testCiphertext = await SecureStore.getItemAsync(
        this.getEncryptionTestKey(this.currentUserId)
      );
      if (!testCiphertext) {
        return false;
      }

      const decrypted = await this.decryptWithKey(testCiphertext, this.masterKey);
      return decrypted.startsWith('encryption_test_');
    } catch (error) {
      console.error('Encryption test failed:', error);
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
   * Encrypt a string value
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('Encryption not initialized');
    }

    return await this.encryptWithKey(plaintext, this.masterKey!);
  }

  /**
   * Decrypt a string value
   */
  async decrypt(ciphertext: string): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('Encryption not initialized');
    }

    if (!this.isEncrypted(ciphertext)) {
      return ciphertext; // Return as-is if not encrypted
    }

    return await this.decryptWithKey(ciphertext, this.masterKey!);
  }

  /**
   * Encrypt a JSON object
   */
  async encryptJSON(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    return await this.encrypt(jsonString);
  }

  /**
   * Decrypt a JSON object
   */
  async decryptJSON(ciphertext: string): Promise<any> {
    const jsonString = await this.decrypt(ciphertext);
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      // If JSON parsing fails, return as string
      return jsonString;
    }
  }

  /**
   * Check if a string is encrypted (has the encryption prefix)
   */
  isEncrypted(data: string): boolean {
    return typeof data === 'string' && data.startsWith(ENCRYPTION_CONFIG.cipherPrefix);
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
        await SecureStore.deleteItemAsync(this.getMasterKeyStorageKey(this.currentUserId));
        await SecureStore.deleteItemAsync(this.getEncryptionTestKey(this.currentUserId));
      }
    } catch (error) {
      console.error('Failed to delete master key:', error);
    }
  }

  /**
   * Change encryption password (re-derive key with new password)
   */
  async changeEncryptionPassword(
    seedWords: string[],
    oldPassword?: string,
    newPassword?: string
  ): Promise<boolean> {
    try {
      // Verify current encryption works
      if (!this.isInitialized() || !this.currentUserId) {
        throw new Error('Encryption not initialized');
      }

      // Derive new master key with new password
      const newMasterKey = await this.deriveMasterKey(seedWords, newPassword);

      // Test the new key
      const testData = 'password_change_test_' + Date.now();
      const encrypted = await this.encryptWithKey(testData, newMasterKey);
      const decrypted = await this.decryptWithKey(encrypted, newMasterKey);

      if (decrypted !== testData) {
        throw new Error('New password encryption test failed');
      }

      // Store the new key
      await this.storeMasterKey(this.currentUserId, newMasterKey);
      await SecureStore.setItemAsync(this.getEncryptionTestKey(this.currentUserId), encrypted);

      this.masterKey = newMasterKey;

      return true;
    } catch (error) {
      console.error('Failed to change encryption password:', error);
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
      32, // 256 bits / 8 = 32 bytes
      'sha256'
    ) as unknown as Buffer;

    return masterKey;
  }

  /**
   * Encrypt data with a specific key
   */
  private async encryptWithKey(plaintext: string, key: Buffer): Promise<string> {
    // Generate random IV (12 bytes for GCM)
    const iv = QuickCrypto.randomBytes(12);

    // Create cipher
    const cipher = QuickCrypto.createCipheriv('aes-256-gcm', key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    const combined = Buffer.concat([iv, encrypted, authTag]);

    // Convert to base64 and add prefix and version
    const base64 = combined.toString('base64');
    return `${ENCRYPTION_CONFIG.cipherPrefix}${ENCRYPTION_CONFIG.version}:${base64}`;
  }

  /**
   * Decrypt data with a specific key
   */
  private async decryptWithKey(ciphertext: string, key: Buffer): Promise<string> {
    // Remove prefix and extract version and data
    if (!ciphertext.startsWith(ENCRYPTION_CONFIG.cipherPrefix)) {
      throw new Error('Invalid ciphertext format');
    }

    const withoutPrefix = ciphertext.substring(ENCRYPTION_CONFIG.cipherPrefix.length);
    const [version, base64Data] = withoutPrefix.split(':', 2);

    if (version !== ENCRYPTION_CONFIG.version) {
      throw new Error(`Unsupported encryption version: ${version}`);
    }

    // Decode base64
    const combined = Buffer.from(base64Data, 'base64');

    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, 12);
    const authTagStart = combined.length - 16;
    const encryptedData = combined.subarray(12, authTagStart);
    const authTag = combined.subarray(authTagStart);

    // Create decipher
    const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Convert back to string
    return decrypted.toString('utf8');
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
      this.getMasterKeyStorageKey(userId),
      JSON.stringify(storageData)
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
