import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IoTFilterPreferences {
  domains: string[];
  showAllDomains: boolean;
}

export interface TaskFilterPreferences {
  growName: string;
  stage: string;
}

export interface UserPreferences {
  iotFilters: IoTFilterPreferences;
  taskFilters: TaskFilterPreferences;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  iotFilters: {
    domains: ['switch', 'automation', 'sensor', 'number'],
    showAllDomains: false,
  },
  taskFilters: {
    growName: '',
    stage: '',
  },
};

const STORAGE_KEY = '@user_preferences';
const GROW_NAMES_KEY = '@grow_names';

export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all keys exist
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        iotFilters: {
          ...DEFAULT_PREFERENCES.iotFilters,
          ...parsed.iotFilters,
        },
        taskFilters: {
          ...DEFAULT_PREFERENCES.taskFilters,
          ...parsed.taskFilters,
        },
      };
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
  return DEFAULT_PREFERENCES;
};

export const saveUserPreferences = async (preferences: UserPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

export const updateIoTFilterPreferences = async (
  filters: Partial<IoTFilterPreferences>
): Promise<void> => {
  const current = await getUserPreferences();
  const updated = {
    ...current,
    iotFilters: {
      ...current.iotFilters,
      ...filters,
    },
  };
  await saveUserPreferences(updated);
};

export const updateTaskFilterPreferences = async (
  filters: Partial<TaskFilterPreferences>
): Promise<void> => {
  const current = await getUserPreferences();
  const updated = {
    ...current,
    taskFilters: {
      ...current.taskFilters,
      ...filters,
    },
  };
  await saveUserPreferences(updated);
};

// Grow names management for task filtering
export const getGrowNames = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(GROW_NAMES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading grow names:', error);
  }
  return [];
};

export const saveGrowNames = async (growNames: string[]): Promise<void> => {
  try {
    // Remove duplicates and sort alphabetically
    const uniqueNames = [...new Set(growNames)].sort();
    await AsyncStorage.setItem(GROW_NAMES_KEY, JSON.stringify(uniqueNames));
  } catch (error) {
    console.error('Error saving grow names:', error);
  }
};

export const addGrowName = async (growName: string): Promise<void> => {
  const currentNames = await getGrowNames();
  if (!currentNames.includes(growName)) {
    await saveGrowNames([...currentNames, growName]);
  }
};

export const removeGrowName = async (growName: string): Promise<void> => {
  const currentNames = await getGrowNames();
  const filtered = currentNames.filter((name) => name !== growName);
  await saveGrowNames(filtered);
};
