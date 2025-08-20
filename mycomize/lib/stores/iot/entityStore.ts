import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../../ApiClient';
import { HAEntity, IoTEntity, IoTGateway, IoTEntityCreate } from '../../iot';
import {
  IoTFilterPreferences,
  DEFAULT_IOT_DOMAINS,
  DEFAULT_GROW_DEVICE_CLASSES,
  NEW_GATEWAY_ID,
  BulkCreateResult,
  EntityOperation,
} from '../../iotTypes';
import { haWebSocketManager } from '../../iot/haWebSocketManager';

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

// Credential tracking for caching
interface GatewayCredentials {
  apiUrl: string;
  apiKey: string;
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

  // Credential tracking for smart caching
  lastCredentials: Map<number, GatewayCredentials>; // gatewayId -> credentials
  webSocketInitialized: boolean;

  // Single-fetch optimization tracking
  fetchedGateways: Set<number>; // Track which gateways have had IoT entities fetched
  pendingOperations: Map<string, EntityOperation>; // Track in-flight operations

  // Pending links for new gateways (in-memory until commit)
  pendingLinks: Map<string, { growId?: number; stage?: string }>; // entityId -> link state

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

  // Actions - Gateway tracking for single-fetch optimization
  addFetchedGateway: (gatewayId: number) => void;
  hasFetchedGateway: (gatewayId: number) => boolean;

  // Actions - Optimistic updates for immediate UI response
  optimisticUpdateEntityLink: (
    entityId: string,
    gatewayId: number,
    growId?: number,
    stage?: string
  ) => void;

  // Actions - Bulk HA entity creation and ID mapping
  handleNewHAEntities: (newEntities: HAEntity[], gatewayId: number, token: string) => Promise<void>;
  updateTemporaryEntityIds: (idMapping: Record<string, number>) => void;

  // Actions - IoT Entity management
  fetchIotEntities: (token: string, gatewayId: string, forceRefresh?: boolean) => Promise<void>;
  syncIotEntities: (token: string, gateway: IoTGateway) => Promise<boolean>;
  shouldSkipEntitySync: (gateway: IoTGateway) => boolean;

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

  // Actions - Pending links for new gateways
  updatePendingLinks: (entityId: string, growId?: number, stage?: string) => void;
  commitPendingLinks: (token: string, gatewayId: number) => Promise<boolean>;
  clearPendingLinks: () => void;

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
  handleGatewayDeletion: (gatewayId: number) => void;
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
  lastCredentials: new Map<number, GatewayCredentials>(),
  webSocketInitialized: false,
  fetchedGateways: new Set<number>(),
  pendingOperations: new Map<string, EntityOperation>(),
  pendingLinks: new Map<string, { growId?: number; stage?: string }>(),

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

    const fetchStart = performance.now();
    console.log(`[EntityStore] Starting HA entities fetch from ${gateway.api_url}`);

    try {
      set({ haEntitiesLoading: true });

      const networkStart = performance.now();
      const response = await fetch(`${gateway.api_url}/api/states`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });
      const networkEnd = performance.now();
      console.log(
        `[EntityStore] HA API network request completed in ${networkEnd - networkStart}ms`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch HA entities');
      }

      const parseStart = performance.now();
      const haEntities: HAEntity[] = await response.json();
      const parseEnd = performance.now();
      console.log(`[EntityStore] HA entities JSON parsing completed in ${parseEnd - parseStart}ms`);
      console.log(`[EntityStore] Received ${haEntities.length} HA entities from Home Assistant`);

      set({ haEntitiesLoading: false, haEntities });

      // Update credentials cache after successful fetch
      get().updateCredentialsCache(gateway);

      // Establish WebSocket connection for real-time updates (only for existing gateways)
      if (!isNewGateway) {
        await haWebSocketManager.connectToGateway(gateway.id, gateway.api_url, gateway.api_key);
      }

