import { HAEntity, IoTEntity, IoTGateway } from '../../../iot';
import { IoTFilterPreferences, EntityOperation } from '../../../iotTypes';

// Re-export existing types from main store
export interface EntitySyncResult {
  newEntities: HAEntity[];
  orphanedEntities: IoTEntity[];
  linkableEntities: IoTEntity[];
  linkedEntities: IoTEntity[];
}

export interface GatewayCredentials {
  apiUrl: string;
  apiKey: string;
}

// Cross-slice communication types
export interface SliceState {
  // Common slice identification
  _sliceName: string;
}

export interface CrossSliceActions {
  // Shared action signatures for coordinating between slices
  recomputeEntityLists?: () => void;
  notifyEntityChange?: (changeType: 'ha' | 'iot' | 'operation') => void;
}

// Entity list computation input/output types
export interface EntityListInput {
  haEntities: HAEntity[];
  iotEntities: IoTEntity[];
  isNewGateway?: boolean;
}

export interface EntityListOutput {
  linkableEntities: IoTEntity[];
  linkedEntities: IoTEntity[];
  newEntities: HAEntity[];
  orphanedEntities: IoTEntity[];
}

// Individual Slice State Types
export interface HaEntitiesState {
  haEntities: HAEntity[];
  haEntitiesLoading: boolean;
  webSocketInitialized: boolean;
  lastCredentials: Map<number, GatewayCredentials>;
}

export interface IotEntitiesState {
  iotEntities: IoTEntity[];
  iotEntitiesLoading: boolean;
  fetchedGateways: Set<number>;
}

export interface EntityOperationsState {
  operationLoading: boolean;
  pendingOperations: Map<string, EntityOperation>;
  pendingLinks: Map<string, { growId?: number; stage?: string }>;
}

export interface SelectionState {
  selectedEntityIds: Set<string>;
  bulkSelectionMode: boolean;
}

export interface FilterState {
  filterPreferences: IoTFilterPreferences;
  filterEnabled: boolean;
}

export interface SyncComputationState {
  linkableEntities: IoTEntity[];
  linkedEntities: IoTEntity[];
}

// Main EntityStore interface (maintained for backward compatibility)
export interface EntityStore
  extends HaEntitiesState,
    IotEntitiesState,
    EntityOperationsState,
    SelectionState,
    FilterState,
    SyncComputationState {
  // HA Entity management
  fetchHaEntities: (gateway: IoTGateway, forceRefresh?: boolean) => Promise<void>;
  clearHaEntities: () => void;

  // Caching and WebSocket integration
  initializeWebSocket: () => void;
  handleWebSocketEntityEvent: (
    gatewayId: number,
    eventType: 'added' | 'removed',
    entity: HAEntity
  ) => void;
  shouldRefreshEntities: (gateway: IoTGateway) => boolean;
  updateCredentialsCache: (gateway: IoTGateway) => void;

  // Gateway tracking for single-fetch optimization
  addFetchedGateway: (gatewayId: number) => void;
  hasFetchedGateway: (gatewayId: number) => boolean;

  // Optimistic updates for immediate UI response
  optimisticUpdateEntityLink: (
    entityId: string,
    gatewayId: number,
    growId?: number,
    stage?: string
  ) => void;

  // Bulk HA entity creation and ID mapping
  handleNewHAEntities: (newEntities: HAEntity[], gatewayId: number, token: string) => Promise<void>;
  updateTemporaryEntityIds: (idMapping: Record<string, number>) => void;

  // IoT Entity management
  fetchIotEntities: (token: string, gatewayId: string, forceRefresh?: boolean) => Promise<void>;
  syncIotEntities: (token: string, gateway: IoTGateway) => Promise<boolean>;
  shouldSkipEntitySync: (gateway: IoTGateway) => boolean;

  // Entity sync computation
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

  // Pending links for new gateways
  updatePendingLinks: (entityId: string, growId?: number, stage?: string) => void;
  commitPendingLinks: (token: string, gatewayId: number) => Promise<boolean>;
  clearPendingLinks: () => void;

  // Entity operations (linking/unlinking)
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

  // Selection management
  toggleEntitySelection: (entityId: string) => void;
  enterBulkMode: () => void;
  exitBulkMode: () => void;
  clearSelection: () => void;

  // Filter management
  updateFilterPreferences: (preferences: Partial<IoTFilterPreferences>) => void;
  toggleFilterEnabled: () => void;
  toggleDomainFilter: (domain: string) => void;
  toggleDeviceClassFilter: (deviceClass: string) => void;
  toggleShowAllDomains: () => void;
  toggleShowAllDeviceClasses: () => void;

  // Utility
  handleGatewayDeletion: (gatewayId: number) => void;
  reset: () => void;
}
