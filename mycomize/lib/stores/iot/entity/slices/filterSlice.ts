import type { StateCreator } from 'zustand';
import type { FilterState, EntityStore } from '../types';
import {
  IoTFilterPreferences,
  DEFAULT_IOT_DOMAINS,
  DEFAULT_GROW_DEVICE_CLASSES,
} from '../../../../types/iotTypes';

export interface FilterActions {
  // Actions - Filter management
  updateFilterPreferences: (preferences: Partial<IoTFilterPreferences>) => void;
  toggleFilterEnabled: () => void;
  toggleDomainFilter: (domain: string) => void;
  toggleDeviceClassFilter: (deviceClass: string) => void;
  toggleShowAllDomains: () => void;
  toggleShowAllDeviceClasses: () => void;
}

export type FilterSlice = FilterState & FilterActions;

export const createFilterSlice: StateCreator<EntityStore, [], [], FilterSlice> = (set, get) => ({
  // Initial state
  filterPreferences: {
    domains: DEFAULT_IOT_DOMAINS,
    showAllDomains: false,
    deviceClasses: DEFAULT_GROW_DEVICE_CLASSES,
    showAllDeviceClasses: false,
  },
  filterEnabled: true,

  // Update filter preferences
  updateFilterPreferences: (preferences: Partial<IoTFilterPreferences>) => {
    set((state) => ({
      filterPreferences: { ...state.filterPreferences, ...preferences },
    }));
  },

  // Toggle filter enabled
  toggleFilterEnabled: () => {
    set((state) => ({ filterEnabled: !state.filterEnabled }));
  },

  // Toggle domain filter
  toggleDomainFilter: (domain: string) => {
    set((state) => {
      const domains = [...state.filterPreferences.domains];
      const index = domains.indexOf(domain);

      if (index > -1) {
        domains.splice(index, 1);
      } else {
        domains.push(domain);
      }

      return {
        filterPreferences: { ...state.filterPreferences, domains },
      };
    });
  },

  // Toggle device class filter
  toggleDeviceClassFilter: (deviceClass: string) => {
    set((state) => {
      const deviceClasses = [...state.filterPreferences.deviceClasses];
      const index = deviceClasses.indexOf(deviceClass);

      if (index > -1) {
        deviceClasses.splice(index, 1);
      } else {
        deviceClasses.push(deviceClass);
      }

      return {
        filterPreferences: { ...state.filterPreferences, deviceClasses },
      };
    });
  },

  // Toggle show all domains
  toggleShowAllDomains: () => {
    set((state) => ({
      filterPreferences: {
        ...state.filterPreferences,
        showAllDomains: !state.filterPreferences.showAllDomains,
      },
    }));
  },

  // Toggle show all device classes
  toggleShowAllDeviceClasses: () => {
    set((state) => ({
      filterPreferences: {
        ...state.filterPreferences,
        showAllDeviceClasses: !state.filterPreferences.showAllDeviceClasses,
      },
    }));
  },
});
