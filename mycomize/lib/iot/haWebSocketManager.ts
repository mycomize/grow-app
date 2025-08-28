import { HAEntity } from './iot';
import { HAEntityState } from '../stores/iot/entity/types';
import EntityStateUpdateManager from './entityStateUpdateManager';

// Home Assistant WebSocket message types
interface HAWebSocketMessage {
  id?: number;
  type: string;
  [key: string]: any;
}

interface HAStateChangedEvent {
  event_type: 'state_changed';
  data: {
    entity_id: string;
    old_state: HAEntity | null;
    new_state: HAEntity | null;
  };
  origin: string;
  time_fired: string;
}

interface HAAuthMessage {
  type: 'auth_required' | 'auth_ok' | 'auth_invalid';
  ha_version?: string;
}

// Gateway connection info
interface GatewayConnection {
  gatewayId: number;
  apiUrl: string;
  apiKey: string;
  websocket?: WebSocket;
  connected: boolean;
  reconnectAttempts: number;
  subscriptionId?: number;
}

// Event listener callback type
type EntityEventListener = (
  gatewayId: number,
  eventType: 'added' | 'removed',
  entity: HAEntity
) => void;

// State change listener callback type
type StateChangeListener = (
  gatewayId: number,
  entityId: string,
  newState: HAEntityState
) => void;

class HAWebSocketManager {
  private connections: Map<string, GatewayConnection> = new Map();
  private eventListeners: Set<EntityEventListener> = new Set();
  private stateChangeListeners: Set<StateChangeListener> = new Set();
  private messageId: number = 1;
  private reconnectDelays = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff

  constructor() {
    console.log('[HAWebSocketManager] WebSocket manager initialized');
    
    // Register EntityStateUpdateManager as a state change listener
    this.addStateChangeListener((gatewayId, entityId, newState) => {
      EntityStateUpdateManager.handleStateChange(gatewayId, entityId, newState);
    });
  }

  // Add event listener for entity changes
  addListener(listener: EntityEventListener) {
    this.eventListeners.add(listener);
    console.log(
      `[HAWebSocketManager] Event listener added. Total listeners: ${this.eventListeners.size}`
    );
  }

  // Remove event listener
  removeListener(listener: EntityEventListener) {
    this.eventListeners.delete(listener);
    console.log(
      `[HAWebSocketManager] Event listener removed. Total listeners: ${this.eventListeners.size}`
    );
  }

  // Add state change listener for real-time updates
  addStateChangeListener(listener: StateChangeListener) {
    this.stateChangeListeners.add(listener);
    console.log(
      `[HAWebSocketManager] State change listener added. Total listeners: ${this.stateChangeListeners.size}`
    );
  }

  // Remove state change listener
  removeStateChangeListener(listener: StateChangeListener) {
    this.stateChangeListeners.delete(listener);
    console.log(
      `[HAWebSocketManager] State change listener removed. Total listeners: ${this.stateChangeListeners.size}`
    );
  }

  // Subscribe to state changes for specific entities (ensures one listener per entity)
  subscribeToEntityStates(gatewayId: number, entityIds: string[]) {
    console.log(`[HAWebSocketManager] Subscribing to state changes for ${entityIds.length} entities on gateway ${gatewayId}`);
    
    let newRegistrations = 0;
    let alreadyRegistered = 0;
    
    for (const entityId of entityIds) {
      if (EntityStateUpdateManager.registerEntityForUpdates(entityId, gatewayId)) {
        newRegistrations++;
      } else {
        alreadyRegistered++;
      }
    }
    
    console.log(`[HAWebSocketManager] Gateway ${gatewayId} subscription results: ${newRegistrations} new, ${alreadyRegistered} already registered`);
  }

  // Unsubscribe from state changes for specific entities
  unsubscribeFromEntityStates(gatewayId: number, entityIds: string[]) {
    console.log(`[HAWebSocketManager] Unsubscribing from state changes for ${entityIds.length} entities on gateway ${gatewayId}`);
    
    let unregistered = 0;
    let notRegistered = 0;
    
    for (const entityId of entityIds) {
      if (EntityStateUpdateManager.unregisterEntityFromUpdates(entityId, gatewayId)) {
        unregistered++;
      } else {
        notRegistered++;
      }
    }
    
    console.log(`[HAWebSocketManager] Gateway ${gatewayId} unsubscription results: ${unregistered} unregistered, ${notRegistered} not registered`);
  }

  // Bulk subscription method using the EntityStateUpdateManager's bulk operation
  bulkSubscribeToEntityStates(gatewayId: number, entityIds: string[]) {
    console.log(`[HAWebSocketManager] Bulk subscribing to state changes for ${entityIds.length} entities on gateway ${gatewayId}`);
    
    const results = EntityStateUpdateManager.registerMultipleEntitiesForUpdates(entityIds, gatewayId);
    console.log(`[HAWebSocketManager] Bulk subscription results for gateway ${gatewayId}: ${results.registered} new, ${results.alreadyRegistered} already registered`);
    
    return results;
  }

