export interface Item {
  id: string;
  description: string;
  vendor: string;
  quantity: string; // Free-form text (e.g., "2 lbs", "500ml", "1 bag")
  url: string;
}

export interface EnvironmentalCondition {
  id: string;
  name: string; // e.g., "Max incubator temperature", "Fruiting humidity"
  type: string; // "Temperature", "Humidity", "CO2", "pH", "Volatile Organic Compounds"
  lowerBound: number; // Lower bound value
  upperBound: number; // Upper bound value
  unit: string; // Unit based on type (e.g., "°F", "%", "ppm")
}

export interface Task {
  id: string;
  action: string; // e.g., "Break and shake", "Mist substrate"
  frequency: string; // Free-form text (e.g., "Daily for 7 days", "Once", "Every 3 days")
  daysAfterStageStart: number; // Number of days after the stage begins (e.g., 14 for break and shake on day 14)
}

export interface StageData {
  items: Item[];
  environmentalConditions: EnvironmentalCondition[];
  tasks: Task[];
  notes: string;
}

export interface MonotubTekTemplateData {
  // Basic info
  name: string;
  description: string;
  species: string;
  variant: string;
  type: string; // e.g., "Monotub", "Shoebox", "Martha Tent"
  is_public: boolean;
  tags: string[];

  // Stage-based data
  stages: {
    inoculation: StageData;
    spawnColonization: StageData;
    bulkColonization: StageData;
    fruiting: StageData;
    harvest: StageData;
  };
}

export const MONOTUB_TEK_STAGES = {
  inoculation: 'Inoculation',
  spawnColonization: 'Spawn Colonization',
  bulkColonization: 'Bulk Colonization',
  fruiting: 'Fruiting',
  harvest: 'Harvest',
} as const;

export type MonotubCultivationStage = keyof typeof MONOTUB_TEK_STAGES;

export const TEK_TYPES = {
  monotub: 'Monotub',
  // Future tek types can be added here
  // shoebox: 'Shoebox',
  // martha: 'Martha Tent',
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
  environmentalConditions: [],
  tasks: [],
  notes: '',
});

// Helper function to create empty template data
export const createEmptyTemplateData = (): MonotubTekTemplateData => ({
  name: '',
  description: '',
  species: '',
  variant: '',
  type: 'Monotub', // Default to Monotub
  is_public: false,
  tags: [],
  stages: {
    inoculation: createEmptyStageData(),
    spawnColonization: createEmptyStageData(),
    bulkColonization: createEmptyStageData(),
    fruiting: createEmptyStageData(),
    harvest: createEmptyStageData(),
  },
});

// Template interface for API responses
export interface MonotubTekTemplate {
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
    spawnColonization: StageData;
    bulkColonization: StageData;
    fruiting: StageData;
    harvest: StageData;
  };
}

// Helper function to generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
