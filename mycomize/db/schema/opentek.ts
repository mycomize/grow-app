import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Encrypted Database Schema (opentek.db - SQLCipher Encrypted)
 * 
 * Contains all user profile and grow data encrypted with SQLCipher.
 */

// Users table for profile data (no auth data, no payment fields)
export const users = sqliteTable('users', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  profileImage: text('profile_image'), // Base64 encoded image data
});

// Grows table with proper field types
export const grows = sqliteTable('grows', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Basic grow information
  name: text('name'),
  description: text('description'),
  species: text('species'),
  variant: text('variant'),
  location: text('location'),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  
  // Stage dates (stored as YYYY-MM-DD strings)
  inoculationDate: text('inoculation_date'),
  spawnStartDate: text('spawn_start_date'),
  bulkStartDate: text('bulk_start_date'),
  fruitingStartDate: text('fruiting_start_date'),
  fullSpawnColonizationDate: text('full_spawn_colonization_date'),
  fullBulkColonizationDate: text('full_bulk_colonization_date'),
  fruitingPinDate: text('fruiting_pin_date'),
  harvestCompletionDate: text('harvest_completion_date'),
  
  // Status fields
  inoculationStatus: text('inoculation_status'),
  spawnColonizationStatus: text('spawn_colonization_status'),
  bulkColonizationStatus: text('bulk_colonization_status'),
  fruitingStatus: text('fruiting_status'),
  currentStage: text('current_stage'),
  status: text('status'),
  
  // Numeric fields
  s2bRatio: text('s2b_ratio'), // Keep as text since it's often a ratio like "1:2"
  totalCost: real('total_cost'),
  
  // Stage data (complex JSON structure)
  stages: text('stages', { mode: 'json' }).$type<BulkGrowStages>(),
});

// Flushes table for harvest tracking
export const flushes = sqliteTable('flushes', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  growId: integer('grow_id', { mode: 'number' }).notNull().references(() => grows.id, { onDelete: 'cascade' }),
  harvestDate: text('harvest_date'), // YYYY-MM-DD format
  wetYieldGrams: real('wet_yield_grams'),
  dryYieldGrams: real('dry_yield_grams'),
  concentrationMgPerGram: real('concentration_mg_per_gram'),
});

// Export schema for drizzle
export const encryptedSchema = {
  users,
  grows,
  flushes,
};

export interface User {
  userId: number;
  profileImage?: string;
}

export interface CreateUser {
  userId: number;
  profileImage?: string;
}

export interface UpdateUser {
  profileImage?: string;
}

// Item interface for stage data
export interface Item {
  id: string;
  description: string;
  vendor: string;
  quantity: string;
  cost?: string;
  url: string;
  createdDate?: string;
  expirationDate?: string;
}

// Task interface for stage data
export interface Task {
  id: string;
  action: string;
  frequency: string;
  daysAfterStageStart: string;
}

// Environmental condition interface for stage data
export interface EnvironmentalCondition {
  id: string;
  name: string;
  type: string;
  lowerBound: string;
  upperBound: string;
  unit: string;
}

// Stage data interface
export interface BulkStageData {
  items: Item[];
  environmental_conditions: EnvironmentalCondition[];
  tasks: Task[];
  notes: string;
}

// Complete stages structure
export interface BulkGrowStages {
  inoculation: BulkStageData;
  spawn_colonization: BulkStageData;
  bulk_colonization: BulkStageData;
  fruiting: BulkStageData;
  harvest: BulkStageData;
}

// Grow interface with proper types
export interface Grow {
  id: number;
  userId: number;
  name?: string;
  description?: string;
  species?: string;
  variant?: string;
  location?: string;
  tags?: string[];
  inoculationDate?: string;
  spawnStartDate?: string;
  bulkStartDate?: string;
  fruitingStartDate?: string;
  fullSpawnColonizationDate?: string;
  fullBulkColonizationDate?: string;
  fruitingPinDate?: string;
  harvestCompletionDate?: string;
  inoculationStatus?: string;
  spawnColonizationStatus?: string;
  bulkColonizationStatus?: string;
  fruitingStatus?: string;
  currentStage?: string;
  status?: string;
  s2bRatio?: string;
  totalCost?: number;
  stages?: BulkGrowStages;
}

export interface CreateGrow {
  userId: number;
  name?: string;
  description?: string;
  species?: string;
  variant?: string;
  location?: string;
  tags?: string[];
  inoculationDate?: string;
  spawnStartDate?: string;
  bulkStartDate?: string;
  fruitingStartDate?: string;
  fullSpawnColonizationDate?: string;
  fullBulkColonizationDate?: string;
  fruitingPinDate?: string;
  harvestCompletionDate?: string;
  inoculationStatus?: string;
  spawnColonizationStatus?: string;
  bulkColonizationStatus?: string;
  fruitingStatus?: string;
  currentStage?: string;
  status?: string;
  s2bRatio?: string;
  totalCost?: number;
  stages?: BulkGrowStages;
}

export interface UpdateGrow {
  name?: string;
  description?: string;
  species?: string;
  variant?: string;
  location?: string;
  tags?: string[];
  inoculationDate?: string;
  spawnStartDate?: string;
  bulkStartDate?: string;
  fruitingStartDate?: string;
  fullSpawnColonizationDate?: string;
  fullBulkColonizationDate?: string;
  fruitingPinDate?: string;
  harvestCompletionDate?: string;
  inoculationStatus?: string;
  spawnColonizationStatus?: string;
  bulkColonizationStatus?: string;
  fruitingStatus?: string;
  currentStage?: string;
  status?: string;
  s2bRatio?: string;
  totalCost?: number;
  stages?: BulkGrowStages;
}

// Flush interface
export interface Flush {
  id: number;
  growId: number;
  harvestDate?: string;
  wetYieldGrams?: number;
  dryYieldGrams?: number;
  concentrationMgPerGram?: number;
}

export interface CreateFlush {
  growId: number;
  harvestDate?: string;
  wetYieldGrams?: number;
  dryYieldGrams?: number;
  concentrationMgPerGram?: number;
}

export interface UpdateFlush {
  harvestDate?: string;
  wetYieldGrams?: number;
  dryYieldGrams?: number;
  concentrationMgPerGram?: number;
}
