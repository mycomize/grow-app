import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { getEncryptionService } from '~/lib/crypto/EncryptionService';
import {
  AuthState,
  AuthActions,
  AuthStore,
  AuthUser,
  AuthResult,
  convertToAuthUser,
} from '../types/authTypes';
import {
  createUser,
  validateUser,
} from '../db/authDb';
import {
  saveUserAuthPreferences,
  getUserAuthPreferences,
  isDbEncryptionEnabled,
  isBiometricsEnabled,
  type AuthPreferences,
} from '~/lib/auth/authPreferences';

import { getUserByUsername } from '../db/authDb';
import { authenticateWithBiometrics } from '~/lib/auth/biometricAuth';

/**
 * Local Authentication Store using SQLite
 * 
 * Handles offline authentication with local database storage and maintains
 * compatibility with existing encryption setup flow.
 */
const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  currentUser: null,
  isAuthLoading: false,
  isEncryptionReady: false,
  isEncryptionLoading: false,
  needsEncryptionSetup: false,
  isInitializing: false,

  // Authentication actions
  register: async (username: string, password: string, preferences?: AuthPreferences): Promise<AuthResult> => {
    console.log(`[AuthStore] Starting registration for user: ${username}`);
    set({ isAuthLoading: true });

    try {
      // Input validation
      if (!username || username.trim().length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' };
      }
      
      if (!password || password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      // Create user in database
      const dbUser = await createUser(username.trim(), password);
      const userId = String(dbUser.id);
      
      // Save auth preferences if provided
      if (preferences) {
        await saveUserAuthPreferences(userId, preferences);
        console.log(`[AuthStore] Saved auth preferences for user: ${userId}`, preferences);
      }
      
      console.log(`[AuthStore] User registered successfully with ID: ${dbUser.id}`);
      set({ isAuthLoading: false });
      
      // Navigate to login screen after successful registration
      router.replace('/login');
      return { success: true };

    } catch (error: any) {
      console.error('[AuthStore] Registration failed:', error);
      set({ isAuthLoading: false });

      // Handle specific error cases
      if (error.message?.includes('Username already exists')) {
        return { success: false, error: 'This username is already taken. Please choose another one.' };
      }

      return { success: false, error: error.message || 'Registration failed. Please try again.' };
    }
  },

  signIn: async (username: string, password: string): Promise<AuthResult> => {
    console.log(`[AuthStore] Starting sign in for user: ${username}`);
    set({ isAuthLoading: true });

    try {
      // Input validation
      if (!username || !password) {
        return { success: false, error: 'Username and password are required' };
      }

      // Validate credentials against database
      const dbUser = await validateUser(username.trim(), password);
      
      if (!dbUser) {
        set({ isAuthLoading: false });
        return { success: false, error: 'Invalid username or password. Please try again.' };
      }

      const userId = String(dbUser.id);

      // Create auth user object
      const user: AuthUser = convertToAuthUser(dbUser, false, false);

      // Store auth state
      set({
        isAuthenticated: true,
        currentUser: user,
        isAuthLoading: false,
      });

      // Load user preferences and check encryption status
      const userPreferences = await getUserAuthPreferences(userId);
      console.log(`[AuthStore] Loaded user preferences:`, userPreferences);

      // Only check encryption status if user has enabled DB encryption
      if (userPreferences.enableDbEncryption) {
        await get().checkUserEncryptionStatus(userId);
      } else {
        // Skip encryption setup if user has disabled it
        set({
          isEncryptionReady: false,
          isEncryptionLoading: false,
          needsEncryptionSetup: false,
        });
      }

      console.log(`[AuthStore] Sign in completed successfully for user: ${username}`);

      // Navigate based on encryption setup needs
      const state = get();
      if (userPreferences.enableDbEncryption && state.needsEncryptionSetup) {
        router.replace('/encryption-setup');
      } else {
        router.replace('/');
      }

      return { success: true };

    } catch (error: any) {
      console.error('[AuthStore] Sign in failed:', error);
      set({
        isAuthLoading: false,
        isAuthenticated: false,
        currentUser: null,
      });

      return { success: false, error: 'Authentication failed. Please try again.' };
    }
  },

  signInWithBiometrics: async (username: string): Promise<AuthResult> => {
    console.log(`[AuthStore] Starting biometric sign in for user: ${username}`);
    set({ isAuthLoading: true });

    try {
      // Input validation
      if (!username) {
        return { success: false, error: 'Username is required' };
      }

      // Get user from database (without password validation)
      const dbUser = await getUserByUsername(username.trim());
      
      if (!dbUser) {
        set({ isAuthLoading: false });
        return { success: false, error: 'User not found' };
      }

      const userId = String(dbUser.id);

      // Check if user has biometrics enabled
      const userPreferences = await getUserAuthPreferences(userId);
      if (!userPreferences.enableBiometrics) {
        set({ isAuthLoading: false });
        return { success: false, error: 'Biometric authentication is not enabled for this user' };
      }

      // Perform biometric authentication
      const biometricResult = await authenticateWithBiometrics(`Authenticate as ${username}`);
      
      if (!biometricResult.success) {
        set({ isAuthLoading: false });
        if (biometricResult.cancelled) {
          return { success: false, error: 'Biometric authentication was cancelled' };
        }
        return { success: false, error: biometricResult.error || 'Biometric authentication failed' };
      }

      // Create auth user object
      const user: AuthUser = convertToAuthUser(dbUser, false, false);

      // Store auth state
      set({
        isAuthenticated: true,
        currentUser: user,
        isAuthLoading: false,
      });

      console.log(`[AuthStore] Loaded user preferences:`, userPreferences);

      // Only check encryption status if user has enabled DB encryption
      if (userPreferences.enableDbEncryption) {
        await get().checkUserEncryptionStatus(userId);
      } else {
        // Skip encryption setup if user has disabled it
        set({
          isEncryptionReady: false,
          isEncryptionLoading: false,
          needsEncryptionSetup: false,
        });
      }

      console.log(`[AuthStore] Biometric sign in completed successfully for user: ${username}`);

      // Navigate based on encryption setup needs
      const state = get();
      if (userPreferences.enableDbEncryption && state.needsEncryptionSetup) {
        router.replace('/encryption-setup');
      } else {
        router.replace('/');
      }

      return { success: true };

    } catch (error: any) {
      console.error('[AuthStore] Biometric sign in failed:', error);
      set({
        isAuthLoading: false,
        isAuthenticated: false,
        currentUser: null,
      });

      return { success: false, error: 'Biometric authentication failed. Please try again.' };
    }
  },

  signOut: async (): Promise<void> => {
    console.log('[AuthStore] Starting sign out');

    try {
      // Clear encryption service state
      const encryptionService = getEncryptionService();
      encryptionService.clearKeys();

      // Clear store state
      set({
        isAuthenticated: false,
        currentUser: null,
        isAuthLoading: false,
        isEncryptionReady: false,
        isEncryptionLoading: false,
        needsEncryptionSetup: false,
        isInitializing: false,
      });

      // Navigate to login
      router.replace('/login');
      console.log('[AuthStore] Sign out completed successfully');

    } catch (error) {
      console.error('[AuthStore] Error during sign out:', error);
      throw error;
    }
  },

  // Encryption actions
  initializeEncryption: async (seedWords: string[], password?: string): Promise<boolean> => {
    console.log('[AuthStore] Starting encryption initialization');
    const { currentUser } = get();

    if (!currentUser) {
      console.error('[AuthStore] No current user for encryption initialization');
      return false;
    }

    set({ isEncryptionLoading: true });

    try {
      const encryptionService = getEncryptionService();
      const success = await encryptionService.initializeEncryption(
        currentUser.id,
        seedWords,
        password
      );

      if (success) {
        // Update user and state
        const updatedUser: AuthUser = {
          ...currentUser,
          hasEncryptionKey: true,
          encryptionInitialized: true,
        };

        set({
          currentUser: updatedUser,
          isEncryptionReady: true,
          isEncryptionLoading: false,
          needsEncryptionSetup: false,
        });

        console.log('[AuthStore] Encryption initialization successful');
        return true;
      }

      set({ isEncryptionLoading: false });
      return false;

    } catch (error) {
      console.error('[AuthStore] Encryption initialization failed:', error);
      set({ isEncryptionLoading: false });
      return false;
    }
  },

  checkUserEncryptionStatus: async (userId: string): Promise<void> => {
    console.log(`[AuthStore] Checking encryption status for user: ${userId}`);
    set({ isEncryptionLoading: true });

    try {
      // Try to load the master key
      const encryptionService = getEncryptionService();
      const keyLoaded = await encryptionService.loadMasterKey(userId);

      if (keyLoaded) {
        const { currentUser } = get();

        if (currentUser && currentUser.id === userId) {
          const updatedUser: AuthUser = {
            ...currentUser,
            hasEncryptionKey: true,
            encryptionInitialized: true,
          };

          set({
            currentUser: updatedUser,
            isEncryptionReady: true,
            isEncryptionLoading: false,
            needsEncryptionSetup: false,
          });

          console.log(`[AuthStore] Encryption loaded successfully for user: ${userId}`);
          return;
        }
      } else {
        console.log(`[AuthStore] No existing encryption key found for user: ${userId}`);
      }

      // No working encryption found - user needs setup
      const { currentUser } = get();

      if (currentUser && currentUser.id === userId) {
        const updatedUser: AuthUser = {
          ...currentUser,
          hasEncryptionKey: false,
          encryptionInitialized: false,
        };

        set({
          currentUser: updatedUser,
          isEncryptionReady: false,
          isEncryptionLoading: false,
          needsEncryptionSetup: true,
        });

        console.log(`[AuthStore] User ${userId} needs encryption setup`);
      }

    } catch (error) {
      console.error(`[AuthStore] Error checking encryption status for user ${userId}:`, error);
      set({
        isEncryptionReady: false,
        isEncryptionLoading: false,
        needsEncryptionSetup: true,
      });
    }
  },

  // Internal state management
  setAuthenticated: (authenticated: boolean) => {
    set({ isAuthenticated: authenticated });
  },

  setCurrentUser: (user: AuthUser | null) => {
    set({ currentUser: user });
  },

  resetEncryptionState: () => {
    set({
      isEncryptionReady: false,
      isEncryptionLoading: false,
      needsEncryptionSetup: false,
    });
  },


}));

