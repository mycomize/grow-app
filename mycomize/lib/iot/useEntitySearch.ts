import { useState, useMemo, useCallback } from 'react';
import { IoTEntity } from '~/lib/iot';
import { IoTFilterPreferences } from '~/lib/iotTypes';

export interface EntitySearch {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  filteredEntities: IoTEntity[];
}

/**
 * Hook for managing IoT entity search and filtering
 * Combines search query with domain and device class filters
 */
export const useEntitySearch = (
  entities: IoTEntity[],
  filterPreferences?: IoTFilterPreferences
): EntitySearch => {
  const [searchQuery, setSearchQuery] = useState('');

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  /**
   * Filtered entities based on search query and filter preferences
   */
  const filteredEntities = useMemo(() => {
    let filtered = entities;

    // Apply domain filter - only show entities from selected domains
    if (filterPreferences && filterPreferences.domains.length > 0) {
      filtered = filtered.filter((entity) => filterPreferences.domains.includes(entity.domain));
    }

    // Apply device class filter - only show entities with selected device classes
    // Note: entities without device_class are always included if no device class filters are active
    if (filterPreferences && filterPreferences.deviceClasses.length > 0) {
      filtered = filtered.filter(
        (entity) =>
          // Include entities that have a device_class matching the filter
          (entity.device_class && filterPreferences.deviceClasses.includes(entity.device_class)) ||
          // Also include entities without device_class (null/undefined) to avoid hiding them
          !entity.device_class
      );
    }

    // Apply search query filter - search in friendly_name and entity_name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((entity) => {
        const friendlyName = (entity.friendly_name || '').toLowerCase();
        const entityName = (entity.entity_name || '').toLowerCase();

        return friendlyName.includes(query) || entityName.includes(query);
      });
    }

    return filtered;
  }, [entities, filterPreferences, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    clearSearch,
    filteredEntities,
  };
};
