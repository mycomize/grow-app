// Shared IoT-related types and interfaces

export interface ConnectionInfo {
  status: 'connected' | 'connecting' | 'disconnected' | 'unknown';
  version?: string;
  config?: any;
  latency?: number;
}

export type ConnectionStatus = ConnectionInfo['status'];

// Home Assistant device classes organized by category
export const HOME_ASSISTANT_DEVICE_CLASSES = {
  // Environmental sensors (most relevant for grow operations)
  environmental: [
    'temperature',
    'humidity',
    'pressure',
    'carbon_dioxide',
    'volatile_organic_compounds',
    'moisture',
    'illuminance',
    'ph',
    'aqi',
  ],
  // Control devices
  control: ['outlet', 'switch', 'light'],
  // Safety and monitoring
  safety: ['battery', 'motion', 'door', 'window'],
  // Additional common device classes
  additional: [
    'energy',
    'power',
    'current',
    'voltage',
    'gas',
    'sound_pressure',
    'distance',
    'speed',
    'weight',
    'volume',
  ],
} as const;

// Flattened list of all device classes
export const ALL_DEVICE_CLASSES = Object.values(HOME_ASSISTANT_DEVICE_CLASSES).flat();

// Default device classes for grow operations
export const DEFAULT_GROW_DEVICE_CLASSES = [
  ...HOME_ASSISTANT_DEVICE_CLASSES.environmental,
  ...HOME_ASSISTANT_DEVICE_CLASSES.control,
  ...HOME_ASSISTANT_DEVICE_CLASSES.safety,
];

// Default domains for IoT filtering
export const DEFAULT_IOT_DOMAINS = ['switch', 'automation', 'sensor', 'number'];

// Filter preferences interfaces
export interface IoTFilterPreferences {
  domains: string[];
  showAllDomains: boolean;
  deviceClasses: string[];
  showAllDeviceClasses: boolean;
}

export interface FilterState {
  showFilters: boolean;
  showDeviceClassFilters: boolean;
  searchQuery: string;
  filterEnabled: boolean;
  filterPreferences: IoTFilterPreferences;
}

// Filter action handlers
export interface FilterHandlers {
  onSearchQueryChange: (query: string) => void;
  onFilterEnabledChange: (enabled: boolean) => void;
  onToggleShowFilters: () => void;
  onToggleShowDeviceClassFilters: () => void;
  onToggleDomainFilter: (domain: string) => void;
  onToggleDeviceClassFilter: (deviceClass: string) => void;
  onToggleShowAllDeviceClasses: () => void;
}

// Connection handlers
export interface ConnectionHandlers {
  onToggleApiKeyVisibility: () => void;
  onToggleGatewayStatus: () => void;
  onTestConnection: () => void;
}

// Control handlers
export interface ControlHandlers {
  onHandleToggle: (entityId: string, domain: string, currentState: string) => void;
  onHandleNumberChange: (entityId: string, value: string) => void;
  onAdjustNumberValue: (entityId: string, increment: boolean, currentValue: string) => void;
  onSaveNumberValue: (entityId: string, pendingValue: string) => void;
  onHandleEntityToggle: (
    entityId: string,
    entityType: string,
    friendlyName: string,
    enabled: boolean
  ) => void;
}