// Optimized selector hooks using useShallow to prevent unnecessary re-renders

// Auth selectors
export const useAuth = () => 
  useAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      currentUser: state.currentUser,
      isAuthLoading: state.isAuthLoading,
      signIn: state.signIn,
      signInWithBiometrics: state.signInWithBiometrics,
      signOut: state.signOut,
      register: state.register,
    }))
  );

export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useCurrentUser = () => useAuthStore((state) => state.currentUser);
export const useIsAuthLoading = () => useAuthStore((state) => state.isAuthLoading);

// Encryption selectors
export const useEncryption = () =>
  useAuthStore(
    useShallow((state) => ({
      isEncryptionReady: state.isEncryptionReady,
      isEncryptionLoading: state.isEncryptionLoading,
      needsEncryptionSetup: state.needsEncryptionSetup,
      initializeEncryption: state.initializeEncryption,
      checkUserEncryptionStatus: state.checkUserEncryptionStatus,
      resetEncryptionState: state.resetEncryptionState,
    }))
  );

export const useIsEncryptionReady = () => useAuthStore((state) => state.isEncryptionReady);
export const useIsEncryptionLoading = () => useAuthStore((state) => state.isEncryptionLoading);
export const useNeedsEncryptionSetup = () => useAuthStore((state) => state.needsEncryptionSetup);

