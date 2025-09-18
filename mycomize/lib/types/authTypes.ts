/**
 * TypeScript interfaces for local authentication system
 * 
 * Defines types for local SQLite authentication using user ID as token
 * while maintaining compatibility with existing encryption setup flow.
 */

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { AuthUser as DatabaseAuthUser } from '../../db/schema/auth';

/**
 * Authentication flag type
 */
export type AuthenticationStatus = boolean;

/**
 * Authenticated user interface
 */
export interface AuthUser {
  id: string;
  username: string;
  hasEncryptionKey: boolean;
  encryptionInitialized: boolean;
}

/**
 * Authentication state for the store
 */
export interface AuthState {
  // Authentication state
  isAuthenticated: boolean; // Simple authentication flag
  currentUser: AuthUser | null;
  isAuthLoading: boolean;

  // Encryption state
  isEncryptionReady: boolean;
  isEncryptionLoading: boolean;
  needsEncryptionSetup: boolean;

  // Store initialization state
  isInitializing: boolean;
}

/**
 * Authentication preferences type
 */
export interface AuthPreferences {
  enableDbEncryption: boolean;
  enableBiometrics: boolean;
}

/**
 * Authentication actions for the store
 */
export interface AuthActions {
  // Authentication actions
  register: (username: string, password: string, preferences?: AuthPreferences) => Promise<AuthResult>;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signInWithBiometrics: (username: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;

  // Encryption actions
  initializeEncryption: (seedWords: string[], password?: string) => Promise<boolean>;
  checkUserEncryptionStatus: (userId: string) => Promise<void>;

  // Internal state management
  setAuthenticated: (authenticated: boolean) => void;
  setCurrentUser: (user: AuthUser | null) => void;
  resetEncryptionState: () => void;
}

/**
 * Combined authentication store type
 */
export type AuthStore = AuthState & AuthActions;

/**
 * Authentication credentials for login/register
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Authentication result type
 */
export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * User context data stored locally
 */
export interface UserContextData {
  userId: string;
  username: string;
  lastLogin: number;
}

/**
 * Convert database user to auth user
 */
export const convertToAuthUser = (
  dbUser: DatabaseAuthUser,
  hasEncryptionKey: boolean = false,
  encryptionInitialized: boolean = false
): AuthUser => ({
  id: String(dbUser.id), // Convert number to string
  username: dbUser.username,
  hasEncryptionKey,
  encryptionInitialized,
});

/**
 * Validate user authentication status
 */
export const isUserAuthenticated = (isAuthenticated: boolean, currentUser: AuthUser | null): boolean => {
  return isAuthenticated && currentUser !== null;
};
