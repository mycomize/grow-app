import type { StateCreator } from 'zustand';
import type { HaEntitiesState, EntityStore, GatewayCredentials } from '../types';
import { HAEntity, IoTGateway } from '../../../../iot/iot';
import { handleUnauthorizedError, createPerformanceTimer } from '../utils';
import { haWebSocketManager } from '../../../../iot/haWebSocketManager';

export interface HaEntitiesActions {
  // Actions - HA Entity management
  fetchHaEntities: (gateway: IoTGateway, forceRefresh?: boolean) => Promise<void>;
  clearHaEntities: () => void;

  // Actions - Smart caching and WebSocket integration
  initializeWebSocket: () => void;
  handleWebSocketEntityEvent: (
    gatewayId: number,
    eventType: 'added' | 'removed',
    entity: HAEntity
  ) => void;
  shouldRefreshEntities: (gateway: IoTGateway) => boolean;
  updateCredentialsCache: (gateway: IoTGateway) => void;
}

export type HaEntitiesSlice = HaEntitiesState & HaEntitiesActions;

export const createHaEntitiesSlice: StateCreator<EntityStore, [], [], HaEntitiesSlice> = (
  set,
  get
) => ({
  // Initial state
  haEntities: [],
  haEntitiesLoading: false,
  webSocketInitialized: false,
  lastCredentials: new Map<number, GatewayCredentials>(),

  // Initialize WebSocket manager
  initializeWebSocket: () => {
    const { webSocketInitialized } = get();

    if (webSocketInitialized) {
      //console.log('[EntityStore] WebSocket already initialized, skipping');
      return;
    }

    console.log('[EntityStore] Initializing WebSocket manager');

    // Add this store instance as a listener for entity events
    haWebSocketManager.addListener(get().handleWebSocketEntityEvent);

    set({ webSocketInitialized: true });
    console.log('[EntityStore] WebSocket manager initialized successfully');
  },

  // Handle WebSocket entity events (additions/removals) with database sync
  handleWebSocketEntityEvent: (
    gatewayId: number,
    eventType: 'added' | 'removed',
    entity: HAEntity
  ) => {
    console.log(
      `[EntityStore] Processing WebSocket ${eventType} event for gateway ${gatewayId}: ${entity.entity_id}`
    );

    const { haEntities, iotEntities } = get();
    let updatedHaEntities = [...haEntities];

    if (eventType === 'added') {
      // Check if entity already exists in HA entities (avoid duplicates)
      const existsInHA = updatedHaEntities.some((e) => e.entity_id === entity.entity_id);
      if (!existsInHA) {
        updatedHaEntities.push(entity);
        console.log(`[EntityStore] Added entity ${entity.entity_id} to HA entities list`);

        // Check if entity already exists in IoT database
        const existsInDB = iotEntities.some(
          (iotEntity) => iotEntity.entity_name === entity.entity_id
        );
        if (!existsInDB) {
          console.log(
            `[EntityStore] New entity ${entity.entity_id} needs to be created in database`
          );
          // Note: We can't call handleNewHAEntities here without a token
          // The UI components will handle the database creation when they detect new entities
        }
      } else {
        console.log(`[EntityStore] Entity ${entity.entity_id} already exists, skipping add`);
        return;
      }
    } else if (eventType === 'removed') {
      updatedHaEntities = updatedHaEntities.filter((e) => e.entity_id !== entity.entity_id);
      console.log(`[EntityStore] Removed entity ${entity.entity_id} from HA entities list`);

      // Also remove from IoT entities if it exists (entity was deleted from HA)
      const updatedIotEntities = iotEntities.filter(
        (iotEntity) =>
          !(iotEntity.entity_name === entity.entity_id && iotEntity.gateway_id === gatewayId)
      );

      if (updatedIotEntities.length !== iotEntities.length) {
        console.log(
          `[EntityStore] Also removed entity ${entity.entity_id} from IoT entities (entity deleted from HA)`
        );
        set({ iotEntities: updatedIotEntities });
      }
    }

    // Update HA entities and recompute entity lists
    set({ haEntities: updatedHaEntities });

    // Recompute entity lists to reflect the changes
    const currentIotEntities =
      eventType === 'removed'
        ? iotEntities.filter(
            (iotEntity) =>
              !(iotEntity.entity_name === entity.entity_id && iotEntity.gateway_id === gatewayId)
          )
        : iotEntities;

    const syncResult = get().computeEntityLists(updatedHaEntities, currentIotEntities, false);
    set({
      linkableEntities: syncResult.linkableEntities,
      linkedEntities: syncResult.linkedEntities,
    });

    console.log(
      `[EntityStore] Entity lists recomputed after ${eventType} event: ${syncResult.linkableEntities.length} linkable, ${syncResult.linkedEntities.length} linked`
    );
  },

  // Check if entities should be refreshed based on credential changes
  shouldRefreshEntities: (gateway: IoTGateway) => {
    const { lastCredentials } = get();
    const stored = lastCredentials.get(gateway.id);

    if (!stored) {
      console.log(`[EntityStore] No cached credentials for gateway ${gateway.id}, refresh needed`);
      return true;
    }

    const credentialsChanged =
      stored.apiUrl !== gateway.api_url || stored.apiKey !== gateway.api_key;

    if (credentialsChanged) {
      console.log(`[EntityStore] Credentials changed for gateway ${gateway.id}, refresh needed`);
      console.log(
        `[EntityStore] Previous: ${stored.apiUrl.substring(0, 20)}..., New: ${gateway.api_url.substring(0, 20)}...`
      );
    } else {
      //console.log(`[EntityStore] Credentials unchanged for gateway ${gateway.id}, using cache`);
    }

    return credentialsChanged;
  },

  // Update credentials cache
  updateCredentialsCache: (gateway: IoTGateway) => {
    console.log(`[EntityStore] Updating credentials cache for gateway ${gateway.id}`);

    set((state) => {
      const newCredentials = new Map(state.lastCredentials);

      newCredentials.set(gateway.id, {
        apiUrl: gateway.api_url,
        apiKey: gateway.api_key,
      });

      return { lastCredentials: newCredentials };
    });

    console.log(`[EntityStore] Credentials cache updated for gateway ${gateway.id}`);
  },

  // Fetch HA entities from Home Assistant API with smart caching
  fetchHaEntities: async (gateway: IoTGateway, forceRefresh: boolean = false) => {
    const timer = createPerformanceTimer('fetchHaEntities');
    console.log(
      `[EntityStore] fetchHaEntities called for gateway ${gateway.id}, forceRefresh: ${forceRefresh}`
    );

    // Skip WebSocket for new gateways (not saved yet)
    const isNewGateway = gateway.id === -1;
    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - skipping WebSocket initialization for unsaved gateway`
      );
    } else {
      // Initialize WebSocket if not already done
      get().initializeWebSocket();
    }

    // Check if refresh is needed based on credentials (unless forced)
    if (!forceRefresh && !isNewGateway && !get().shouldRefreshEntities(gateway)) {
      console.log(
        `[EntityStore] Using cached HA entities for gateway ${gateway.id}, skipping API call`
      );

      // Establish WebSocket connection for real-time updates (only for existing gateways)
      if (!isNewGateway) {
        await haWebSocketManager.connectToGateway(gateway.id, gateway.api_url, gateway.api_key);
      }
      return;
    }

    console.log(`[EntityStore] Starting HA entities fetch from ${gateway.api_url}`);

    try {
      set({ haEntitiesLoading: true });

      timer.log('Starting network request');
      const response = await fetch(`${gateway.api_url}/api/states`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });
      timer.log('Network request completed');

      if (!response.ok) {
        throw new Error('Failed to fetch HA entities');
      }

      timer.log('Starting JSON parsing');
      const haEntities: HAEntity[] = await response.json();
      timer.log('JSON parsing completed');
      console.log(`[EntityStore] Received ${haEntities.length} HA entities from Home Assistant`);

      set({ haEntitiesLoading: false, haEntities });

      // Update credentials cache after successful fetch
      get().updateCredentialsCache(gateway);

      // Establish WebSocket connection for real-time updates (only for existing gateways)
      if (!isNewGateway) {
        await haWebSocketManager.connectToGateway(gateway.id, gateway.api_url, gateway.api_key);
      }

      timer.end('Complete HA entities fetch');
    } catch (error) {
      console.error('Error fetching HA entities:', error);
      set({ haEntitiesLoading: false });

      timer.end('HA entities fetch failed');
      throw error;
    }
  },

  // Clear HA entities
  clearHaEntities: () => {
    set({ haEntities: [], linkableEntities: [], linkedEntities: [] });
  },
});