  // Connect to a Home Assistant instance
  async connectToGateway(gatewayId: number, apiUrl: string, apiKey: string): Promise<boolean> {
    const connectionKey = `${gatewayId}`;
    const existing = this.connections.get(connectionKey);

    // Check if we already have a working connection with same credentials
    if (
      existing &&
      existing.connected &&
      existing.apiUrl === apiUrl &&
      existing.apiKey === apiKey
    ) {
      //console.log(
      //  `[HAWebSocketManager] Gateway ${gatewayId} already connected with same credentials`
      //);
      return true;
    }

    // Disconnect existing connection if credentials changed
    if (existing) {
      console.log(
        `[HAWebSocketManager] Disconnecting existing connection for gateway ${gatewayId} (credentials changed)`
      );
      this.disconnectGateway(gatewayId);
    }

    // Create new connection
    const connection: GatewayConnection = {
      gatewayId,
      apiUrl,
      apiKey,
      connected: false,
      reconnectAttempts: 0,
    };

    this.connections.set(connectionKey, connection);

    return this.establishConnection(connection);
  }

  // Disconnect from a Home Assistant instance
  disconnectGateway(gatewayId: number) {
    const connectionKey = `${gatewayId}`;
    const connection = this.connections.get(connectionKey);

    if (connection?.websocket) {
      console.log(`[HAWebSocketManager] Disconnecting gateway ${gatewayId}`);
      connection.websocket.close();
      connection.connected = false;
    }

    this.connections.delete(connectionKey);
  }

  // Check if gateway is connected
  isGatewayConnected(gatewayId: number): boolean {
    const connection = this.connections.get(`${gatewayId}`);
    return connection?.connected ?? false;
  }

  // Get connection status for all gateways
  getConnectionStatus(): { [gatewayId: number]: boolean } {
    const status: { [gatewayId: number]: boolean } = {};

    for (const [, connection] of this.connections) {
      status[connection.gatewayId] = connection.connected;
    }

    return status;
  }

  // Establish WebSocket connection
  private async establishConnection(connection: GatewayConnection): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Convert HTTP URL to WebSocket URL
        const wsUrl = connection.apiUrl.replace(/^http/, 'ws') + '/api/websocket';
        console.log(
          `[HAWebSocketManager] Connecting to ${wsUrl} for gateway ${connection.gatewayId}`
        );

        const ws = new WebSocket(wsUrl);
        connection.websocket = ws;

        // Connection timeout
        const timeout = setTimeout(() => {
          console.log(
            `[HAWebSocketManager] Connection timeout for gateway ${connection.gatewayId}`
          );
          ws.close();
          resolve(false);
        }, 10000);

        ws.onopen = () => {
          console.log(
            `[HAWebSocketManager] WebSocket connection opened for gateway ${connection.gatewayId}`
          );
          clearTimeout(timeout);
        };

        ws.onmessage = async (event) => {
          try {
            const message: HAWebSocketMessage = JSON.parse(event.data);
            //console.log(
            //  `[HAWebSocketManager] Gateway ${connection.gatewayId} received:`,
            //  message.type
            //);

            if (message.type === 'auth_required') {
              // Send authentication
              const authMessage = {
                type: 'auth',
                access_token: connection.apiKey,
              };
              ws.send(JSON.stringify(authMessage));
              console.log(`[HAWebSocketManager] Gateway ${connection.gatewayId} sent auth message`);
            } else if (message.type === 'auth_ok') {
              console.log(
                `[HAWebSocketManager] Gateway ${connection.gatewayId} authenticated successfully`
              );
              connection.connected = true;
              connection.reconnectAttempts = 0;

              // Subscribe to state_changed events
              await this.subscribeToStateChanges(connection);
              resolve(true);
            } else if (message.type === 'auth_invalid') {
              console.error(
                `[HAWebSocketManager] Gateway ${connection.gatewayId} authentication failed`
              );
              connection.connected = false;
              ws.close();
              resolve(false);
            } else if (message.type === 'event' && message.event) {
              this.handleStateChangeEvent(connection, message.event as HAStateChangedEvent);
            }
          } catch (error) {
            console.error(
              `[HAWebSocketManager] Gateway ${connection.gatewayId} message parsing error:`,
              error
            );
          }
        };

        ws.onerror = (error) => {
          console.error(
            `[HAWebSocketManager] Gateway ${connection.gatewayId} WebSocket error:`,
            error
          );
          clearTimeout(timeout);
          connection.connected = false;
          resolve(false);
        };

