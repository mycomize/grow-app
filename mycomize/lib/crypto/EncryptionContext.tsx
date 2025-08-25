import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getEncryptionService } from '~/lib/crypto/EncryptionService';
import { useAuthSession } from '~/lib/api/AuthContext';

interface EncryptionState {
  isInitialized: boolean;
  isLoading: boolean;
  needsSetup: boolean;
  needsRecovery: boolean;
  initializeEncryption: (seedWords: string[], password?: string) => Promise<boolean>;
  loadExistingEncryption: () => Promise<boolean>;
  clearEncryption: () => Promise<void>;
  checkEncryptionStatus: () => Promise<void>;
}

const EncryptionContext = createContext<EncryptionState | null>(null);

interface EncryptionProviderProps {
  children: ReactNode;
}

export function EncryptionProvider({ children }: EncryptionProviderProps) {
  const { token } = useAuthSession();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);

  // Extract user ID from JWT token (simple implementation)
  const getUserIdFromToken = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.user_id || null;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  };

  const checkEncryptionStatus = async () => {
    setIsLoading(true);
    try {
      if (!token) {
        setIsInitialized(false);
        setNeedsSetup(false);
        setNeedsRecovery(false);
        setIsLoading(false);
        return;
      }

      const userId = getUserIdFromToken(token);
      if (!userId) {
        console.error('Could not extract user ID from token');
        setIsInitialized(false);
        setNeedsSetup(false);
        setNeedsRecovery(false);
        setIsLoading(false);
        return;
      }

      const encryptionService = getEncryptionService();

      // Try to load existing encryption key for this user
      const hasExistingKey = await encryptionService.loadMasterKey(userId);

      if (hasExistingKey) {
        // Test if the loaded encryption works
        const testResult = await encryptionService.testEncryption();
        if (testResult) {
          setIsInitialized(true);
          setNeedsSetup(false);
          setNeedsRecovery(false);
        } else {
          // Key exists but doesn't work, needs recovery
          setIsInitialized(false);
          setNeedsSetup(false);
          setNeedsRecovery(true);
        }
      } else {
        // No existing key, user is either new or needs to recover
        setIsInitialized(false);
        setNeedsSetup(false); // We'll determine this based on user choice
        setNeedsRecovery(false);
      }
    } catch (error) {
      console.error('Failed to check encryption status:', error);
      setIsInitialized(false);
      setNeedsSetup(false);
      setNeedsRecovery(false);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeEncryption = async (seedWords: string[], password?: string): Promise<boolean> => {
    try {
      if (!token) {
        console.error('No authentication token available');
        return false;
      }

      const userId = getUserIdFromToken(token);
      if (!userId) {
        console.error('Could not extract user ID from token');
        return false;
      }

      const encryptionService = getEncryptionService();
      const success = await encryptionService.initializeEncryption(userId, seedWords, password);

      if (success) {
        setIsInitialized(true);
        setNeedsSetup(false);
        setNeedsRecovery(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      return false;
    }
  };

  const loadExistingEncryption = async (): Promise<boolean> => {
    try {
      if (!token) {
        console.error('No authentication token available');
        return false;
      }

      const userId = getUserIdFromToken(token);
      if (!userId) {
        console.error('Could not extract user ID from token');
        return false;
      }

      const encryptionService = getEncryptionService();
      const success = await encryptionService.loadMasterKey(userId);

      if (success) {
        // Test encryption to make sure it works
        const testResult = await encryptionService.testEncryption();
        if (testResult) {
          setIsInitialized(true);
          setNeedsSetup(false);
          setNeedsRecovery(false);
          return true;
        }
      }

      // If we get here, loading failed or test failed
      setIsInitialized(false);
      setNeedsRecovery(true);
      return false;
    } catch (error) {
      console.error('Failed to load existing encryption:', error);
      setIsInitialized(false);
      setNeedsRecovery(true);
      return false;
    }
  };

  const clearEncryption = async (): Promise<void> => {
    try {
      const encryptionService = getEncryptionService();
      await encryptionService.deleteMasterKey();
      encryptionService.clearKeys();

      setIsInitialized(false);
      setNeedsSetup(false);
      setNeedsRecovery(false);
    } catch (error) {
      console.error('Failed to clear encryption:', error);
    }
  };

  // Check encryption status on mount and when token changes (user switches)
  useEffect(() => {
    checkEncryptionStatus();
  }, [token]);

  // Clear encryption keys when user logs out
  useEffect(() => {
    if (!token) {
      const encryptionService = getEncryptionService();
      encryptionService.clearKeys();
      setIsInitialized(false);
      setNeedsSetup(false);
      setNeedsRecovery(false);
    }
  }, [token]);

  const value: EncryptionState = {
    isInitialized,
    isLoading,
    needsSetup,
    needsRecovery,
    initializeEncryption,
    loadExistingEncryption,
    clearEncryption,
    checkEncryptionStatus,
  };

  return <EncryptionContext.Provider value={value}>{children}</EncryptionContext.Provider>;
}

export function useEncryption(): EncryptionState {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
}

/**
 * Hook to determine if user needs encryption setup or recovery
 * Returns appropriate action based on encryption state
 */
export function useEncryptionFlow() {
  const encryption = useEncryption();

  const getRequiredAction = (): 'none' | 'setup' | 'recovery' | 'loading' => {
    if (encryption.isLoading) return 'loading';
    if (encryption.isInitialized) return 'none';
    if (encryption.needsRecovery) return 'recovery';

    // If not initialized and doesn't specifically need recovery,
    // we let the user choose between setup (new) or recovery (existing)
    return 'none';
  };

  return {
    requiredAction: getRequiredAction(),
    ...encryption,
  };
}
