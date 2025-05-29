import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IoTFilterPreferences {
  domains: string[];
  showAllDomains: boolean;
}

export interface UserPreferences {
  iotFilters: IoTFilterPreferences;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  iotFilters: {
    domains: ['switch', 'automation', 'sensor', 'number'],
    showAllDomains: false,
  },
};

const STORAGE_KEY = '@user_preferences';

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
