export interface IoTGateway {
  id: number;
  name: string;
  type: string;
  description?: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  created_at: Date;
  grow_id?: number;
}

export interface IoTGatewayCreate {
  name: string;
  type: string;
  description?: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
}

export interface IoTGatewayUpdate {
  name?: string;
  type?: string;
  description?: string;
  api_url?: string;
  api_key?: string;
  is_active?: boolean;
}

export const gatewayTypes = {
  HASS: 'home_assistant',
} as const;

export const gatewayTypeLabels = {
  home_assistant: 'Home Assistant',
} as const;

// Home Assistant WebSocket API types
export interface HAState {
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
