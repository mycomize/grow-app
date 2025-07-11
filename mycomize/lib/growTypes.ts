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
  inoculationDate: Date | null;
  harvestDate: Date | null;
  harvestDryWeight: number;
  harvestWetWeight: number;
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
  fruiting_start_date?: string;
  harvest_date?: string;

  // New unified fields from the enhanced model
  syringe_brand?: string;
  syringe_type?: string;
  syringe_cost?: number;
  syringe_vendor?: string;
  syringe_created_at?: string;
  syringe_expiration_date?: string;

  spawn_weight_lbs?: number;
  spawn_cost?: number;
  spawn_vendor?: string;
  spawn_created_at?: string;
  spawn_expiration_date?: string;

  bulk_weight_lbs?: number;
  bulk_cost?: number;
  bulk_vendor?: string;
  bulk_created_at?: string;
  bulk_expiration_date?: string;

  fruiting_pin_date?: string;
  fruiting_mist_frequency?: string;
  fruiting_fan_frequency?: string;

  harvest_flushes?: any[];
}

// Grow tek options - must match backend enum values
export const growTeks = {
  MONOTUB: 'Monotub',
};

// Human-readable tek names
export const tekLabels = {
  [growTeks.MONOTUB]: 'Monotub',
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
