export interface IoTGateway {
  id: number;
  name: string;
  type: string;
  description?: string;
  api_url: string;
  api_key: string;
  iot_entities_count?: number;
  linked_entities_count?: number | string; // Can be number (parsed) or string (encrypted from API)
  linkable_entities_count?: number | string; // Can be number (parsed) or string (encrypted from API)
}

export interface IoTGatewayCreate {
  name: string;
  type: string;
  description?: string;
  api_url: string;
  api_key: string;
}

export interface IoTGatewayUpdate {
  name?: string;
  type?: string;
  description?: string;
  api_url?: string;
  api_key?: string;
  linked_entities_count?: string;
  linkable_entities_count?: string;
}

export const gatewayTypes = {
  HASS: 'home_assistant',
} as const;

export const gatewayTypeLabels = {
  home_assistant: 'Home Assistant',
} as const;

// Home Assistant WebSocket API types
export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HAService {
  domain: string;
  services: Record<
    string,
    {
      name: string;
      description: string;
      fields: Record<string, any>;
    }
  >;
}

export interface HAWebSocketMessage {
  id?: number;
  type: string;
  [key: string]: any;
}

export interface HAWebSocketAuth {
  type: 'auth';
  access_token: string;
}

export interface HAWebSocketCommand {
  id: number;
  type: string;
  [key: string]: any;
}

// IoT Entity management types
export interface IoTEntity {
  id: number; // backend generated id
  gateway_id: number; // id that originates from backend
  entity_name: string; // Home Assistant entity identifier (encrypted) equal to HAEntity.entity_id
  entity_type: string; // indicates home assistant for home assistant entities
  friendly_name?: string;
  domain: string; // Extracted from entity_id (before first '.') (encrypted)
  device_class: string; // From HA attributes.device_class or empty string (encrypted)
  // Assignment fields for grow/stage association
  linked_grow_id?: number;
  linked_stage?: string;
}

export interface IoTEntityCreate {
  gateway_id: number;
  entity_name: string; // Home Assistant entity identifier (encrypted)
  entity_type: string;
  friendly_name?: string;
  domain: string;
  device_class: string;
}

export interface IoTEntityUpdate {
  friendly_name?: string;
  linked_grow_id?: number;
  linked_stage?: string;
}
