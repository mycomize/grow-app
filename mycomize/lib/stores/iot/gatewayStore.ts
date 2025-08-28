import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../../api/ApiClient';
import { IoTGateway, IoTGatewayCreate, IoTGatewayUpdate } from '../../iot/iot';
import { ConnectionInfo, ConnectionStatus, NEW_GATEWAY_ID } from '../../types/iotTypes';
import { useEntityStore } from './entityStore';

// Helper function to handle unauthorized errors consistently
const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

// Current gateway being edited/created
interface CurrentGateway {
  id: number; // undefined for new, set for editing
  formData: IoTGatewayUpdate; // all form fields
  connectionStatus: ConnectionStatus;
  latency?: number;
}

interface GatewayStore {
  // State
  gateways: IoTGateway[];
  loading: boolean;
  connectionStatuses: Record<number, ConnectionStatus>;
  connectionLatencies: Record<number, number>;
  currentGateway: CurrentGateway | null;

  // Actions
  fetchGateways: (token: string) => Promise<void>;
  fetchSingleGateway: (token: string, gatewayId: string) => Promise<void>;
  createGateway: (token: string, data: IoTGatewayCreate) => Promise<IoTGateway | null>;
  createGatewayWithEntities: (token: string, data: IoTGatewayCreate) => Promise<IoTGateway | null>;
  updateGateway: (token: string, id: string, data: IoTGatewayUpdate) => Promise<boolean>;
  deleteGateway: (token: string, id: string) => Promise<boolean>;
  testConnection: (gateway: IoTGateway) => Promise<ConnectionInfo>;
  testSingleConnection: (gatewayId: number) => Promise<void>;
  checkAllConnections: () => Promise<void>;
  initializeAllGatewayData: (token: string) => Promise<void>;

  // Current gateway actions
  initializeCurrentGateway: (gatewayId?: string) => void;
  updateCurrentGatewayField: (field: keyof IoTGatewayUpdate, value: any) => void;
  testCurrentGatewayConnection: () => Promise<ConnectionInfo>;

