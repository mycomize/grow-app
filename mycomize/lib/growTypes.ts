// Import shared template structures for reuse between teks and grows
import type { Item, EnvironmentalCondition, Task, StageData } from './templateTypes';

// Stage structure specific to bulk grows and bulk grow tek templates
// This matches the same structure used in bulk grow tek templates
export interface BulkGrowStages {
  inoculation: StageData;
  spawn_colonization: StageData;
  bulk_colonization: StageData;
  fruiting: StageData;
  harvest: StageData;
}

// Grow interface for the unified system
export interface Grow {
  id: number;
  name: string;
  description?: string;
  species: string;
  variant: string;
  tags?: string[];
  tek: string;
  stage: string;
  status: string;
  cost: number;
  age: number;
  iot_gateways?: Array<{
    id: number;
    name: string;
    type: string;
    api_url: string;
    is_active: boolean;
  }>;

  // Stage tracking fields
  current_stage?: string;
  inoculation_date?: string;
  spawn_colonization_date?: string;
  bulk_colonization_date?: string;

  // Updated fields after simplification
  inoculation_status?: string;
  spawn_status?: string;
  bulk_status?: string;
  fruiting_pin_date?: string;
  fruiting_status?: string;

  // Stage-based data structure - reuses shared template structures
  // For bulk grows, this follows the BulkGrowStages interface
  stages?: BulkGrowStages;

  harvest_flushes?: Array<{
    id: number;
    grow_id: number;
    harvest_date?: string;
    wet_weight_grams?: number;
    dry_weight_grams?: number;
    concentration_mg_per_gram?: number;
  }>;
}

// Grow tek options - must match backend enum values
export const growTeks = {
  BULK_GROW: 'BulkGrow',
};

// Human-readable tek names
export const tekLabels = {
  [growTeks.BULK_GROW]: 'Bulk Grow',
};

// Grow status options - must match backend enum values
export const growStatuses = {
  GROWING: 'growing',
  CONTAMINATED: 'contaminated',
  HARVESTED: 'harvested',
};

// Human-readable status names
export const statusLabels = {
  [growStatuses.GROWING]: 'Growing',
  [growStatuses.CONTAMINATED]: 'Contaminated',
  [growStatuses.HARVESTED]: 'Harvested',
};

// Grow stage options - must match backend enum values
export const growStages = {
  SPAWN_COLONIZATION: 'spawn_colonization',
  BULK_COLONIZATION: 'bulk_colonization',
  FRUITING: 'fruiting',
  HARVEST: 'harvest',
};

// Human-readable stage names
export const stageLabels = {
  [growStages.SPAWN_COLONIZATION]: 'Spawn Colonization',
  [growStages.BULK_COLONIZATION]: 'Bulk Colonization',
  [growStages.FRUITING]: 'Fruiting',
  [growStages.HARVEST]: 'Harvest',
};
