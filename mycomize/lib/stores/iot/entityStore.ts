import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { DEFAULT_IOT_DOMAINS, DEFAULT_GROW_DEVICE_CLASSES, NEW_GATEWAY_ID } from '../../iotTypes';
import type { EntityStore } from './entity/types';
import {
  createSelectionSlice,
  createFilterSlice,
  createHaEntitiesSlice,
  createIotEntitiesSlice,
  createGrowsSlice,
  createSyncComputationSlice,
  createEntityOperationsSlice,
} from './entity/slices';

// Create the main store by composing all slices
export const useEntityStore = create<EntityStore>()((set, get, api) => ({
  // Compose all slices
  ...createSelectionSlice(set, get, api),
  ...createFilterSlice(set, get, api),
  ...createHaEntitiesSlice(set, get, api),
  ...createIotEntitiesSlice(set, get, api),
  ...createGrowsSlice(set, get, api),
  ...createSyncComputationSlice(set, get, api),
  ...createEntityOperationsSlice(set, get, api),

  // Override the reset function to reset all slices
  reset: () => {
    set({
      // Reset all state to initial values
      haEntities: [],
      haEntitiesLoading: false,
      iotEntities: [],
      iotEntitiesLoading: false,
      linkableEntities: [],
      linkedEntities: [],
      selectedEntityIds: new Set<string>(),
      bulkSelectionMode: false,
      filterPreferences: {
        domains: DEFAULT_IOT_DOMAINS,
        showAllDomains: false,
        deviceClasses: DEFAULT_GROW_DEVICE_CLASSES,
        showAllDeviceClasses: false,
      },
      filterEnabled: true,
      operationLoading: false,
      grows: [],
      growsLoading: false,
      lastCredentials: new Map(),
      webSocketInitialized: false,
      fetchedGateways: new Set(),
      pendingOperations: new Map(),
      pendingLinks: new Map(),
    });
  },
}));

// Helper selectors for optimized subscriptions (maintaining exact same exports)
export const useHaEntities = () => useEntityStore((state) => state.haEntities);
export const useIotEntities = () => useEntityStore((state) => state.iotEntities);
export const useLinkableEntities = () => useEntityStore((state) => state.linkableEntities);
export const useLinkedEntities = () => useEntityStore((state) => state.linkedEntities);
export const useEntitySelection = () =>
  useEntityStore(
    useShallow((state) => ({
      selectedEntityIds: state.selectedEntityIds,
      bulkSelectionMode: state.bulkSelectionMode,
    }))
  );

export const useFilteredEntities = () =>
  useEntityStore(
    useShallow((state) => {
      const { linkableEntities, filterPreferences, filterEnabled } = state;

      if (!filterEnabled) return linkableEntities;

      return linkableEntities.filter((entity) => {
        // Domain filter
        const domainMatch =
          filterPreferences.showAllDomains || filterPreferences.domains.includes(entity.domain);

        // Device class filter - handle entities without device class properly
        const entityDeviceClass = entity.device_class || '';
        const deviceClassMatch =
          filterPreferences.showAllDeviceClasses ||
          entityDeviceClass === '' || // Always show entities without device class
          filterPreferences.deviceClasses.includes(entityDeviceClass);

        return domainMatch && deviceClassMatch;
      });
    })
  );

// Optimized gateway-scoped entity selectors with proper memoization
export const useLinkableEntitiesByGateway = (gatewayId: number) =>
  useEntityStore(
    useShallow((state) => {
      return state.linkableEntities.filter(
        (entity) => entity.gateway_id === gatewayId || entity.gateway_id === NEW_GATEWAY_ID // Include temp entities
      );
    })
  );

export const useLinkedEntitiesByGateway = (gatewayId: number) =>
  useEntityStore(
    useShallow((state) => {
      return state.linkedEntities.filter((entity) => entity.gateway_id === gatewayId);
    })
  );

export const useFilteredEntitiesByGateway = (gatewayId: number) =>
  useEntityStore(
    useShallow((state) => {
      const { linkableEntities, filterPreferences, filterEnabled } = state;

      // First filter by gateway
      const gatewayEntities = linkableEntities.filter(
        (entity) => entity.gateway_id === gatewayId || entity.gateway_id === NEW_GATEWAY_ID // Include temp entities
      );

      // Then apply domain/device class filters if enabled
      if (!filterEnabled) {
        return gatewayEntities;
      }

      return gatewayEntities.filter((entity) => {
        // Domain filter
        const domainMatch =
          filterPreferences.showAllDomains || filterPreferences.domains.includes(entity.domain);

        // Device class filter - handle entities without device class properly
        const entityDeviceClass = entity.device_class || '';
        const deviceClassMatch =
          filterPreferences.showAllDeviceClasses ||
          entityDeviceClass === '' || // Always show entities without device class
          filterPreferences.deviceClasses.includes(entityDeviceClass);

        return domainMatch && deviceClassMatch;
      });
    })
  );

// High-performance combined selector for components that need multiple entity types
export const useGatewayEntities = (gatewayId: number) => {
  const linkableEntities = useEntityStore(
    useShallow((state) => {
      return state.linkableEntities.filter(
        (entity) => entity.gateway_id === gatewayId || entity.gateway_id === NEW_GATEWAY_ID
      );
    })
  );

  const linkedEntities = useEntityStore(
    useShallow((state) => {
      return state.linkedEntities.filter((entity) => entity.gateway_id === gatewayId);
    })
  );

  const filteredLinkableEntities = useEntityStore(
    useShallow((state) => {
      const { filterPreferences, filterEnabled } = state;

      // First filter by gateway
      const gatewayEntities = state.linkableEntities.filter(
        (entity) => entity.gateway_id === gatewayId || entity.gateway_id === NEW_GATEWAY_ID
      );

      // Then apply domain/device class filters if enabled
      if (!filterEnabled) {
        return gatewayEntities;
      }

      return gatewayEntities.filter((entity) => {
        const domainMatch =
          filterPreferences.showAllDomains || filterPreferences.domains.includes(entity.domain);

        const entityDeviceClass = entity.device_class || '';
        const deviceClassMatch =
          filterPreferences.showAllDeviceClasses ||
          entityDeviceClass === '' ||
          filterPreferences.deviceClasses.includes(entityDeviceClass);

        return domainMatch && deviceClassMatch;
      });
    })
  );

  return {
    linkableEntities,
    filteredLinkableEntities,
    linkedEntities,
  };
};
