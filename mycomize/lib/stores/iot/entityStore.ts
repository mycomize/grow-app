import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../../ApiClient';
import { HAEntity, IoTEntity, IoTGateway, IoTEntityCreate } from '../../iot';
import {
  IoTFilterPreferences,
  DEFAULT_IOT_DOMAINS,
  DEFAULT_GROW_DEVICE_CLASSES,
} from '../../iotTypes';

// Helper function to handle unauthorized errors consistently
const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

// Entity sync computation result
interface EntitySyncResult {
  newEntities: HAEntity[];
  orphanedEntities: IoTEntity[];
  linkableEntities: IoTEntity[];
  linkedEntities: IoTEntity[];
}

interface EntityStore {
  // HA Entity state (raw from Home Assistant API)
  haEntities: HAEntity[];
  haEntitiesLoading: boolean;

  // IoT Entity state (database records with grow associations)
  iotEntities: IoTEntity[];
  iotEntitiesLoading: boolean;

  // Computed entity collections
  linkableEntities: IoTEntity[];
  linkedEntities: IoTEntity[];

  // Selection state
  selectedEntityIds: Set<string>;
  bulkSelectionMode: boolean;

  // Filter state
  filterPreferences: IoTFilterPreferences;
  filterEnabled: boolean;

  // Operation state
  operationLoading: boolean;

  // Grows for linking context
  grows: any[];
  growsLoading: boolean;

  // Actions - HA Entity management
  fetchHaEntities: (gateway: IoTGateway) => Promise<void>;
  clearHaEntities: () => void;

  // Actions - IoT Entity management
  fetchIotEntities: (token: string, gatewayId: string) => Promise<void>;
  syncIotEntities: (token: string, gateway: IoTGateway) => Promise<boolean>;

  // Actions - Entity sync computation
  computeEntityLists: (
    haEntities: HAEntity[],
    iotEntities: IoTEntity[],
    isNewGateway?: boolean
  ) => EntitySyncResult;
  computeAndSetEntityLists: (isNewGateway?: boolean) => void;
  performDbSync: (
    token: string,
    gatewayId: string,
    currentDbEntities: IoTEntity[],
    newEntities: HAEntity[],
    orphanedEntities: IoTEntity[]
  ) => Promise<boolean>;

  // Actions - Entity operations (linking/unlinking)
  linkEntity: (
    token: string,
    gatewayId: string,
    entityId: string,
    growId: number,
    stage: string
  ) => Promise<boolean>;
  unlinkEntity: (token: string, gatewayId: string, entityId: string) => Promise<boolean>;
  bulkLinkEntities: (
    token: string,
    gatewayId: string,
    entityIds: string[],
    growId: number,
    stage: string
  ) => Promise<boolean>;
  bulkUnlinkEntities: (token: string, gatewayId: string, entityIds: string[]) => Promise<boolean>;

  // Actions - Selection management
  toggleEntitySelection: (entityId: string) => void;
  enterBulkMode: () => void;
  exitBulkMode: () => void;
  clearSelection: () => void;

  // Actions - Filter management
  updateFilterPreferences: (preferences: Partial<IoTFilterPreferences>) => void;
  toggleFilterEnabled: () => void;
  toggleDomainFilter: (domain: string) => void;
  toggleDeviceClassFilter: (deviceClass: string) => void;
  toggleShowAllDomains: () => void;
  toggleShowAllDeviceClasses: () => void;

  // Actions - Utility
  fetchGrows: (token: string) => Promise<void>;
  reset: () => void;
}

