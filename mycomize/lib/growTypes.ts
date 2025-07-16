// Import shared tek structures for reuse between teks and grows
import type { BulkStageData } from './tekTypes';

// Stage structure specific to bulk grows and bulk grow teks
// This matches the same structure used in bulk grow teks
export interface BulkGrowStages {
  inoculation: BulkStageData;
  spawn_colonization: BulkStageData;
  bulk_colonization: BulkStageData;
  fruiting: BulkStageData;
  harvest: BulkStageData;
}

// IoT Gateway interface for grows
export interface IoTGateway {
  id: number;
  name: string;
  type: string;
  api_url: string;
  is_active: boolean;
}

// Bulk Grow Flush interface - matches backend BulkGrowFlush model
export interface BulkGrowFlush {
  id: number;
  bulk_grow_id: number;
  harvest_date?: string;
  wet_yield_grams?: number;
  dry_yield_grams?: number;
  concentration_mg_per_gram?: number;
}

// Base Bulk Grow interface - matches backend BulkGrow model exactly
export interface BulkGrow {
  id: number;
  name: string;
  description?: string;
  species: string;
  variant?: string;
  location?: string;
  tags?: string[];

  // Stage-specific dates - matches backend exactly
  inoculation_date?: string;
  spawn_start_date?: string;
  bulk_start_date?: string;
  fruiting_start_date?: string;
  full_spawn_colonization_date?: string;
  full_bulk_colonization_date?: string;
  fruiting_pin_date?: string;
  s2b_ratio?: string;

  // Stage statuses - matches backend exactly
  inoculation_status?: string;
  spawn_colonization_status?: string;
  bulk_colonization_status?: string;
  fruiting_status?: string;

  // General fields
  current_stage?: string;
  status?: string;
  total_cost?: number;

  // Stage-based data structure - reuses shared tek structures
  stages?: BulkGrowStages;
}

// Extended interfaces for different API responses - matches backend schemas
export interface BulkGrowWithIoTGateways extends BulkGrow {
  iot_gateways: IoTGateway[];
}

export interface BulkGrowWithFlushes extends BulkGrow {
  flushes: BulkGrowFlush[];
}

export interface BulkGrowComplete extends BulkGrow {
  iot_gateways: IoTGateway[];
  flushes: BulkGrowFlush[];
}

// Create and Update interfaces for API operations
export interface BulkGrowCreate {
  name: string;
  description?: string;
  species: string;
  variant?: string;
  location?: string;
  tags?: string[];
  inoculation_date?: string;
  inoculation_status?: string;
  spawn_start_date?: string;
  spawn_colonization_status?: string;
  bulk_start_date?: string;
  bulk_colonization_status?: string;
  fruiting_start_date?: string;
  fruiting_status?: string;
  full_spawn_colonization_date?: string;
  full_bulk_colonization_date?: string;
  fruiting_pin_date?: string;
  s2b_ratio?: string;
  current_stage?: string;
  status?: string;
  total_cost?: number;
  stages?: BulkGrowStages;
}

export interface BulkGrowUpdate {
  name?: string;
  description?: string;
  species?: string;
  variant?: string;
  location?: string;
  tags?: string[];
  inoculation_date?: string;
  inoculation_status?: string;
  spawn_start_date?: string;
  spawn_colonization_status?: string;
  bulk_start_date?: string;
  bulk_colonization_status?: string;
  fruiting_start_date?: string;
  fruiting_status?: string;
  full_spawn_colonization_date?: string;
  full_bulk_colonization_date?: string;
  fruiting_pin_date?: string;
  s2b_ratio?: string;
  current_stage?: string;
  status?: string;
  total_cost?: number;
  stages?: BulkGrowStages;
}

// Flush Create and Update interfaces
export interface BulkGrowFlushCreate {
  bulk_grow_id: number;
  harvest_date?: string;
  wet_yield_grams?: number;
  dry_yield_grams?: number;
  concentration_mg_per_gram?: number;
}

export interface BulkGrowFlushUpdate {
  harvest_date?: string;
  wet_yield_grams?: number;
  dry_yield_grams?: number;
  concentration_mg_per_gram?: number;
}

// Legacy alias for backward compatibility - use BulkGrow instead
export type Grow = BulkGrow;

// Bulk Grow Stage enum - matches backend BulkGrowStage enum
export const bulkGrowStages = {
  INOCULATION: 'inoculation',
  SPAWN_COLONIZATION: 'spawn_colonization',
  BULK_COLONIZATION: 'bulk_colonization',
  FRUITING: 'fruiting',
  HARVEST: 'harvest',
} as const;

// Bulk Grow Status enum - matches backend BulkGrowStatus enum
export const bulkGrowStatuses = {
  HEALTHY: 'healthy',
  SUSPECT: 'suspect',
  CONTAMINATED: 'contaminated',
  HARVESTED: 'harvested',
  COMPLETED: 'completed',
} as const;

// Bulk Grow Stage Status enum - matches backend BulkGrowStageStatus enum
export const bulkGrowStageStatuses = {
  HEALTHY: 'Healthy',
  SUSPECT: 'Suspect',
  CONTAMINATED: 'Contaminated',
} as const;

// Human-readable stage names
export const stageLabels = {
  [bulkGrowStages.INOCULATION]: 'Inoculation',
  [bulkGrowStages.SPAWN_COLONIZATION]: 'Spawn Colonization',
  [bulkGrowStages.BULK_COLONIZATION]: 'Bulk Colonization',
  [bulkGrowStages.FRUITING]: 'Fruiting',
  [bulkGrowStages.HARVEST]: 'Harvest',
} as const;

// Human-readable status names
export const statusLabels = {
  [bulkGrowStatuses.HEALTHY]: 'Healthy',
  [bulkGrowStatuses.SUSPECT]: 'Suspect',
  [bulkGrowStatuses.CONTAMINATED]: 'Contaminated',
  [bulkGrowStatuses.HARVESTED]: 'Harvested',
  [bulkGrowStatuses.COMPLETED]: 'Completed',
} as const;

// Human-readable stage status names
export const stageStatusLabels = {
  [bulkGrowStageStatuses.HEALTHY]: 'Healthy',
  [bulkGrowStageStatuses.SUSPECT]: 'Suspect',
  [bulkGrowStageStatuses.CONTAMINATED]: 'Contaminated',
} as const;

// Legacy exports for backward compatibility
export const growTeks = {
  BULK_GROW: 'BulkGrow',
};

export const tekLabels = {
  [growTeks.BULK_GROW]: 'Bulk Grow',
};

export const growStatuses = bulkGrowStatuses;
export const growStages = bulkGrowStages;
