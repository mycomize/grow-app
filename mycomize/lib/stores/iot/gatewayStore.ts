import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../../ApiClient';
import { IoTGateway, IoTGatewayCreate, IoTGatewayUpdate } from '../../iot';
import { ConnectionInfo, ConnectionStatus } from '../../iotTypes';

// Helper function to handle unauthorized errors consistently
const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

// Current gateway being edited/created
interface CurrentGateway {
  id?: number; // undefined for new, set for editing
  formData: IoTGatewayUpdate; // all form fields
  connectionStatus: ConnectionStatus;
  latency?: number;
}

// Gateway fetch strategy result
interface GatewayFetchStrategy {
  shouldFetchAll: boolean;
  shouldFetchSingle: number | null;
  shouldTestConnections: boolean;
  shouldTestSingleConnection: number | null;
}

// Gateway modification tracking
type GatewayAction = 'create' | 'update' | 'delete' | 'cancel' | null;

interface GatewayStore {
  // State
  gateways: IoTGateway[];
  loading: boolean;
  connectionStatuses: Record<number, ConnectionStatus>;
  connectionLatencies: Record<number, number>;
  currentGateway: CurrentGateway | null;

  // Smart fetching state
  hasInitiallyLoaded: boolean;
  lastModifiedGatewayId: number | null;
  lastAction: GatewayAction;
  hasInitiallyTestedConnections: boolean;

  // Actions
  fetchGateways: (token: string) => Promise<void>;
  fetchSingleGateway: (token: string, gatewayId: string) => Promise<void>;
  createGateway: (token: string, data: IoTGatewayCreate) => Promise<boolean>;
  updateGateway: (token: string, id: string, data: IoTGatewayUpdate) => Promise<boolean>;
  deleteGateway: (token: string, id: string) => Promise<boolean>;
  testConnection: (gateway: IoTGateway) => Promise<ConnectionInfo>;
  testSingleConnection: (gatewayId: number) => Promise<void>;
  checkAllConnections: () => Promise<void>;

  // Smart fetching actions
  markGatewayModified: (gatewayId: number | null, action: GatewayAction) => void;
  getGatewayFetchStrategy: () => GatewayFetchStrategy;
  clearFetchingState: () => void;

  // Current gateway actions
  initializeCurrentGateway: (gatewayId?: string) => void;
  updateCurrentGatewayField: (field: keyof IoTGatewayUpdate, value: any) => void;
  testCurrentGatewayConnection: () => Promise<ConnectionInfo>;
  clearCurrentGateway: () => void;

  reset: () => void;
}

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  // Initial state
  gateways: [],
  loading: false,
  connectionStatuses: {},
  connectionLatencies: {},
  currentGateway: null,

  // Smart fetching initial state
  hasInitiallyLoaded: false,
  lastModifiedGatewayId: null,
  lastAction: null,
  hasInitiallyTestedConnections: false,

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
        hasInitiallyLoaded: true,
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
        lastModifiedGatewayId: newGateway.id,
        lastAction: 'create',
      }));

      return true;
    } catch (error) {
      console.error('Error creating gateway:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Update an existing gateway
  updateGateway: async (token: string, id: string, data: IoTGatewayUpdate) => {
    try {
      const updatedGateway: IoTGateway = await apiClient.put(
        `/iot-gateways/${id}`,
        data,
        token,
        'IoTGateway',
        'IoTGateway'
      );

      set((state) => ({
        gateways: state.gateways.map((gateway) =>
          gateway.id.toString() === id ? updatedGateway : gateway
        ),
        lastModifiedGatewayId: updatedGateway.id,
        lastAction: 'update',
      }));

      return true;
    } catch (error) {
      console.error('Error updating gateway:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Delete a gateway
  deleteGateway: async (token: string, id: string) => {
    try {
      await apiClient.delete(`/iot-gateways/${id}`, token);

      set((state) => ({
        gateways: state.gateways.filter((gateway) => gateway.id.toString() !== id),
        connectionStatuses: Object.fromEntries(
          Object.entries(state.connectionStatuses).filter(([key]) => key !== id)
        ),
        connectionLatencies: Object.fromEntries(
          Object.entries(state.connectionLatencies).filter(([key]) => key !== id)
        ),
        lastModifiedGatewayId: parseInt(id, 10),
        lastAction: 'delete',
      }));

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

    // Mark that we've initially tested connections
    set((state) => ({
      hasInitiallyTestedConnections: true,
    }));
  },

  // Smart fetching methods
  markGatewayModified: (gatewayId: number | null, action: GatewayAction) => {
    set({
      lastModifiedGatewayId: gatewayId,
      lastAction: action,
    });
  },

  getGatewayFetchStrategy: (): GatewayFetchStrategy => {
    const { hasInitiallyLoaded, lastAction, lastModifiedGatewayId, hasInitiallyTestedConnections } =
      get();

    // First time loading - fetch all and test all connections
    if (!hasInitiallyLoaded) {
      return {
        shouldFetchAll: true,
        shouldFetchSingle: null,
        shouldTestConnections: !hasInitiallyTestedConnections,
        shouldTestSingleConnection: null,
      };
    }

    // Handle different actions
    switch (lastAction) {
      case 'create':
        // New gateway created - fetch the new one and test its connection
        return {
          shouldFetchAll: false,
          shouldFetchSingle: lastModifiedGatewayId,
          shouldTestConnections: false,
          shouldTestSingleConnection: lastModifiedGatewayId,
        };

      case 'update':
        // Gateway updated - fetch it and test connection (credentials might have changed)
        return {
          shouldFetchAll: false,
          shouldFetchSingle: lastModifiedGatewayId,
          shouldTestConnections: false,
          shouldTestSingleConnection: lastModifiedGatewayId,
        };

      case 'delete':
        // Gateway deleted - state already updated, no fetching needed
        return {
          shouldFetchAll: false,
          shouldFetchSingle: null,
          shouldTestConnections: false,
          shouldTestSingleConnection: null,
        };

      case 'cancel':
      case null:
      default:
        // No changes or cancelled - no operations needed
        return {
          shouldFetchAll: false,
          shouldFetchSingle: null,
          shouldTestConnections: false,
          shouldTestSingleConnection: null,
        };
    }
  },

  clearFetchingState: () => {
    set({
      lastModifiedGatewayId: null,
      lastAction: null,
    });
  },

  // Initialize current gateway for editing/creating
  initializeCurrentGateway: (gatewayId?: string) => {
    const { gateways, connectionStatuses, connectionLatencies } = get();

    if (!gatewayId || gatewayId === 'new') {
      // New gateway - initialize with empty form data
      set({
        currentGateway: {
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

  // Clear current gateway
  clearCurrentGateway: () => {
    set({ currentGateway: null });
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
export const useClearCurrentGateway = () => useGatewayStore((state) => state.clearCurrentGateway);