export const useEntityStore = create<EntityStore>((set, get) => ({
  // Initial state
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

  // Fetch HA entities from Home Assistant API
  fetchHaEntities: async (gateway: IoTGateway) => {
    try {
      set({ haEntitiesLoading: true });

      const response = await fetch(`${gateway.api_url}/api/states`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch HA entities');
      }

      const haEntities: HAEntity[] = await response.json();
      set({ haEntitiesLoading: false, haEntities });
    } catch (error) {
      console.error('Error fetching HA entities:', error);
      set({ haEntitiesLoading: false });
      throw error;
    }
  },

  // Clear HA entities
  clearHaEntities: () => {
    set({ haEntities: [], linkableEntities: [], linkedEntities: [] });
  },

  // Fetch IoT entities from database
  fetchIotEntities: async (token: string, gatewayId: string) => {
    try {
      set({ iotEntitiesLoading: true });

      const iotEntities: IoTEntity[] = await apiClient.getIoTEntities(gatewayId, token);
      set({ iotEntitiesLoading: false, iotEntities });
    } catch (error) {
      console.error('Error fetching IoT entities:', error);
      set({ iotEntitiesLoading: false });
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

  // Explicit method to compute and set entity lists (prevents double computation)
  computeAndSetEntityLists: (isNewGateway: boolean = false) => {
    const { haEntities, iotEntities } = get();

    if (haEntities.length === 0) {
      // No HA entities, clear computed lists
      set({ linkableEntities: [], linkedEntities: [] });
      return;
    }

    const syncResult = get().computeEntityLists(haEntities, iotEntities, isNewGateway);
    set({
      linkableEntities: syncResult.linkableEntities,
      linkedEntities: syncResult.linkedEntities,
    });
  },

  // Compute entity sync lists - core synchronization logic
  computeEntityLists: (
    haEntities: HAEntity[],
    iotEntities: IoTEntity[],
    isNewGateway: boolean = false
  ) => {
    console.log(
      `[EntityStore] computeEntityLists called with ${haEntities.length} HA entities, ${iotEntities.length} IoT entities, isNewGateway: ${isNewGateway}`
    );

    // Helper functions for entity creation
    const extractDomain = (entityId: string): string => entityId.split('.')[0] || '';
    const extractDeviceClass = (attributes: Record<string, any>): string =>
      attributes?.device_class || '';

    if (isNewGateway || iotEntities.length === 0) {
      // For new gateways or when no IoT entities exist, all HA entities are linkable
      const newLinkableEntities = haEntities.map((haEntity) => ({
        id: -1, // Temporary ID for new entities
        gateway_id: -1, // Will be set when gateway is saved
        entity_name: haEntity.entity_id,
        entity_type: 'home_assistant',
        friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
        domain: extractDomain(haEntity.entity_id),
        device_class: extractDeviceClass(haEntity.attributes),
        linked_grow_id: undefined,
        linked_stage: undefined,
      }));

      console.log(
        `[EntityStore] New/empty gateway: ${newLinkableEntities.length} linkable entities, 0 linked entities`
      );

      return {
        newEntities: haEntities,
        orphanedEntities: [],
        linkableEntities: newLinkableEntities,
        linkedEntities: [],
      };
    }

    // Create lookup maps for efficient comparison
    const haEntityMap = new Map(haEntities.map((entity) => [entity.entity_id, entity]));
    const iotEntityMap = new Map(iotEntities.map((entity) => [entity.entity_name, entity]));

    // Find new entities (in HA but not in IoT DB)
    const newEntities = haEntities.filter((haEntity) => !iotEntityMap.has(haEntity.entity_id));
    console.log(`[EntityStore] Found ${newEntities.length} new entities (in HA but not in DB)`);

    // Find orphaned entities (in IoT DB but not in HA)
    const orphanedEntities = iotEntities.filter(
      (iotEntity) => !haEntityMap.has(iotEntity.entity_name)
    );

    console.log(
      `[EntityStore] Found ${orphanedEntities.length} orphaned entities (in DB but not in HA)`
    );

    // Existing entities (in both HA and IoT DB)
    const existingEntities = iotEntities.filter((iotEntity) =>
      haEntityMap.has(iotEntity.entity_name)
    );

    console.log(
      `[EntityStore] Found ${existingEntities.length} existing entities (in both HA and DB)`
    );

    // Compute linkable entities: new entities (as pseudo-entities) + existing entities with no grow assignment
    const newEntityPseudos = newEntities.map((haEntity) => ({
      id: -1, // Temporary ID for new entities
      gateway_id: iotEntities[0]?.gateway_id || -1,
      entity_name: haEntity.entity_id,
      entity_type: 'home_assistant',
      friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
      domain: extractDomain(haEntity.entity_id),
      device_class: extractDeviceClass(haEntity.attributes),
      linked_grow_id: undefined,
      linked_stage: undefined,
    }));

    const existingLinkableEntities = existingEntities.filter((entity) => !entity.linked_grow_id);
    console.log(
      `[EntityStore] Found ${existingLinkableEntities.length} existing linkable entities (no grow assignment)`
    );

    const computedLinkableEntities = [...newEntityPseudos, ...existingLinkableEntities];
    console.log(
      `[EntityStore] Total linkable entities: ${newEntityPseudos.length} new + ${existingLinkableEntities.length} existing = ${computedLinkableEntities.length}`
    );

    // Compute linked entities: existing entities with grow assignment
    const computedLinkedEntities = existingEntities.filter((entity) => entity.linked_grow_id);
    console.log(
      `[EntityStore] Found ${computedLinkedEntities.length} linked entities (with grow assignment)`
    );

    return {
      newEntities,
      orphanedEntities,
      linkableEntities: computedLinkableEntities,
      linkedEntities: computedLinkedEntities,
    };
  },

  // Perform database sync operations
  performDbSync: async (
    token: string,
    gatewayId: string,
    currentDbEntities: IoTEntity[],
    newEntities: HAEntity[],
    orphanedEntities: IoTEntity[]
  ) => {
    try {
      let updatedDbEntities = [...currentDbEntities];

      // Helper function for creating IoT entities from HA entities
      const createIoTEntityFromHAEntity = (
        haEntity: HAEntity,
        gatewayId: number
      ): IoTEntityCreate => ({
        gateway_id: gatewayId,
        entity_name: haEntity.entity_id,
        entity_type: 'home_assistant',
        friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
        domain: haEntity.entity_id.split('.')[0] || '',
        device_class: haEntity.attributes?.device_class || '',
      });

      // Bulk create new entities in DB
      if (newEntities.length > 0) {
        try {
          const entitiesToCreate = newEntities.map((haEntity) =>
            createIoTEntityFromHAEntity(haEntity, parseInt(gatewayId))
          );
          console.log(`[EntityStore] Bulk creating ${entitiesToCreate.length} new entities in DB`);

          const createdEntities = await apiClient.bulkCreateIoTEntities(
            gatewayId,
            entitiesToCreate,
            token
          );

          // Add created entities to local state
          if (createdEntities && Array.isArray(createdEntities)) {
            updatedDbEntities = [...updatedDbEntities, ...createdEntities];
          }
        } catch (error) {
          console.error('Failed to bulk create entities:', error);
          handleUnauthorizedError(error as Error);
          return false;
        }
      }

      // Bulk delete orphaned entities from DB
      if (orphanedEntities.length > 0) {
        try {
          const entityIdsToDelete = orphanedEntities.map((entity) => entity.id);
          await apiClient.bulkDeleteIoTEntities(gatewayId, entityIdsToDelete, token);

          // Remove deleted entities from local state
          updatedDbEntities = updatedDbEntities.filter(
            (entity) => !entityIdsToDelete.includes(entity.id)
          );
        } catch (error) {
          console.error('Failed to bulk delete orphaned entities:', error);
          handleUnauthorizedError(error as Error);
          return false;
        }
      }

      // Update local state directly instead of refetching
      if (newEntities.length > 0 || orphanedEntities.length > 0) {
        set({ iotEntities: updatedDbEntities });
        console.log(
          `[EntityStore] Updated local IoT entities: ${updatedDbEntities.length} entities`
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to sync DB entities:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Sync IoT entities after gateway save - comprehensive sync logic
  syncIotEntities: async (token: string, gateway: IoTGateway) => {
    try {
      const { haEntities } = get();

      // First, fetch the current DB entities to compare with HA entities
      const currentDbEntities = await apiClient.getIoTEntities(gateway.id.toString(), token);

      console.log(
        `[EntityStore] Syncing entities after gateway save: ${haEntities.length} HA entities, ${currentDbEntities.length} current DB entities`
      );

      // Compute what needs to be synced
      const syncResult = get().computeEntityLists(
        haEntities,
        currentDbEntities,
        currentDbEntities.length === 0
      );
      const { newEntities, orphanedEntities, linkableEntities, linkedEntities } = syncResult;

      // Perform the actual sync using the proper sync logic
      if (newEntities.length > 0 || orphanedEntities.length > 0) {
        console.log(
          `[EntityStore] Syncing: ${newEntities.length} new entities to create, ${orphanedEntities.length} orphaned entities to delete`
        );

        const syncSuccess = await get().performDbSync(
          token,
          gateway.id.toString(),
          currentDbEntities,
          newEntities,
          orphanedEntities
        );

        if (!syncSuccess) {
          return false;
        }
      } else {
        console.log('[EntityStore] No sync needed - entities are already in sync');
        // Still update local state with current entities
        set({ iotEntities: currentDbEntities });
      }

      // Update computed entity lists
      set({
        linkableEntities,
        linkedEntities,
      });

      // Refetch DB entities to get the final state and ensure UI is updated
      await get().fetchIotEntities(token, gateway.id.toString());

      // Update gateway with entity counts (encrypted)
      try {
        const linkedCount = linkedEntities.length;
        const linkableCount = linkableEntities.length;

        console.log(
          `[EntityStore] Updating gateway with entity counts: ${linkedCount} linked, ${linkableCount} linkable`
        );

        // Use the gateway store to update the gateway
        // This would ideally be coordinated between stores, but for now we'll use the API directly
        await apiClient.updateIoTGateway(
          gateway.id.toString(),
          {
            linked_entities_count: linkedCount.toString(),
            linkable_entities_count: linkableCount.toString(),
          },
          token
        );
      } catch (error) {
        console.error('Failed to update gateway entity counts:', error);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync entities after gateway save:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Link entity to grow/stage
  linkEntity: async (
    token: string,
    gatewayId: string,
    entityId: string,
    growId: number,
    stage: string
  ) => {
    try {
      set({ operationLoading: true });

      await apiClient.linkIoTEntity(gatewayId, entityId, growId, stage, token);

      // Refresh IoT entities to get updated link status, then recompute lists
      await get().fetchIotEntities(token, gatewayId);
      get().computeAndSetEntityLists(false);

      set({ operationLoading: false });
      return true;
    } catch (error) {
      console.error('Error linking entity:', error);
      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Unlink entity from grow
  unlinkEntity: async (token: string, gatewayId: string, entityId: string) => {
    try {
      set({ operationLoading: true });

      await apiClient.unlinkIoTEntity(gatewayId, entityId, token);

      // Refresh IoT entities to get updated link status, then recompute lists
      await get().fetchIotEntities(token, gatewayId);
      get().computeAndSetEntityLists(false);

      set({ operationLoading: false });
      return true;
    } catch (error) {
      console.error('Error unlinking entity:', error);
      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Bulk link entities
  bulkLinkEntities: async (
    token: string,
    gatewayId: string,
    entityIds: string[],
    growId: number,
    stage: string
  ) => {
    try {
      set({ operationLoading: true });

      // Convert string IDs to numbers for API
      const numericEntityIds = entityIds.map((id) => parseInt(id, 10));
      await apiClient.bulkLinkIoTEntities(gatewayId, numericEntityIds, growId, stage, token);

      // Refresh IoT entities to get updated link status, then recompute lists
      await get().fetchIotEntities(token, gatewayId);
      get().computeAndSetEntityLists(false);

      set({ operationLoading: false });
      return true;
    } catch (error) {
      console.error('Error bulk linking entities:', error);
      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Bulk unlink entities
  bulkUnlinkEntities: async (token: string, gatewayId: string, entityIds: string[]) => {
    try {
      set({ operationLoading: true });

      // Convert string IDs to numbers for API
      const numericEntityIds = entityIds.map((id) => parseInt(id, 10));
      await apiClient.bulkUnlinkIoTEntities(gatewayId, numericEntityIds, token);

      // Refresh IoT entities to get updated link status, then recompute lists
      await get().fetchIotEntities(token, gatewayId);
      get().computeAndSetEntityLists(false);

      set({ operationLoading: false });
      return true;
    } catch (error) {
      console.error('Error bulk unlinking entities:', error);
      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

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

  // Reset store state
  reset: () => {
    set({
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
    });
  },
}));

// Helper selectors for optimized subscriptions
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