  reset: () => void;
}

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  // Initial state
  gateways: [],
  loading: false,
  connectionStatuses: {},
  connectionLatencies: {},
  currentGateway: null,

  // Fetch all gateways
  fetchGateways: async (token: string) => {
    try {
      set({ loading: true });

      const data: IoTGateway[] = await apiClient.get('/iot-gateways/', token, 'IoTGateway', true);

      // Parse encrypted count values - they come as strings and need to be parsed to integers
      const gatewaysWithCounts = data.map((gateway) => {
        const linkedCount = gateway.linked_entities_count
          ? typeof gateway.linked_entities_count === 'string'
            ? parseInt(gateway.linked_entities_count, 10)
            : gateway.linked_entities_count
          : 0;
        const linkableCount = gateway.linkable_entities_count
          ? typeof gateway.linkable_entities_count === 'string'
            ? parseInt(gateway.linkable_entities_count, 10)
            : gateway.linkable_entities_count
          : 0;

        return {
          ...gateway,
          linked_entities_count: linkedCount,
          linkable_entities_count: linkableCount,
        };
      });

      set({
        gateways: gatewaysWithCounts,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching gateways:', error);
      set({ loading: false });
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

  // Fetch single gateway (optimized selective fetch)
  fetchSingleGateway: async (token: string, gatewayId: string) => {
    try {
      const data: IoTGateway = await apiClient.get(
        `/iot-gateways/${gatewayId}`,
        token,
        'IoTGateway'
      );

      // Parse encrypted count values
      const linkedCount = data.linked_entities_count
        ? typeof data.linked_entities_count === 'string'
          ? parseInt(data.linked_entities_count, 10)
          : data.linked_entities_count
        : 0;
      const linkableCount = data.linkable_entities_count
        ? typeof data.linkable_entities_count === 'string'
          ? parseInt(data.linkable_entities_count, 10)
          : data.linkable_entities_count
        : 0;

      const updatedGateway = {
        ...data,
        linked_entities_count: linkedCount,
        linkable_entities_count: linkableCount,
      };

      // Update only this gateway in the array
      set((state) => ({
        gateways: state.gateways.map((gateway) =>
          gateway.id.toString() === gatewayId ? updatedGateway : gateway
        ),
      }));
    } catch (error) {
      console.error('Error fetching single gateway:', error);
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

  // Create a new gateway
  createGateway: async (token: string, data: IoTGatewayCreate) => {
    try {
      const newGateway: IoTGateway = await apiClient.post(
        '/iot-gateways/',
        data,
        token,
        'IoTGateway',
        'IoTGateway'
      );

      set((state) => ({
        gateways: [...state.gateways, newGateway],
      }));

      return newGateway;
    } catch (error) {
      console.error('Error creating gateway:', error);
      handleUnauthorizedError(error as Error);
      return null;
    }
  },

  // Create gateway with entities in single optimized call
  createGatewayWithEntities: async (token: string, gatewayData: IoTGatewayCreate) => {
    try {
      console.log('[GatewayStore] Starting optimized gateway creation with entities');

      // Get pending links from entity store
      const entityStore = useEntityStore.getState();
      const { pendingLinks, haEntities } = entityStore;

      console.log(
        `[GatewayStore] Found ${pendingLinks.size} pending links and ${haEntities.length} HA entities`
      );

      // Prepare entities with pre-set linking
      const entitiesWithLinks = haEntities.map((haEntity) => {
        const pendingLink = pendingLinks.get(haEntity.entity_id);

        return {
          entity_name: haEntity.entity_id,
          entity_type: 'home_assistant',
          friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
          domain: haEntity.entity_id.split('.')[0] || '',
          device_class: haEntity.attributes?.device_class || '',
          linked_grow_id: pendingLink?.growId,
          linked_stage: pendingLink?.stage,
        };
      });

      const combinedRequest = {
        gateway: gatewayData,
        entities: entitiesWithLinks,
      };

      console.log(
        `[GatewayStore] Sending combined request with gateway + ${entitiesWithLinks.length} entities`
      );

      // Call combined endpoint
      const response = await apiClient.createIoTGatewayWithEntities(combinedRequest, token);

      console.log(`[GatewayStore] Combined endpoint response:`, response);

      // Create gateway object from response
      const newGateway: IoTGateway = {
        id: response.gateway_id,
        ...gatewayData,
        linked_entities_count: Object.keys(response.entity_mappings).filter((entityName) => {
          const pendingLink = pendingLinks.get(entityName);
          return pendingLink?.growId !== undefined;
        }).length,
        linkable_entities_count: Object.keys(response.entity_mappings).filter((entityName) => {
          const pendingLink = pendingLinks.get(entityName);
          return pendingLink?.growId === undefined;
        }).length,
      };

      // Update gateway store
      set((state) => ({
        gateways: [...state.gateways, newGateway],
      }));

      // Create IoT entities from the mapping and update entity store
      const createdIotEntities = entitiesWithLinks.map((entityData) => {
        const databaseId = response.entity_mappings[entityData.entity_name];
        const pendingLink = pendingLinks.get(entityData.entity_name);

        return {
          id: databaseId,
          gateway_id: response.gateway_id,
          entity_name: entityData.entity_name,
          entity_type: entityData.entity_type,
          friendly_name: entityData.friendly_name,
          domain: entityData.domain,
          device_class: entityData.device_class,
          linked_grow_id: pendingLink?.growId,
          linked_stage: pendingLink?.stage,
        };
      });

      // Update entity store directly with the created entities
      entityStore.updateTemporaryEntityIds(response.entity_mappings);
      set((state) => {
        entityStore.iotEntities = createdIotEntities;
        return state;
      });

      // Clear pending links since they've been committed
      entityStore.clearPendingLinks();

      // Recompute entity lists in entity store
      entityStore.computeAndSetEntityLists(false);

      console.log(
        `[GatewayStore] Optimized gateway creation completed successfully. Gateway ID: ${newGateway.id}`
      );

      return newGateway;
    } catch (error) {
      console.error('Error creating gateway with entities:', error);
      handleUnauthorizedError(error as Error);
      return null;
    }
  },

  // Update an existing gateway
  updateGateway: async (token: string, id: string, data: IoTGatewayUpdate) => {
    const updateStart = performance.now();
    console.log(`[GatewayStore] Starting optimized gateway update for gateway ${id}`);

    try {
      const updatedGateway: IoTGateway = await apiClient.put(
        `/iot-gateways/${id}`,
        data,
        token,
        'IoTGateway',
        'IoTGateway'
      );

      // Update local state directly from PUT response
      set((state) => ({
        gateways: state.gateways.map((gateway) =>
          gateway.id.toString() === id ? updatedGateway : gateway
        ),
      }));

      const updateEnd = performance.now();
      console.log(
        `[GatewayStore] Optimized gateway update completed in ${updateEnd - updateStart}ms - local state updated directly from PUT response`
      );

      return true;
    } catch (error) {
      console.error('Error updating gateway:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Delete a gateway
  deleteGateway: async (token: string, id: string) => {
    const gatewayIdNum = parseInt(id, 10);

    try {
      console.log(`[GatewayStore] Deleting gateway ${id} from backend`);
      await apiClient.delete(`/iot-gateways/${id}`, token);

      console.log(`[GatewayStore] Backend deletion successful, updating gateway store state`);
      set((state) => ({
        gateways: state.gateways.filter((gateway) => gateway.id.toString() !== id),
        connectionStatuses: Object.fromEntries(
          Object.entries(state.connectionStatuses).filter(([key]) => key !== id)
        ),
        connectionLatencies: Object.fromEntries(
          Object.entries(state.connectionLatencies).filter(([key]) => key !== id)
        ),
      }));

      // Notify entity store to clean up entities for this gateway
      console.log(
        `[GatewayStore] Notifying entity store to clean up entities for gateway ${gatewayIdNum}`
      );
      try {
        useEntityStore.getState().handleGatewayDeletion(gatewayIdNum);
        console.log(`[GatewayStore] Entity store cleanup completed for gateway ${gatewayIdNum}`);
      } catch (entityError) {
        console.error(
          `[GatewayStore] Error during entity cleanup for gateway ${gatewayIdNum}:`,
          entityError
        );
        // Don't fail the entire deletion if entity cleanup fails
      }

      console.log(`[GatewayStore] Gateway ${id} deletion completed successfully`);
      return true;
    } catch (error) {
      console.error('Error deleting gateway:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Test connection to a gateway
  testConnection: async (gateway: IoTGateway) => {
    const startTime = Date.now();

    try {
      const response = await fetch(`${gateway.api_url}/api/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      const connectionInfo: ConnectionInfo = {
        status: response.ok ? 'connected' : 'disconnected',
        latency: response.ok ? latency : undefined,
      };

      // Update connection status for this gateway
      set((state) => ({
        connectionStatuses: {
          ...state.connectionStatuses,
          [gateway.id]: connectionInfo.status,
        },
        connectionLatencies: connectionInfo.latency
          ? {
              ...state.connectionLatencies,
              [gateway.id]: connectionInfo.latency,
            }
          : state.connectionLatencies,
      }));

      return connectionInfo;
    } catch (error) {
      console.error('Connection test failed:', error);

      const connectionInfo: ConnectionInfo = {
        status: 'disconnected',
      };

      // Update connection status for this gateway
      set((state) => ({
        connectionStatuses: {
          ...state.connectionStatuses,
          [gateway.id]: 'disconnected',
        },
      }));

      return connectionInfo;
    }
  },

  // Test connection for a single gateway by ID
  testSingleConnection: async (gatewayId: number) => {
    const { gateways } = get();
    const gateway = gateways.find((g) => g.id === gatewayId);

    if (gateway) {
      await get().testConnection(gateway);
    }
  },

  // Check all gateway connections
  checkAllConnections: async () => {
    const { gateways } = get();

    const statusPromises = gateways.map(async (gateway) => {
      const connectionInfo = await get().testConnection(gateway);
      return {
        id: gateway.id,
        status: connectionInfo.status,
        latency: connectionInfo.latency,
      };
    });

    await Promise.all(statusPromises);
  },

  // Initialize all gateway data on app startup
  initializeAllGatewayData: async (token: string) => {
    const startTime = performance.now();
    console.log('[GatewayStore] Starting complete gateway data initialization');

    try {
      // Fetch all gateways first
      const fetchGatewaysStart = performance.now();
      await get().fetchGateways(token);
      const fetchGatewaysEnd = performance.now();
      console.log(`[GatewayStore] Gateway fetch completed in ${fetchGatewaysEnd - fetchGatewaysStart}ms`);

      const { gateways } = get();
      const entityStore = useEntityStore.getState();

      if (gateways.length > 0) {
        // Fetch entities for all gateways in parallel
        const entityPromises = [];

        for (const gateway of gateways) {
          // Fetch HA entities if gateway has credentials
          if (gateway.api_url && gateway.api_key) {
            console.log(`[GatewayStore] Adding HA entities fetch for gateway ${gateway.id}`);
            entityPromises.push(entityStore.fetchHaEntities(gateway, false));
          }

          // Fetch IoT entities from database
          console.log(`[GatewayStore] Adding IoT entities fetch for gateway ${gateway.id}`);
          entityPromises.push(entityStore.fetchIotEntities(token, gateway.id.toString(), false));
        }

        // Wait for all entity fetching to complete
        const entityFetchStart = performance.now();
        await Promise.all(entityPromises);
        const entityFetchEnd = performance.now();
        console.log(`[GatewayStore] All entity fetching completed in ${entityFetchEnd - entityFetchStart}ms`);

        // Compute entity lists once after all data is loaded using proper state updates
        const computeStart = performance.now();
        entityStore.computeAndSetEntityLists(false);
        const computeEnd = performance.now();
        console.log(`[GatewayStore] Entity list computation completed in ${computeEnd - computeStart}ms`);
        
        // Note: Entity states are now captured as part of fetchHaEntities, so no separate fetchEntityStates call needed
        console.log(`[GatewayStore] Entity states already captured during HA entities fetch - optimization complete`);

        // Test all gateway connections
        const connectionTestStart = performance.now();
        await get().checkAllConnections();
        const connectionTestEnd = performance.now();
        console.log(`[GatewayStore] Connection testing completed in ${connectionTestEnd - connectionTestStart}ms`);
      } else {
        console.log('[GatewayStore] No gateways found, skipping entity fetching');
      }

      const totalTime = performance.now() - startTime;
      console.log(`[GatewayStore] Complete gateway data initialization finished in ${totalTime}ms for ${gateways.length} gateways`);

    } catch (error) {
      console.error('[GatewayStore] Error during gateway data initialization:', error);
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },


  // Initialize current gateway for editing/creating
  initializeCurrentGateway: (gatewayId?: string) => {
    const { gateways, connectionStatuses, connectionLatencies } = get();

    if (!gatewayId || gatewayId === 'new') {
      // New gateway - initialize with empty form data
      set({
        currentGateway: {
          id: NEW_GATEWAY_ID,
          formData: {
            name: '',
            type: 'home_assistant',
            description: '',
            api_url: '',
            api_key: '',
          },
          connectionStatus: 'unknown',
        },
      });
    } else {
      // Existing gateway - populate from saved data and use existing connection status
      const gateway = gateways.find((g) => g.id.toString() === gatewayId);
      if (gateway) {
        const existingConnectionStatus = connectionStatuses[gateway.id] || 'unknown';
        const existingLatency = connectionLatencies[gateway.id];

        set({
          currentGateway: {
            id: gateway.id,
            formData: {
              name: gateway.name || '',
              type: gateway.type || 'home_assistant',
              description: gateway.description || '',
              api_url: gateway.api_url || '',
              api_key: gateway.api_key || '',
            },
            connectionStatus: existingConnectionStatus,
            latency: existingLatency,
          },
        });
      }
    }
  },

  // Update a field in current gateway form data
  updateCurrentGatewayField: (field: keyof IoTGatewayUpdate, value: any) => {
    set((state) => {
      if (!state.currentGateway) return state;

      return {
        currentGateway: {
          ...state.currentGateway,
          formData: {
            ...state.currentGateway.formData,
            [field]: value,
          },
        },
      };
    });
  },

  // Test connection for current gateway
  testCurrentGatewayConnection: async () => {
    const { currentGateway } = get();
    if (!currentGateway?.formData.api_url || !currentGateway?.formData.api_key) {
      const connectionInfo: ConnectionInfo = {
        status: 'disconnected',
      };

      set((state) => ({
        currentGateway: state.currentGateway
          ? {
              ...state.currentGateway,
              connectionStatus: 'disconnected',
              latency: undefined,
            }
          : null,
      }));

      return connectionInfo;
    }

    // Set connecting status
    set((state) => ({
      currentGateway: state.currentGateway
        ? {
            ...state.currentGateway,
            connectionStatus: 'connecting',
          }
        : null,
    }));

    const startTime = Date.now();

    try {
      const response = await fetch(`${currentGateway.formData.api_url}/api/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${currentGateway.formData.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      const connectionInfo: ConnectionInfo = {
        status: response.ok ? 'connected' : 'disconnected',
        latency: response.ok ? latency : undefined,
      };

      // Update current gateway connection status
      set((state) => ({
        currentGateway: state.currentGateway
          ? {
              ...state.currentGateway,
              connectionStatus: connectionInfo.status,
              latency: connectionInfo.latency,
            }
          : null,
      }));

      return connectionInfo;
    } catch (error) {
      console.error('Current gateway connection test failed:', error);

      const connectionInfo: ConnectionInfo = {
        status: 'disconnected',
      };

      // Update current gateway connection status
      set((state) => ({
        currentGateway: state.currentGateway
          ? {
              ...state.currentGateway,
              connectionStatus: 'disconnected',
              latency: undefined,
            }
          : null,
      }));

      return connectionInfo;
    }
  },

  // Reset store state
  reset: () => {
    set({
      gateways: [],
      loading: false,
      connectionStatuses: {},
      connectionLatencies: {},
      currentGateway: null,
    });
  },
}));

// Helper selectors for optimized subscriptions
export const useGateways = () => useGatewayStore((state) => state.gateways);

export const useGatewayById = (id: string) =>
  useGatewayStore((state) => state.gateways.find((g) => g.id.toString() === id));

export const useConnectionStatus = (gatewayId: number) =>
  useGatewayStore((state) => ({
    status: state.connectionStatuses[gatewayId] || 'unknown',
    latency: state.connectionLatencies[gatewayId],
  }));

export const useGatewayLoading = () => useGatewayStore((state) => state.loading);

// Current gateway selectors for performance optimization with proper caching
export const useCurrentGateway = () => useGatewayStore((state) => state.currentGateway);

export const useCurrentGatewayFormData = () =>
  useGatewayStore((state) => state.currentGateway?.formData);

// Fixed: Use useShallow to prevent infinite loops
export const useCurrentGatewayConnectionStatus = () =>
  useGatewayStore(
    useShallow((state) => {
      if (!state.currentGateway) {
        return { status: 'unknown' as const, latency: undefined };
      }
      return {
        status: state.currentGateway.connectionStatus || 'unknown',
        latency: state.currentGateway.latency,
      };
    })
  );

// Individual action selectors to prevent infinite loops
export const useInitializeCurrentGateway = () =>
  useGatewayStore((state) => state.initializeCurrentGateway);

export const useUpdateCurrentGatewayField = () =>
  useGatewayStore((state) => state.updateCurrentGatewayField);

export const useTestCurrentGatewayConnection = () =>
  useGatewayStore((state) => state.testCurrentGatewayConnection);
