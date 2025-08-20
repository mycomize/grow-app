import type { StateCreator } from 'zustand';
import type { SelectionState, EntityStore } from '../types';

export interface SelectionActions {
  // Actions - Selection management
  toggleEntitySelection: (entityId: string) => void;
  enterBulkMode: () => void;
  exitBulkMode: () => void;
  clearSelection: () => void;
}

export type SelectionSlice = SelectionState & SelectionActions;

export const createSelectionSlice: StateCreator<EntityStore, [], [], SelectionSlice> = (
  set,
  get
) => ({
  // Initial state
  selectedEntityIds: new Set<string>(),
  bulkSelectionMode: false,

  // Toggle entity selection
  toggleEntitySelection: (entityId: string) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedEntityIds);
      if (newSelectedIds.has(entityId)) {
        newSelectedIds.delete(entityId);
      } else {
        newSelectedIds.add(entityId);
      }
      return { selectedEntityIds: newSelectedIds };
    });
  },

  // Enter bulk selection mode
  enterBulkMode: () => {
    set({ bulkSelectionMode: true });
  },

  // Exit bulk selection mode
  exitBulkMode: () => {
    set({ bulkSelectionMode: false, selectedEntityIds: new Set<string>() });
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedEntityIds: new Set<string>() });
  },
});
