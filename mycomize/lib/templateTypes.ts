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
  frequency: string; // Free-form text (e.g., "Daily for 7 days", "Once", "Every 3 days")
  days_after_stage_start: number; // Number of days after the stage begins (e.g., 14 for break and shake on day 14)
}

export interface StageData {
  items: Item[];
  environmental_conditions: EnvironmentalCondition[];
  tasks: Task[];
  notes: string;
}

export interface BulkGrowTekTemplateData {
  // Basic info
  name: string;
  description: string;
  species: string;
  variant: string;
  type: string; // e.g., "BulkGrow", "Shoebox", "Martha Tent"
  is_public: boolean;
  tags: string[];

  // Stage-based data
  stages: {
    inoculation: StageData;
    spawn_colonization: StageData;
    bulk_colonization: StageData;
    fruiting: StageData;
    harvest: StageData;
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
export const createEmptyStageData = (): StageData => ({
  items: [],
  environmental_conditions: [],
  tasks: [],
  notes: '',
});

// Helper function to create empty template data
export const createEmptyTemplateData = (): BulkGrowTekTemplateData => ({
  name: '',
  description: '',
  species: '',
  variant: '',
  type: 'Bulk Grow', // Default to BulkGrow
  is_public: false,
  tags: [],
  stages: {
    inoculation: createEmptyStageData(),
    spawn_colonization: createEmptyStageData(),
    bulk_colonization: createEmptyStageData(),
    fruiting: createEmptyStageData(),
    harvest: createEmptyStageData(),
  },
});

// Template interface for API responses
export interface BulkGrowTekTemplate {
  id: number;
  name: string;
  description?: string;
  species: string;
  variant?: string;
  type: string;
  tags?: string[];
  is_public: boolean;
  created_by: number;
  created_at: string;
  updated_at?: string;
  usage_count: number;
  creator_name?: string;
  creator_profile_image?: string;
  stages?: {
    inoculation: StageData;
    spawn_colonization: StageData;
    bulk_colonization: StageData;
    fruiting: StageData;
    harvest: StageData;
  };
}

// Helper function to generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
