import { useState, useCallback } from 'react';

export interface IoTEntitySelection {
  selectedEntities: Set<string>;
  bulkMode: boolean;
  toggleEntitySelection: (entityId: string) => void;
  enterBulkMode: () => void;
  exitBulkMode: () => void;
  clearSelection: () => void;
  selectAll: (entityIds: string[]) => void;
  deselectAll: () => void;
}

/**
 * Hook for managing IoT entity selection state
 */
export const useIoTEntitySelection = (): IoTEntitySelection => {
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const toggleEntitySelection = useCallback((entityId: string) => {
    setSelectedEntities((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(entityId)) {
        newSelected.delete(entityId);
      } else {
        newSelected.add(entityId);
      }
      return newSelected;
    });
  }, []);

  const enterBulkMode = useCallback(() => {
    setBulkMode(true);
    setSelectedEntities(new Set()); // Clear selection when entering bulk mode
  }, []);

  const exitBulkMode = useCallback(() => {
    setBulkMode(false);
    setSelectedEntities(new Set()); // Clear selection when exiting bulk mode
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEntities(new Set());
  }, []);

  const selectAll = useCallback((entityIds: string[]) => {
    setSelectedEntities(new Set(entityIds));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedEntities(new Set());
  }, []);

  return {
    selectedEntities,
    bulkMode,
    toggleEntitySelection,
    enterBulkMode,
    exitBulkMode,
    clearSelection,
    selectAll,
    deselectAll,
  };
};
