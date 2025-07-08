export interface Material {
  id: string;
  description: string;
  vendor: string;
  quantity: string; // Free-form text (e.g., "2 lbs", "500ml", "1 bag")
  url: string;
}

export interface EnvironmentalCondition {
  id: string;
  name: string; // e.g., "Temperature", "Humidity", "CO2 Level"
  type: string; // e.g., "temperature", "humidity", "co2" - free form
  value: string; // Free-form (e.g., "68-72°F", "85-90%", ">1000ppm")
  unit: string; // e.g., "°F", "%", "ppm"
}

export interface Task {
  id: string;
  action: string; // e.g., "Break and shake", "Mist substrate"
  frequency: string; // Free-form text (e.g., "Daily for 7 days", "Once", "Every 3 days")
  estimatedStartDate: string; // ISO date string
}

export interface StageData {
  materials: Material[];
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
  isPublic: boolean;
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

export const CULTIVATION_STAGES = {
  inoculation: 'Inoculation',
  spawnColonization: 'Spawn Colonization',
  bulkColonization: 'Bulk Colonization',
  fruiting: 'Fruiting',
  harvest: 'Harvest',
} as const;

export type CultivationStage = keyof typeof CULTIVATION_STAGES;

// Helper function to create empty stage data
export const createEmptyStageData = (): StageData => ({
  materials: [],
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
  isPublic: false,
  tags: [],
  stages: {
    inoculation: createEmptyStageData(),
    spawnColonization: createEmptyStageData(),
    bulkColonization: createEmptyStageData(),
    fruiting: createEmptyStageData(),
    harvest: createEmptyStageData(),
  },
});

// Helper function to generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
