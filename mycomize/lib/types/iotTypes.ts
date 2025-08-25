// Shared IoT-related types and interfaces

import { IoTEntity, IoTGateway } from '../iot/iot';

export const NEW_GATEWAY_ID = -1;
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

// Bulk entity operation results
export interface BulkCreateResult {
  created: IoTEntity[];
  idMapping: Record<string, number>; // entity_name -> db_id
}

// Entity operation tracking for optimistic updates
export interface EntityOperation {
  type: 'link' | 'unlink' | 'delete' | 'create';
  entityId: string;
  gatewayId: number;
  growId?: number;
  stage?: string;
}

// Stage IoT data interface - used across all stage components
export interface StageIoTData {
  entities: IoTEntity[];
  gateways: IoTGateway[];
  entityStates: Record<string, string>;
  loading: boolean;
  linkableEntities?: IoTEntity[];
  onRefreshData?: () => void;

  // Filter preferences and handlers
  filterPreferences: IoTFilterPreferences;
  showDomainFilters: boolean;
  showDeviceClassFilters: boolean;
  onToggleShowDomainFilters: () => void;
  onToggleShowDeviceClassFilters: () => void;
  onToggleDomainFilter: (domain: string) => void;
  onToggleDeviceClassFilter: (deviceClass: string) => void;
}
