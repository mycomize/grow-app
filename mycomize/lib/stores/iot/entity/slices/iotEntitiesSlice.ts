import type { StateCreator } from 'zustand';
import type { IotEntitiesState, EntityStore } from '../types';
import { HAEntity, IoTEntity } from '../../../../iot';
import { handleUnauthorizedError, createPerformanceTimer } from '../utils';
import { apiClient } from '../../../../ApiClient';

export interface IotEntitiesActions {
  // Actions - IoT Entity management
  fetchIotEntities: (token: string, gatewayId: string, forceRefresh?: boolean) => Promise<void>;

  // Actions - Gateway tracking for single-fetch optimization
  addFetchedGateway: (gatewayId: number) => void;
  hasFetchedGateway: (gatewayId: number) => boolean;

  // Actions - Bulk HA entity creation and ID mapping
  handleNewHAEntities: (newEntities: HAEntity[], gatewayId: number, token: string) => Promise<void>;
  updateTemporaryEntityIds: (idMapping: Record<string, number>) => void;
}

export type IotEntitiesSlice = IotEntitiesState & IotEntitiesActions;

export const createIotEntitiesSlice: StateCreator<EntityStore, [], [], IotEntitiesSlice> = (
  set,
  get
) => ({
  // Initial state
  iotEntities: [],
  iotEntitiesLoading: false,
  fetchedGateways: new Set<number>(),

  // Gateway tracking helpers for single-fetch optimization
  addFetchedGateway: (gatewayId: number) => {
    set((state) => {
      const newFetchedGateways = new Set(state.fetchedGateways);
      newFetchedGateways.add(gatewayId);
      return { fetchedGateways: newFetchedGateways };
    });
    console.log(`[EntityStore] Marked gateway ${gatewayId} as fetched`);
  },

  hasFetchedGateway: (gatewayId: number) => {
    const { fetchedGateways } = get();
    const hasFetched = fetchedGateways.has(gatewayId);
    console.log(
      `[EntityStore] Gateway ${gatewayId} fetch status: ${hasFetched ? 'already fetched' : 'not fetched'}`
    );
    return hasFetched;
  },

  // Handle bulk creation of new HA entities with ID mapping
  handleNewHAEntities: async (newEntities: HAEntity[], gatewayId: number, token: string) => {
    if (newEntities.length === 0) return;

    console.log(
      `[EntityStore] Handling ${newEntities.length} new HA entities for gateway ${gatewayId}`
    );

    try {
      // Create entities in database and get back the created entities with real IDs
      const entitiesToCreate = newEntities.map((haEntity) => ({
        gateway_id: gatewayId,
        entity_name: haEntity.entity_id,
        entity_type: 'home_assistant',
        friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
        domain: haEntity.entity_id.split('.')[0] || '',
        device_class: haEntity.attributes?.device_class || '',
      }));

      const createdEntities = await apiClient.bulkCreateIoTEntities(
        gatewayId.toString(),
        entitiesToCreate,
        token
      );

      if (createdEntities && Array.isArray(createdEntities)) {
        // Update local IoT entities with the newly created entities
        set((state) => ({
          iotEntities: [...state.iotEntities, ...createdEntities],
        }));

        // Create ID mapping for any components that need to update temporary IDs
        const idMapping: Record<string, number> = {};
        createdEntities.forEach((entity) => {
          idMapping[entity.entity_name] = entity.id;
        });

        // Update any temporary entity IDs in the state
        get().updateTemporaryEntityIds(idMapping);

        console.log(
          `[EntityStore] Successfully created ${createdEntities.length} new entities with ID mapping`
        );
      }
    } catch (error) {
      console.error('Error handling new HA entities:', error);
      handleUnauthorizedError(error as Error);
    }
  },

  // Update temporary entity IDs with real database IDs
  updateTemporaryEntityIds: (idMapping: Record<string, number>) => {
    console.log(
      `[EntityStore] Updating temporary entity IDs with mapping: ${Object.keys(idMapping).length} entities`
    );

    set((state) => {
      const updatedIotEntities = state.iotEntities.map((entity) => {
        // Update entities that have temporary IDs (-1) with real database IDs
        if (entity.id === -1 && idMapping[entity.entity_name]) {
          return {
            ...entity,
            id: idMapping[entity.entity_name],
          };
        }
        return entity;
      });

      // Recompute entity lists with updated IDs
      const syncResult = get().computeEntityLists(state.haEntities, updatedIotEntities, false);

      return {
        iotEntities: updatedIotEntities,
        linkableEntities: syncResult.linkableEntities,
        linkedEntities: syncResult.linkedEntities,
      };
    });

    console.log(`[EntityStore] Temporary entity IDs updated, recomputed entity lists`);
  },

  // Fetch IoT entities from database with single-fetch optimization
  fetchIotEntities: async (token: string, gatewayId: string, forceRefresh: boolean = false) => {
    const gatewayIdNum = parseInt(gatewayId, 10);
    const timer = createPerformanceTimer('fetchIotEntities');

    console.log(
      `[EntityStore] fetchIotEntities called for gateway ${gatewayId}, forceRefresh: ${forceRefresh}`
    );

    // Check if we've already fetched entities for this gateway (unless forced refresh)
    if (!forceRefresh && get().hasFetchedGateway(gatewayIdNum)) {
      console.log(`[EntityStore] Gateway ${gatewayId} entities already fetched, using cached data`);

      timer.end('Single-fetch optimization saved time');
      return;
    }

    console.log(`[EntityStore] Starting IoT entities fetch from database for gateway ${gatewayId}`);

    try {
      set({ iotEntitiesLoading: true });

      timer.log('Starting API call');
      const iotEntities: IoTEntity[] = await apiClient.getIoTEntities(gatewayId, token);
      timer.log('API call completed');

      console.log(`[EntityStore] Received ${iotEntities.length} IoT entities from database`);

      set({ iotEntitiesLoading: false, iotEntities });

      // Mark this gateway as fetched to prevent redundant fetches
      get().addFetchedGateway(gatewayIdNum);

      timer.end('Complete IoT entities fetch');
    } catch (error) {
      console.error('Error fetching IoT entities:', error);
      set({ iotEntitiesLoading: false });
      handleUnauthorizedError(error as Error);

      timer.end('IoT entities fetch failed');
      throw error;
    }
  },
});
