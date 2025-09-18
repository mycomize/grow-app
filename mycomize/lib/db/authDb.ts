import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import QuickCrypto from 'react-native-quick-crypto';
import { authSchema, type AuthUser, type CreateAuthUser } from '../../db/schema/auth';
import { globalAuthDb } from '../../app/_layout';
import { waitForDatabase, getDatabaseReady } from './useDatabaseReady';

/**
 * Offline Authentication Database Layer
 * 
 * Handles SQLite database operations for local user authentication
 * using drizzle ORM and expo-sqlite with SHA-256 password hashing.
 * 
 * NOTE: Database instance is now global and imported from root layout
 */

/**
 * Generate salt for password hashing
 */
const generateSalt = (): string => {
  const saltBytes = QuickCrypto.randomBytes(32);
  return saltBytes.toString('hex');
};

/**
 * Hash password with salt using SHA-256
 */
export const hashPassword = (password: string, salt?: string): string => {
  const actualSalt = salt || generateSalt();
  const hash = QuickCrypto.createHash('sha256');
  hash.update(password + actualSalt);
  const hashedPassword = hash.digest('hex');
  
  // Store salt with hash separated by :
  return `${hashedPassword}:${actualSalt}`;
};

/**
 * Verify password against stored hash
 */
export const verifyPassword = (password: string, storedHash: string): boolean => {
  try {
    const [hash, salt] = storedHash.split(':');

    if (!hash || !salt) {
      console.error('[AuthDB] Invalid stored hash format');
      return false;
    }
    
    const verificationHash = hashPassword(password, salt).split(':')[0];
    return hash === verificationHash;

  } catch (error) {
    console.error('[AuthDB] Error verifying password:', error);
    return false;
  }
};

/**
 * Create a new user in the database
 */
export const createUser = async (
  username: string, 
  password: string
): Promise<AuthUser> => {
  console.log(`[AuthDB] Creating user: ${username}`);
  
  try {
    
    const hashedPassword = hashPassword(password);
    
    const newUser: CreateAuthUser = {
      username,
      hashedPassword,
    };
    
    const result = await globalAuthDb.insert(authSchema.auth).values(newUser).returning();
    
    if (result.length === 0) {
      throw new Error('Failed to create user - no result returned');
    }
    
    const createdUser = result[0];
    console.log(`[AuthDB] User created successfully with ID: ${createdUser.id}`);
    
    return createdUser;
  } catch (error: any) {
    console.error('[AuthDB] Error creating user:', error);
    
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint failed') || error.message?.includes('username')) {
      throw new Error('Username already exists');
    }
    
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

/**
 * Get user by username for authentication
 */
export const getUserByUsername = async (
  username: string
): Promise<AuthUser | null> => {
  console.log(`[AuthDB] Getting user by username: ${username}`);
  
  try {
    const result = await globalAuthDb
      .select()
      .from(authSchema.auth)
      .where(eq(authSchema.auth.username, username))
      .limit(1);
    
    if (result.length === 0) {
      console.log(`[AuthDB] User not found: ${username}`);
      return null;
    }
    
    const user = result[0];
    console.log(`[AuthDB] User found with ID: ${user.id}`);
    
    return user;
  } catch (error) {
    console.error('[AuthDB] Error getting user by username:', error);
    throw new Error(`Failed to get user: ${error}`);
  }
};

/**
 * Validate user credentials against the database
 */
export const validateUser = async (
  username: string, 
  password: string
): Promise<AuthUser | null> => {
  console.log(`[AuthDB] Validating user: ${username}`);
  
  try {
    const user = await getUserByUsername(username);
    
    if (!user) {
      console.log(`[AuthDB] User not found for validation: ${username}`);
      return null;
    }
    
    const isValidPassword = verifyPassword(password, user.hashedPassword);
    
    if (!isValidPassword) {
      console.log(`[AuthDB] Invalid password for user: ${username}`);
      return null;
    }
    
    console.log(`[AuthDB] User validated successfully: ${username}`);
    return user;
  } catch (error) {
    console.error('[AuthDB] Error validating user:', error);
    throw new Error(`Failed to validate user: ${error}`);
  }
};

/**
 * Update user password
 */
export const updateUserPassword = async (
  userId: number, 
  newPassword: string
): Promise<void> => {
  console.log(`[AuthDB] Updating password for user ID: ${userId}`);
  
  try {
    const hashedPassword = hashPassword(newPassword);
    
    await globalAuthDb
      .update(authSchema.auth)
      .set({ hashedPassword })
      .where(eq(authSchema.auth.id, userId));
    
    console.log(`[AuthDB] Password updated successfully for user ID: ${userId}`);
  } catch (error) {
    console.error('[AuthDB] Error updating user password:', error);
    throw new Error(`Failed to update password: ${error}`);
  }
};

/**
 * Delete user from database
 */
export const deleteUser = async (
  userId: number
): Promise<void> => {
  console.log(`[AuthDB] Deleting user ID: ${userId}`);
  
  try {
    await globalAuthDb
      .delete(authSchema.auth)
      .where(eq(authSchema.auth.id, userId));
    
    console.log(`[AuthDB] User deleted successfully: ${userId}`);
  } catch (error) {
    console.error('[AuthDB] Error deleting user:', error);
    throw new Error(`Failed to delete user: ${error}`);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (
  userId: number
): Promise<AuthUser | null> => {
  console.log(`[AuthDB] Getting user by ID: ${userId}`);
  
  try {
    const result = await globalAuthDb
      .select()
      .from(authSchema.auth)
      .where(eq(authSchema.auth.id, userId))
      .limit(1);
    
    if (result.length === 0) {
      console.log(`[AuthDB] User not found with ID: ${userId}`);
      return null;
    }
    
    const user = result[0];
    console.log(`[AuthDB] User found: ${user.username}`);
    
    return user;
  } catch (error) {
    console.error('[AuthDB] Error getting user by ID:', error);
    throw new Error(`Failed to get user: ${error}`);
  }
};

/**
 * Check if any users exist in the database
 * Waits for database to be ready before querying
 */
export const hasUsers = async (): Promise<boolean> => {
  try {
    // Check if database is ready immediately
    const { isReady, error } = getDatabaseReady();
    
    if (error) {
      console.error('[AuthDB] Database initialization failed');
      return false;
    }
    
    if (!isReady) {
      console.log('[AuthDB] Waiting for database to be ready...');
      await waitForDatabase();
    }
    
    const result = await globalAuthDb
      .select({ count: authSchema.auth.id })
      .from(authSchema.auth)
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error('[AuthDB] Error checking for users:', error);
    return false;
  }
};

/**
 * Get all users for display purposes (excludes sensitive data)
 * Waits for database to be ready before querying
 */
export const getAllUsers = async (): Promise<Array<{ id: number; username: string }>> => {
  console.log('[AuthDB] Getting all users');
  
  try {
    // Check if database is ready immediately
    const { isReady, error } = getDatabaseReady();
    
    if (error) {
      throw new Error('Database initialization failed');
    }
    
    if (!isReady) {
      console.log('[AuthDB] Waiting for database to be ready...');
      await waitForDatabase();
    }
    
    const result = await globalAuthDb
      .select({
        id: authSchema.auth.id,
        username: authSchema.auth.username,
      })
      .from(authSchema.auth)
      .orderBy(authSchema.auth.username);
    
    console.log(`[AuthDB] Found ${result.length} users`);
    return result;
  } catch (error) {
    console.error('[AuthDB] Error getting all users:', error);
    throw new Error(`Failed to get users: ${error}`);
  }
};