      const fetchEnd = performance.now();
      console.log(
        `[EntityStore] Complete HA entities fetch completed in ${fetchEnd - fetchStart}ms`
      );
    } catch (error) {
      console.error('Error fetching HA entities:', error);
      set({ haEntitiesLoading: false });

      const fetchEnd = performance.now();
      console.log(`[EntityStore] HA entities fetch failed in ${fetchEnd - fetchStart}ms`);
      throw error;
    }
  },

  // Clear HA entities
  clearHaEntities: () => {
    set({ haEntities: [], linkableEntities: [], linkedEntities: [] });
  },

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

  // Optimistic update for immediate UI response
  optimisticUpdateEntityLink: (
    entityId: string,
    gatewayId: number,
    growId?: number,
    stage?: string
  ) => {
    console.log(
      `[EntityStore] Optimistic update for entity ${entityId}: growId=${growId}, stage=${stage}`
    );

    set((state) => {
      let updatedIotEntities = [...state.iotEntities];

      // Find existing entity to update
      const existingEntityIndex = updatedIotEntities.findIndex(
        (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayId
      );

      if (existingEntityIndex >= 0) {
        // Update existing entity
        updatedIotEntities[existingEntityIndex] = {
          ...updatedIotEntities[existingEntityIndex],
          linked_grow_id: growId,
          linked_stage: stage,
        };
      } else {
        // For new gateways, create a pseudo IoT entity from the corresponding HA entity
        const { haEntities } = state;
        const haEntity = haEntities.find((ha) => ha.entity_id === entityId);

        if (haEntity) {
          const pseudoIotEntity: IoTEntity = {
            id: -1, // Temporary ID
            gateway_id: gatewayId,
            entity_name: haEntity.entity_id,
            entity_type: 'home_assistant',
            friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
            domain: haEntity.entity_id.split('.')[0] || '',
            device_class: haEntity.attributes?.device_class || '',
            linked_grow_id: growId,
            linked_stage: stage,
          };

          updatedIotEntities.push(pseudoIotEntity);
          console.log(`[EntityStore] Created pseudo IoT entity for optimistic update: ${entityId}`);
        }
      }

      // Recompute entity lists after the optimistic update
      const { haEntities } = state;
      const isNewGateway = gatewayId === -1;
      const syncResult = get().computeEntityLists(haEntities, updatedIotEntities, isNewGateway);

      return {
        iotEntities: updatedIotEntities,
        linkableEntities: syncResult.linkableEntities,
        linkedEntities: syncResult.linkedEntities,
      };
    });

    console.log(
      `[EntityStore] Optimistic update completed for entity ${entityId}, recomputed entity lists`
    );
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
    const fetchStart = performance.now();

    console.log(
      `[EntityStore] fetchIotEntities called for gateway ${gatewayId}, forceRefresh: ${forceRefresh}`
    );

    // Check if we've already fetched entities for this gateway (unless forced refresh)
    if (!forceRefresh && get().hasFetchedGateway(gatewayIdNum)) {
      console.log(`[EntityStore] Gateway ${gatewayId} entities already fetched, using cached data`);

      const fetchEnd = performance.now();

      console.log(
        `[EntityStore] Single-fetch optimization saved ${fetchEnd - fetchStart}ms for gateway ${gatewayId}`
      );

      return;
    }

    console.log(`[EntityStore] Starting IoT entities fetch from database for gateway ${gatewayId}`);

    try {
      set({ iotEntitiesLoading: true });

      const apiCallStart = performance.now();
      const iotEntities: IoTEntity[] = await apiClient.getIoTEntities(gatewayId, token);
      const apiCallEnd = performance.now();

      console.log(
        `[EntityStore] IoT entities API call completed in ${apiCallEnd - apiCallStart}ms`
      );

      console.log(`[EntityStore] Received ${iotEntities.length} IoT entities from database`);

      set({ iotEntitiesLoading: false, iotEntities });

      // Mark this gateway as fetched to prevent redundant fetches
      get().addFetchedGateway(gatewayIdNum);

      const fetchEnd = performance.now();

      console.log(
        `[EntityStore] Complete IoT entities fetch completed in ${fetchEnd - fetchStart}ms`
      );
    } catch (error) {
      console.error('Error fetching IoT entities:', error);
      set({ iotEntitiesLoading: false });
      handleUnauthorizedError(error as Error);

      const fetchEnd = performance.now();
      console.log(`[EntityStore] IoT entities fetch failed in ${fetchEnd - fetchStart}ms`);
      throw error;
    }
  },

  // Explicit method to compute and set entity lists
  computeAndSetEntityLists: (isNewGateway: boolean = false) => {
    const computeStart = performance.now();
    console.log(`[EntityStore] computeAndSetEntityLists called, isNewGateway: ${isNewGateway}`);

    const { haEntities, iotEntities } = get();

    if (haEntities.length === 0) {
      // No HA entities, clear computed lists
      console.log(`[EntityStore] No HA entities, clearing computed lists`);
      set({ linkableEntities: [], linkedEntities: [] });
      return;
    }

    const syncResult = get().computeEntityLists(haEntities, iotEntities, isNewGateway);
    set({
      linkableEntities: syncResult.linkableEntities,
      linkedEntities: syncResult.linkedEntities,
    });

    const computeEnd = performance.now();
    console.log(
      `[EntityStore] computeAndSetEntityLists completed in ${computeEnd - computeStart}ms`
    );
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
      // For new gateways, check if any IoT entities exist (including pseudo entities from optimistic updates)
      if (iotEntities.length > 0) {
        // Some IoT entities exist (likely pseudo entities from optimistic updates)
        // Separate them into linked and linkable based on their grow assignment
        const existingLinkedEntities = iotEntities.filter((entity) => entity.linked_grow_id);
        const existingEntityIds = new Set(iotEntities.map((entity) => entity.entity_name));

        // Create pseudo entities for HA entities that don't have IoT counterparts yet
        const newLinkableEntities = haEntities
          .filter((haEntity) => !existingEntityIds.has(haEntity.entity_id))
          .map((haEntity) => ({
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

        // Add unlinked existing entities to linkable list
        const existingLinkableEntities = iotEntities.filter((entity) => !entity.linked_grow_id);
        const allLinkableEntities = [...newLinkableEntities, ...existingLinkableEntities];

        console.log(
          `[EntityStore] New gateway with optimistic updates: ${allLinkableEntities.length} linkable entities, ${existingLinkedEntities.length} linked entities`
        );

        return {
          newEntities: haEntities.filter((haEntity) => !existingEntityIds.has(haEntity.entity_id)),
          orphanedEntities: [],
          linkableEntities: allLinkableEntities,
          linkedEntities: existingLinkedEntities,
        };
      } else {
        // No IoT entities exist, all HA entities are linkable
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

  // Determine if entity sync should be skipped (optimization for existing gateways)
  shouldSkipEntitySync: (gateway: IoTGateway) => {
    const { haEntities, iotEntities, lastCredentials, fetchedGateways } = get();

    console.log(`[EntityStore] shouldSkipEntitySync check for gateway ${gateway.id}`);

    // Always sync for new gateways (not saved yet)
    if (gateway.id === NEW_GATEWAY_ID) {
      console.log(`[EntityStore] New gateway detected - sync required`);
      return false;
    }

    // If no HA entities fetched, we can't determine sync status
    if (haEntities.length === 0) {
      console.log(`[EntityStore] No HA entities loaded - sync required`);
      return false;
    }

    // Check if credentials have changed (would require entity refetch)
    const storedCredentials = lastCredentials.get(gateway.id);
    if (!storedCredentials) {
      console.log(`[EntityStore] No cached credentials - sync required`);
      return false;
    }

    const credentialsChanged =
      storedCredentials.apiUrl !== gateway.api_url || storedCredentials.apiKey !== gateway.api_key;

    if (credentialsChanged) {
      console.log(`[EntityStore] Credentials changed - sync required`);
      return false;
    }

    // Check if we have IoT entities cached for this gateway
    if (!fetchedGateways.has(gateway.id)) {
      console.log(`[EntityStore] IoT entities not cached - sync required`);
      return false;
    }

    // If we have HA entities, cached credentials are unchanged, and IoT entities are cached,
    // the WebSocket should be maintaining sync, so we can skip expensive sync
    console.log(`[EntityStore] All conditions met - sync can be skipped for optimization`);
    return true;
  },

  // Sync IoT entities after gateway save - comprehensive sync logic
  syncIotEntities: async (token: string, gateway: IoTGateway) => {
    console.log(`[EntityStore] syncIotEntities called for gateway ${gateway.id}`);

    // Check if sync can be skipped using smart detection (optimization for existing gateways)
    if (get().shouldSkipEntitySync(gateway)) {
      console.log(
        `[EntityStore] Smart sync detection: skipping unnecessary entity sync for gateway ${gateway.id}`
      );

      // Update computed entity lists with current state (no API calls needed)
      const { haEntities, iotEntities } = get();
      const syncResult = get().computeEntityLists(haEntities, iotEntities, false);

      set({
        linkableEntities: syncResult.linkableEntities,
        linkedEntities: syncResult.linkedEntities,
      });

      console.log(`[EntityStore] Optimized sync completed - WebSocket maintains current state`);
      return true;
    }

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

  // Update pending links for new gateways (in-memory storage)
  updatePendingLinks: (entityId: string, growId?: number, stage?: string) => {
    console.log(
      `[EntityStore] Updating pending links for entity ${entityId}: growId=${growId}, stage=${stage}`
    );

    set((state) => {
      const newPendingLinks = new Map(state.pendingLinks);

      if (growId !== undefined && stage !== undefined) {
        // Set or update pending link
        newPendingLinks.set(entityId, { growId, stage });
      } else {
        // Remove pending link (unlink)
        newPendingLinks.delete(entityId);
      }

      return { pendingLinks: newPendingLinks };
    });

    console.log(`[EntityStore] Pending links updated for entity ${entityId}`);
  },

  // Commit all pending links to database after gateway save
  commitPendingLinks: async (token: string, gatewayId: number): Promise<boolean> => {
    const { pendingLinks, iotEntities } = get();

    console.log(
      `[EntityStore] commitPendingLinks called - pendingLinks size: ${pendingLinks.size}, iotEntities count: ${iotEntities.length}`
    );

    // Enhanced debugging - log all pending links and available entities
    if (pendingLinks.size > 0) {
      console.log('[EntityStore] Pending links details:');
      pendingLinks.forEach((linkData, entityId) => {
        console.log(`  - ${entityId}: growId=${linkData.growId}, stage=${linkData.stage}`);
      });
    }

    if (iotEntities.length > 0) {
      console.log(`[EntityStore] Available IoT entities for gateway ${gatewayId}:`);
      iotEntities
        .filter((entity) => entity.gateway_id === gatewayId)
        .forEach((entity) => {
          console.log(
            `  - ${entity.entity_name} (ID: ${entity.id}, gateway: ${entity.gateway_id})`
          );
        });
    }

    if (pendingLinks.size === 0) {
      console.log('[EntityStore] No pending links to commit');
      return true;
    }

    console.log(
      `[EntityStore] Committing ${pendingLinks.size} pending links for gateway ${gatewayId}`
    );

    try {
      // Group pending links by operation type
      const linksToCreate: Array<{ entityId: string; growId: number; stage: string }> = [];
      const linksToRemove: string[] = [];

      pendingLinks.forEach((linkData, entityId) => {
        if (linkData.growId && linkData.stage) {
          linksToCreate.push({
            entityId,
            growId: linkData.growId,
            stage: linkData.stage,
          });
        } else {
          linksToRemove.push(entityId);
        }
      });

      // Find corresponding database entities with enhanced debugging
      console.log(
        `[EntityStore] Looking for database entities to link: ${linksToCreate.length} entities`
      );
      const entitiesToLink = linksToCreate
        .map(({ entityId, growId, stage }) => {
          const dbEntity = iotEntities.find(
            (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayId
          );
          if (!dbEntity) {
            console.log(
              `[EntityStore] WARNING: Could not find database entity for ${entityId} on gateway ${gatewayId}`
            );
            console.log(
              `[EntityStore] Available entities for this gateway:`,
              iotEntities.filter((e) => e.gateway_id === gatewayId).map((e) => e.entity_name)
            );
          } else {
            console.log(`[EntityStore] Found database entity for ${entityId}: ID ${dbEntity.id}`);
          }
          return dbEntity ? { dbEntity, growId, stage } : null;
        })
        .filter(Boolean) as Array<{ dbEntity: IoTEntity; growId: number; stage: string }>;

      console.log(
        `[EntityStore] Looking for database entities to unlink: ${linksToRemove.length} entities`
      );
      const entitiesToUnlink = linksToRemove
        .map((entityId) => {
          const dbEntity = iotEntities.find(
            (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayId
          );
          if (!dbEntity) {
            console.log(
              `[EntityStore] WARNING: Could not find database entity for unlinking ${entityId} on gateway ${gatewayId}`
            );
          }
          return dbEntity;
        })
        .filter(Boolean) as IoTEntity[];

      console.log(
        `[EntityStore] Entity mapping results: ${entitiesToLink.length}/${linksToCreate.length} found for linking, ${entitiesToUnlink.length}/${linksToRemove.length} found for unlinking`
      );

      // Perform bulk operations
      if (entitiesToLink.length > 0) {
        // Group by growId and stage for bulk operations
        const linkGroups = new Map<
          string,
          { growId: number; stage: string; entityIds: number[] }
        >();

        entitiesToLink.forEach(({ dbEntity, growId, stage }) => {
          const key = `${growId}-${stage}`;
          if (!linkGroups.has(key)) {
            linkGroups.set(key, { growId, stage, entityIds: [] });
          }
          linkGroups.get(key)!.entityIds.push(dbEntity.id);
        });

        // Execute bulk link operations
        for (const { growId, stage, entityIds } of linkGroups.values()) {
          await apiClient.bulkLinkIoTEntities(
            gatewayId.toString(),
            entityIds,
            growId,
            stage,
            token
          );
        }

        console.log(`[EntityStore] Bulk linked ${entitiesToLink.length} entities`);
      }

      if (entitiesToUnlink.length > 0) {
        const entityIdsToUnlink = entitiesToUnlink.map((entity) => entity.id);
        await apiClient.bulkUnlinkIoTEntities(gatewayId.toString(), entityIdsToUnlink, token);
        console.log(`[EntityStore] Bulk unlinked ${entitiesToUnlink.length} entities`);
      }

      // Clear pending links after successful commit
      get().clearPendingLinks();

      console.log(
        `[EntityStore] Successfully committed all pending links for gateway ${gatewayId}`
      );
      return true;
    } catch (error) {
      console.error('Error committing pending links:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Clear all pending links (for cancel/cleanup operations)
  clearPendingLinks: () => {
    console.log('[EntityStore] Clearing all pending links');
    set({ pendingLinks: new Map() });
  },

  // Link entity to grow/stage with optimistic updates
  linkEntity: async (
    token: string,
    gatewayId: string,
    entityId: string,
    growId: number,
    stage: string
  ) => {
    const gatewayIdNum = parseInt(gatewayId, 10);

    console.log(
      `[EntityStore] Linking entity ${entityId} to grow ${growId}, stage ${stage} with optimistic update`
    );

    // Check if this is a new gateway (not saved yet)
    const isNewGateway = gatewayIdNum === -1;

    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - storing link in pending links instead of API call`
      );

      try {
        set({ operationLoading: true });

        // Store in pending links for later commitment
        get().updatePendingLinks(entityId, growId, stage);

        // Perform optimistic update immediately for UI responsiveness
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, growId, stage);
        console.log(`[EntityStore] Pending link stored and optimistic update applied`);

        set({ operationLoading: false });
        console.log(
          `[EntityStore] Link operation completed successfully for entity ${entityId} (pending)`
        );
        return true;
      } catch (error) {
        console.error('Error storing pending link:', error);
        set({ operationLoading: false });
        return false;
      }
    }

    // Find the database entity to get the correct ID for API calls
    const { iotEntities } = get();
    const entityToLink = iotEntities.find(
      (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayIdNum
    );

    if (!entityToLink) {
      console.log(`[EntityStore] Entity ${entityId} not found for linking`);
      return false;
    }

    try {
      set({ operationLoading: true });

      // Perform optimistic update immediately for UI responsiveness
      get().optimisticUpdateEntityLink(entityId, gatewayIdNum, growId, stage);
      console.log(`[EntityStore] Optimistic update applied, UI should show immediate change`);

      // Perform background API call using the database ID, not the entity name
      const apiStart = performance.now();
      console.log(
        `[EntityStore] Calling linkIoTEntity with database ID ${entityToLink.id} for entity ${entityId}`
      );
      await apiClient.linkIoTEntity(gatewayId, entityToLink.id.toString(), growId, stage, token);
      const apiEnd = performance.now();
      console.log(`[EntityStore] Background API call completed in ${apiEnd - apiStart}ms`);

      set({ operationLoading: false });
      console.log(`[EntityStore] Link operation completed successfully for entity ${entityId}`);
      return true;
    } catch (error) {
      console.error('Error linking entity:', error);

      // Rollback optimistic update on error
      console.log(`[EntityStore] Rolling back optimistic update for entity ${entityId}`);
      get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);

      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Unlink entity from grow with optimistic updates
  unlinkEntity: async (token: string, gatewayId: string, entityId: string) => {
    const gatewayIdNum = parseInt(gatewayId, 10);

    console.log(`[EntityStore] Unlinking entity ${entityId} with optimistic update`);

    // Check if this is a new gateway (not saved yet)
    const isNewGateway = gatewayIdNum === -1;

    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - storing unlink in pending links instead of API call`
      );

      try {
        set({ operationLoading: true });

        // Store in pending links for later commitment (clear the link)
        get().updatePendingLinks(entityId, undefined, undefined);

        // Perform optimistic update immediately for UI responsiveness
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
        console.log(`[EntityStore] Pending unlink stored and optimistic update applied`);

        set({ operationLoading: false });
        console.log(
          `[EntityStore] Unlink operation completed successfully for entity ${entityId} (pending)`
        );
        return true;
      } catch (error) {
        console.error('Error storing pending unlink:', error);
        set({ operationLoading: false });
        return false;
      }
    }

    // Store the current state for rollback if needed
    const { iotEntities } = get();
    const entityToUnlink = iotEntities.find(
      (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayIdNum
    );

    if (!entityToUnlink) {
      console.log(`[EntityStore] Entity ${entityId} not found for unlinking`);
      return false;
    }

    const previousGrowId = entityToUnlink.linked_grow_id;
    const previousStage = entityToUnlink.linked_stage;

    try {
      set({ operationLoading: true });

      // Perform optimistic update immediately for UI responsiveness
      get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
      console.log(
        `[EntityStore] Optimistic unlink update applied, UI should show immediate change`
      );

      // Perform background API call using the database ID, not the entity name
      const apiStart = performance.now();
      console.log(
        `[EntityStore] Calling unlinkIoTEntity with database ID ${entityToUnlink.id} for entity ${entityId}`
      );
      await apiClient.unlinkIoTEntity(gatewayId, entityToUnlink.id.toString(), token);
      const apiEnd = performance.now();
      console.log(`[EntityStore] Background unlink API call completed in ${apiEnd - apiStart}ms`);

      set({ operationLoading: false });
      console.log(`[EntityStore] Unlink operation completed successfully for entity ${entityId}`);
      return true;
    } catch (error) {
      console.error('Error unlinking entity:', error);

      // Rollback optimistic update on error
      console.log(`[EntityStore] Rolling back optimistic unlink update for entity ${entityId}`);
      get().optimisticUpdateEntityLink(entityId, gatewayIdNum, previousGrowId, previousStage);

      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Bulk link entities with optimistic updates
  bulkLinkEntities: async (
    token: string,
    gatewayId: string,
    entityIds: string[],
    growId: number,
    stage: string
  ) => {
    const gatewayIdNum = parseInt(gatewayId, 10);

    console.log(
      `[EntityStore] Bulk linking ${entityIds.length} entities to grow ${growId}, stage ${stage} with optimistic update`
    );

    // Check if this is a new gateway (not saved yet)
    const isNewGateway = gatewayIdNum === -1;

    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - storing bulk links in pending links instead of API call`
      );

      try {
        set({ operationLoading: true });

        // Store all entities in pending links for later commitment
        entityIds.forEach((entityId) => {
          get().updatePendingLinks(entityId, growId, stage);
        });

        // Apply optimistic updates immediately for all entities
        entityIds.forEach((entityId) => {
          get().optimisticUpdateEntityLink(entityId, gatewayIdNum, growId, stage);
        });
        console.log(
          `[EntityStore] Pending bulk links stored and optimistic updates applied for ${entityIds.length} entities`
        );

        set({ operationLoading: false });
        console.log(
          `[EntityStore] Bulk link operation completed successfully for ${entityIds.length} entities (pending)`
        );
        return true;
      } catch (error) {
        console.error('Error storing pending bulk links:', error);
        set({ operationLoading: false });
        return false;
      }
    }

    // Find database entities to get correct IDs for API calls
    const { iotEntities } = get();
    const entitiesToLink = entityIds
      .map((entityId) => {
        return iotEntities.find(
          (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayIdNum
        );
      })
      .filter(Boolean) as IoTEntity[];

    if (entitiesToLink.length !== entityIds.length) {
      console.log(
        `[EntityStore] Some entities not found for bulk linking. Found ${entitiesToLink.length} of ${entityIds.length}`
      );
      return false;
    }

    try {
      set({ operationLoading: true });

      // Apply optimistic updates immediately for all entities
      entityIds.forEach((entityId) => {
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, growId, stage);
      });
      console.log(
        `[EntityStore] Optimistic bulk link updates applied for ${entityIds.length} entities, UI should show immediate changes`
      );

      // Perform background API call using database IDs, not entity names
      const apiStart = performance.now();
      const databaseEntityIds = entitiesToLink.map((entity) => entity.id);
      console.log(
        `[EntityStore] Calling bulkLinkIoTEntities with database IDs: [${databaseEntityIds.join(', ')}] for entities: [${entityIds.join(', ')}]`
      );
      await apiClient.bulkLinkIoTEntities(gatewayId, databaseEntityIds, growId, stage, token);
      const apiEnd = performance.now();
      console.log(
        `[EntityStore] Background bulk link API call completed in ${apiEnd - apiStart}ms`
      );

      set({ operationLoading: false });
      console.log(
        `[EntityStore] Bulk link operation completed successfully for ${entityIds.length} entities`
      );
      return true;
    } catch (error) {
      console.error('Error bulk linking entities:', error);

      // Rollback all optimistic updates on error
      console.log(`[EntityStore] Rolling back optimistic updates for ${entityIds.length} entities`);
      entityIds.forEach((entityId) => {
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
      });

      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Bulk unlink entities with optimistic updates
  bulkUnlinkEntities: async (token: string, gatewayId: string, entityIds: string[]) => {
    const gatewayIdNum = parseInt(gatewayId, 10);

    console.log(`[EntityStore] Bulk unlinking ${entityIds.length} entities with optimistic update`);

    // Check if this is a new gateway (not saved yet)
    const isNewGateway = gatewayIdNum === -1;

    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - storing bulk unlinks in pending links instead of API call`
      );

      try {
        set({ operationLoading: true });

        // Store all entities in pending links for later commitment (clear the links)
        entityIds.forEach((entityId) => {
          get().updatePendingLinks(entityId, undefined, undefined);
        });

        // Apply optimistic updates immediately for all entities
        entityIds.forEach((entityId) => {
          get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
        });
        console.log(
          `[EntityStore] Pending bulk unlinks stored and optimistic updates applied for ${entityIds.length} entities`
        );

        set({ operationLoading: false });
        console.log(
          `[EntityStore] Bulk unlink operation completed successfully for ${entityIds.length} entities (pending)`
        );
        return true;
      } catch (error) {
        console.error('Error storing pending bulk unlinks:', error);
        set({ operationLoading: false });
        return false;
      }
    }

    // Find database entities to get correct IDs for API calls and store previous states for rollback
    const { iotEntities } = get();
    const entitesToUnlink = entityIds
      .map((entityId) => {
        return iotEntities.find(
          (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayIdNum
        );
      })
      .filter(Boolean) as IoTEntity[];

    if (entitesToUnlink.length !== entityIds.length) {
      console.log(
        `[EntityStore] Some entities not found for bulk unlinking. Found ${entitesToUnlink.length} of ${entityIds.length}`
      );
      return false;
    }

    // Store previous states for rollback if needed
    const previousStates = new Map<string, { growId?: number; stage?: string }>();
    entitesToUnlink.forEach((entity) => {
      previousStates.set(entity.entity_name, {
        growId: entity.linked_grow_id,
        stage: entity.linked_stage,
      });
    });

    try {
      set({ operationLoading: true });

      // Apply optimistic updates immediately for all entities
      entityIds.forEach((entityId) => {
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
      });
      console.log(
        `[EntityStore] Optimistic bulk unlink updates applied for ${entityIds.length} entities, UI should show immediate changes`
      );

      // Perform background API call using database IDs, not entity names
      const apiStart = performance.now();
      const databaseEntityIds = entitesToUnlink.map((entity) => entity.id);
      console.log(
        `[EntityStore] Calling bulkUnlinkIoTEntities with database IDs: [${databaseEntityIds.join(', ')}] for entities: [${entityIds.join(', ')}]`
      );
      await apiClient.bulkUnlinkIoTEntities(gatewayId, databaseEntityIds, token);
      const apiEnd = performance.now();
      console.log(
        `[EntityStore] Background bulk unlink API call completed in ${apiEnd - apiStart}ms`
      );

      set({ operationLoading: false });
      console.log(
        `[EntityStore] Bulk unlink operation completed successfully for ${entityIds.length} entities`
      );
      return true;
    } catch (error) {
      console.error('Error bulk unlinking entities:', error);

      // Rollback all optimistic updates on error
      console.log(
        `[EntityStore] Rolling back optimistic unlink updates for ${entityIds.length} entities`
      );
      entityIds.forEach((entityId) => {
        const previousState = previousStates.get(entityId);
        if (previousState) {
          get().optimisticUpdateEntityLink(
            entityId,
            gatewayIdNum,
            previousState.growId,
            previousState.stage
          );
        }
      });

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

  // Handle gateway deletion - clean up all related state
  handleGatewayDeletion: (gatewayId: number) => {
    console.log(`[EntityStore] Handling gateway deletion for gateway ${gatewayId}`);

    set((state) => {
      // Remove all entities for this gateway
      const updatedHaEntities = state.haEntities.filter((entity) => {
        // Note: HA entities don't have gateway_id, but we can infer from current context
        // For now, we'll clear all HA entities as they're typically gateway-specific
        return false; // Clear all HA entities since we don't know which gateway they belong to
      });

      const updatedIotEntities = state.iotEntities.filter(
        (entity) => entity.gateway_id !== gatewayId
      );

      // Remove credentials cache for this gateway
      const updatedCredentials = new Map(state.lastCredentials);
      updatedCredentials.delete(gatewayId);

      // Remove from fetched gateways set
      const updatedFetchedGateways = new Set(state.fetchedGateways);
      updatedFetchedGateways.delete(gatewayId);

      // Clear pending links for this gateway
      const updatedPendingLinks = new Map<string, { growId?: number; stage?: string }>();
      state.pendingLinks.forEach((linkData, entityId) => {
        // Check if this entity belongs to the deleted gateway by looking at HA entities
        const belongsToDeletedGateway = state.haEntities.some(
          (haEntity) => haEntity.entity_id === entityId
        );
        if (!belongsToDeletedGateway) {
          updatedPendingLinks.set(entityId, linkData);
        }
      });

      // Recompute entity lists with updated entities
      const syncResult = get().computeEntityLists(updatedHaEntities, updatedIotEntities, false);

      console.log(
        `[EntityStore] Gateway ${gatewayId} deletion cleanup complete: removed ${
          state.iotEntities.length - updatedIotEntities.length
        } IoT entities, ${state.haEntities.length - updatedHaEntities.length} HA entities`
      );

      return {
        haEntities: updatedHaEntities,
        iotEntities: updatedIotEntities,
        linkableEntities: syncResult.linkableEntities,
        linkedEntities: syncResult.linkedEntities,
        lastCredentials: updatedCredentials,
        fetchedGateways: updatedFetchedGateways,
        pendingLinks: updatedPendingLinks,
        // Clear selection if any selected entities belonged to this gateway
        selectedEntityIds: new Set<string>(),
        bulkSelectionMode: false,
      };
    });

    // Clean up WebSocket connection for this gateway
    try {
      haWebSocketManager.disconnectGateway(gatewayId);
      console.log(`[EntityStore] WebSocket connection cleaned up for gateway ${gatewayId}`);
    } catch (error) {
      console.error(`[EntityStore] Error cleaning up WebSocket for gateway ${gatewayId}:`, error);
    }

    console.log(`[EntityStore] Gateway ${gatewayId} deletion handling completed`);
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

// Debug flag for optional logging (set to false for production performance)
const DEBUG_ENTITY_FILTERING = false;

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
