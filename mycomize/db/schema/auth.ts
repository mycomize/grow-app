import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Auth Database Schema (auth.db - Unencrypted)
 * 
 * Contains only authentication data that needs to be accessible
 * without encryption for login purposes.
 */

// Auth table for user authentication
export const auth = sqliteTable('auth', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
});

// Export schema for drizzle
export const authSchema = {
  auth,
};

// TypeScript interfaces for auth operations
export interface AuthUser {
  id: number;
  username: string;
  hashedPassword: string;
}

export interface CreateAuthUser {
  username: string;
  hashedPassword: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}