// Combined selectors
export const useAuthEncryption = () =>
  useAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      currentUser: state.currentUser,
      isAuthLoading: state.isAuthLoading,
      isEncryptionReady: state.isEncryptionReady,
      isEncryptionLoading: state.isEncryptionLoading,
      needsEncryptionSetup: state.needsEncryptionSetup,
      isInitializing: state.isInitializing,
    }))
  );

export const useIsInitializing = () => useAuthStore((state) => state.isInitializing);

// Action selectors to prevent infinite loops
export const useSignIn = () => useAuthStore((state) => state.signIn);
export const useSignInWithBiometrics = () => useAuthStore((state) => state.signInWithBiometrics);
export const useSignOut = () => useAuthStore((state) => state.signOut);
export const useRegister = () => useAuthStore((state) => state.register);
export const useInitializeEncryption = () => useAuthStore((state) => state.initializeEncryption);
export const useCheckUserEncryptionStatus = () => useAuthStore((state) => state.checkUserEncryptionStatus);

// Export the main store for direct access when needed
export default useAuthStore;

export const useEncryptionFlow = () => {
  const encryption = useEncryption();
  
  const getRequiredAction = (): 'none' | 'setup' | 'recovery' | 'loading' => {
    if (encryption.isEncryptionLoading) return 'loading';
    if (encryption.isEncryptionReady) return 'none';
    if (encryption.needsEncryptionSetup) return 'setup';
    return 'none';
  };

  return {
    requiredAction: getRequiredAction(),
    isInitialized: encryption.isEncryptionReady,
    isLoading: encryption.isEncryptionLoading,
    needsSetup: encryption.needsEncryptionSetup,
    needsRecovery: false, // Simplified for now
    initializeEncryption: encryption.initializeEncryption,

    loadExistingEncryption: async () => true, // Handled automatically by checkUserEncryptionStatus

    clearEncryption: async () => {
      const encryptionService = getEncryptionService();
      await encryptionService.deleteMasterKey();
      encryptionService.clearKeys();
      encryption.resetEncryptionState();
    },

    checkEncryptionStatus: async () => {
      const currentUser = useAuthStore.getState().currentUser;
      if (currentUser) {
        await encryption.checkUserEncryptionStatus(currentUser.id);
      }
    },
  };
};
