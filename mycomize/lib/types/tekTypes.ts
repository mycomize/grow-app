export interface Item {
  id: string;
  description: string;
  vendor: string;
  quantity: string; // Free-form text (e.g., "2 lbs", "500ml", "1 bag")
  url: string;
  cost?: string;
  created_date?: string; // ISO date string
  expiration_date?: string; // ISO date string
}

export interface EnvironmentalCondition {
  id: string;
  name: string; // e.g., "Max incubator temperature", "Fruiting humidity"
  type: string; // "Temperature", "Humidity", "CO2", "pH", "Volatile Organic Compounds"
  lower_bound: number; // Lower bound value
  upper_bound: number; // Upper bound value
  unit: string; // Unit based on type (e.g., "°F", "%", "ppm")
}

export interface Task {
  id: string;
  action: string; // e.g., "Break and shake", "Mist substrate"
  frequency: string; // Free-form text (e.g., "Daily for 7 days", "Once", "Every 3 days") - kept for backward compatibility
  repeatCount?: number; // Number of times to repeat (1-10)
  repeatUnit?: 'day' | 'week' | 'stage'; // Unit for repetition
  days_after_stage_start: number; // Number of days after the stage begins (e.g., 14 for break and shake on day 14)
}

export interface BulkStageData {
  items: Item[];
  environmental_conditions: EnvironmentalCondition[];
  tasks: Task[];
  notes: string;
}

export interface BulkGrowTekData {
  // Basic info
  name: string;
  description: string;
  species: string;
  variant: string;
  is_public: boolean;
  tags: string[];

  // Stage-based data
  stages: {
    inoculation: BulkStageData;
    spawn_colonization: BulkStageData;
    bulk_colonization: BulkStageData;
    fruiting: BulkStageData;
    harvest: BulkStageData;
  };
}

export const BULK_GROW_TEK_STAGES = {
  inoculation: 'Inoculation',
  spawn_colonization: 'Spawn Colonization',
  bulk_colonization: 'Bulk Colonization',
  fruiting: 'Fruiting',
  harvest: 'Harvest',
} as const;

export type BulkGrowCultivationStage = keyof typeof BULK_GROW_TEK_STAGES;

export const TEK_TYPES = {
  bulk_grow: 'Bulk Grow',
} as const;

export type TekType = keyof typeof TEK_TYPES;

export const ENVIRONMENTAL_CONDITION_TYPES = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  co2: 'CO₂',
  ph: 'pH',
  voc: 'Volatile Organic Compounds',
} as const;

export type EnvironmentalConditionType = keyof typeof ENVIRONMENTAL_CONDITION_TYPES;

export const CONDITION_UNITS = {
  temperature: ['°F', '°C'],
  humidity: ['%'],
  co2: ['ppm', 'ppb'],
  ph: ['pH'],
  voc: ['ppm', 'ppb', 'mg/m³'],
} as const;

// Helper function to create empty stage data
export const createEmptyBulkStageData = (): BulkStageData => ({
  items: [],
  environmental_conditions: [],
  tasks: [],
  notes: '',
});

// Helper function to create empty tek data
export const createEmptyTekData = (): BulkGrowTekData => ({
  name: '',
  description: '',
  species: '',
  variant: '',
  is_public: false,
  tags: [],
  stages: {
    inoculation: createEmptyBulkStageData(),
    spawn_colonization: createEmptyBulkStageData(),
    bulk_colonization: createEmptyBulkStageData(),
    fruiting: createEmptyBulkStageData(),
    harvest: createEmptyBulkStageData(),
  },
});

// Engagement interface for like/view/import functionality
export interface TekEngagement {
  like_count: number;
  view_count: number;
  import_count: number;
  user_has_liked: boolean;
  user_has_viewed: boolean;
  user_has_imported: boolean;
}

// Tek interface for API responses
export interface BulkGrowTek {
  id: number;
  name: string;
  description?: string;
  species: string;
  variant?: string;
  tags?: string[];
  is_public: boolean;
  usage_count?: number;
  like_count: number;
  view_count: number;
  import_count: number;
  user_has_liked: boolean; // Shows if current user liked this tek
  user_has_viewed: boolean; // Shows if current user viewed this tek
  user_has_imported: boolean; // Shows if current user has imported this tek
  is_owner?: boolean; // Shows if current user owns this tek
  creator_name?: string;
  creator_profile_image?: string;
  stages?: {
    inoculation: BulkStageData;
    spawn_colonization: BulkStageData;
    bulk_colonization: BulkStageData;
    fruiting: BulkStageData;
    harvest: BulkStageData;
  };
}

// Helper function to generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
