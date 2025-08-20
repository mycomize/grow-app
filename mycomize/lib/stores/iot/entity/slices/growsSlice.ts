import type { StateCreator } from 'zustand';
import type { GrowsState, EntityStore } from '../types';
import { handleUnauthorizedError } from '../utils';
import { apiClient } from '../../../../ApiClient';

export interface GrowsActions {
  // Actions - Utility
  fetchGrows: (token: string) => Promise<void>;
}

export type GrowsSlice = GrowsState & GrowsActions;

export const createGrowsSlice: StateCreator<EntityStore, [], [], GrowsSlice> = (set, get) => ({
  // Initial state
  grows: [],
  growsLoading: false,

  // Fetch available grows for linking
  fetchGrows: async (token: string) => {
    try {
      set({ growsLoading: true });

      const grows = await apiClient.getBulkGrowsWithIoT(token);
      set({ grows, growsLoading: false });
    } catch (error) {
      console.error('Error fetching grows:', error);
      set({ growsLoading: false });
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },
});