        ws.onclose = (event) => {
          console.log(
            `[HAWebSocketManager] Gateway ${connection.gatewayId} WebSocket closed:`,
            event.code,
            event.reason
          );
          clearTimeout(timeout);
          connection.connected = false;

          // Schedule reconnection if not intentionally closed
          if (event.code !== 1000 && connection.reconnectAttempts < this.reconnectDelays.length) {
            this.scheduleReconnect(connection);
          }
        };
      } catch (error) {
        console.error(
          `[HAWebSocketManager] Gateway ${connection.gatewayId} connection error:`,
          error
        );
        resolve(false);
      }
    });
  }

  // Subscribe to state_changed events
  private async subscribeToStateChanges(connection: GatewayConnection) {
    if (!connection.websocket) return;

    const subscribeMessage = {
      id: this.messageId++,
      type: 'subscribe_events',
      event_type: 'state_changed',
    };

    connection.subscriptionId = subscribeMessage.id;
    connection.websocket.send(JSON.stringify(subscribeMessage));
    console.log(
      `[HAWebSocketManager] Gateway ${connection.gatewayId} subscribed to state_changed events with ID ${subscribeMessage.id}`
    );
  }

  // Handle state change events
  private handleStateChangeEvent(connection: GatewayConnection, event: HAStateChangedEvent) {
    const { entity_id, old_state, new_state } = event.data;

    // Log all events for debugging
    //console.log(
    //  `[HAWebSocketManager] Gateway ${connection.gatewayId} state_changed: ${entity_id}`,
    //  {
    //    old_state: old_state ? 'exists' : 'null',
    //    new_state: new_state ? 'exists' : 'null',
    //  }
    //);

    // Detect entity addition: old_state is null, new_state exists
    if (!old_state && new_state) {
      console.log(
        `[HAWebSocketManager] Gateway ${connection.gatewayId} entity ADDED: ${entity_id}`
      );
      this.notifyListeners(connection.gatewayId, 'added', new_state);
    }
    // Detect entity removal: old_state exists, new_state is null
    else if (old_state && !new_state) {
      console.log(
        `[HAWebSocketManager] Gateway ${connection.gatewayId} entity REMOVED: ${entity_id}`
      );
      this.notifyListeners(connection.gatewayId, 'removed', old_state);
    }
    // Regular state updates (not addition/removal) - now process these for real-time updates
    else if (old_state && new_state) {
      // Convert HAEntity to HAEntityState format
      const entityState: HAEntityState = {
        entity_id: new_state.entity_id,
        state: new_state.state,
        attributes: new_state.attributes,
        last_changed: new_state.last_changed,
        last_updated: new_state.last_updated,
      };

      // Notify state change listeners (including EntityStateUpdateManager)
      this.notifyStateChangeListeners(connection.gatewayId, entity_id, entityState);
    }
  }

  // Notify all state change listeners about entity state updates
  private notifyStateChangeListeners(gatewayId: number, entityId: string, newState: HAEntityState) {
    for (const listener of this.stateChangeListeners) {
      try {
        listener(gatewayId, entityId, newState);
      } catch (error) {
        console.error(`[HAWebSocketManager] Error in state change listener:`, error);
      }
    }
  }

  // Notify all listeners about entity changes
  private notifyListeners(gatewayId: number, eventType: 'added' | 'removed', entity: HAEntity) {
    console.log(
      `[HAWebSocketManager] Notifying ${this.eventListeners.size} listeners about ${eventType} entity: ${entity.entity_id}`
    );

    for (const listener of this.eventListeners) {
      try {
        listener(gatewayId, eventType, entity);
      } catch (error) {
        console.error(`[HAWebSocketManager] Error in event listener:`, error);
      }
    }
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(connection: GatewayConnection) {
    const delay =
      this.reconnectDelays[Math.min(connection.reconnectAttempts, this.reconnectDelays.length - 1)];
    connection.reconnectAttempts++;

    console.log(
      `[HAWebSocketManager] Gateway ${connection.gatewayId} scheduling reconnect in ${delay}ms (attempt ${connection.reconnectAttempts})`
    );

    setTimeout(async () => {
      if (!connection.connected) {
        console.log(`[HAWebSocketManager] Gateway ${connection.gatewayId} attempting reconnection`);
        await this.establishConnection(connection);
      }
    }, delay);
  }

  // Cleanup all connections
  cleanup() {
    console.log(`[HAWebSocketManager] Cleaning up ${this.connections.size} connections`);

    for (const [, connection] of this.connections) {
      if (connection.websocket) {
        connection.websocket.close();
      }
    }

    this.connections.clear();
    this.eventListeners.clear();
    this.stateChangeListeners.clear();
    EntityStateUpdateManager.clearAllTrackedEntities();
  }
}

// Singleton instance
export const haWebSocketManager = new HAWebSocketManager();
