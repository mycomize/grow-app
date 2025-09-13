import EventSource from 'react-native-sse';
import { getBackendUrl } from '../api/backendUrl';
import { PaymentSSEEvent, SSEConnectionState } from '../types/paymentTypes';

export type SSEEventHandler = (event: PaymentSSEEvent) => void;
export type SSEConnectionHandler = (state: SSEConnectionState) => void;

/**
 * Service for managing Server-Sent Event connections for payment updates
 * Uses react-native-sse for cross-platform compatibility
 */
class SSEService {
  private eventSource: EventSource | null = null;
  private connectionState: SSEConnectionState = {
    isConnected: false,
    isConnecting: false,
  };
  private eventHandlers: Set<SSEEventHandler> = new Set();
  private connectionHandlers: Set<SSEConnectionHandler> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private baseReconnectDelay = 1000; // Start with 1 second
  private storedToken: string | null = null;

  /**
   * Connect to SSE endpoint for payment status updates
   */
  async connect(token: string): Promise<void> {
    if (this.eventSource) {
      console.warn('[SSEService] Already connected or connecting');
      return;
    }

    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      const error = 'Backend URL not available for this platform';
      console.error('[SSEService]', error);
      this.updateConnectionState({ 
        isConnected: false, 
        isConnecting: false, 
        error 
      });
      return;
    }

    // Store token for reconnection attempts
    this.storedToken = token;
    
    const sseUrl = `${backendUrl}/sse/payment-status?token=${encodeURIComponent(token)}`;
    console.log('[SSEService] Connecting to SSE endpoint:', sseUrl.replace(/token=[^&]+/, 'token=***'));

    this.updateConnectionState({ 
      isConnected: false, 
      isConnecting: true, 
      error: undefined 
    });

    try {
      this.eventSource = new EventSource(sseUrl, {
        withCredentials: false,
        pollingInterval: 0, // Disable polling, use pure SSE
      });

      this.setupEventListeners();
      
    } catch (error: any) {
      console.error('[SSEService] Failed to create EventSource:', error);
      this.updateConnectionState({ 
        isConnected: false, 
        isConnecting: false, 
        error: error.message || 'Failed to connect to payment updates' 
      });
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    console.log('[SSEService] Disconnecting from SSE');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.reconnectAttempts = 0;
    this.storedToken = null;
    this.updateConnectionState({ 
      isConnected: false, 
      isConnecting: false, 
      error: undefined 
    });
  }

  /**
   * Add event handler for payment status updates
   */
  addEventListener(handler: SSEEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Remove event handler
   */
  removeEventListener(handler: SSEEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * Add connection state handler
   */
  addConnectionListener(handler: SSEConnectionHandler): void {
    this.connectionHandlers.add(handler);
    // Immediately call with current state
    handler(this.connectionState);
  }

  /**
   * Remove connection state handler
   */
  removeConnectionListener(handler: SSEConnectionHandler): void {
    this.connectionHandlers.delete(handler);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): SSEConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.addEventListener('open', () => {
      console.log('[SSEService] Connection opened');
      this.reconnectAttempts = 0;
      this.updateConnectionState({ 
        isConnected: true, 
        isConnecting: false, 
        error: undefined 
      });
    });

    this.eventSource.addEventListener('error', (event: any) => {
      console.error('[SSEService] Connection error:', event);
      this.handleConnectionError(event);
    });

    this.eventSource.addEventListener('message', (event: any) => {
      try {
        
        // Check if this is a raw SSE format message that includes event type
        if (typeof event.data === 'string' && event.data.includes('event:')) {
          this.parseSSEMessage(event.data);
          return;
        }
        
        // Handle regular JSON messages
        if (event.data && event.data.trim().startsWith('{')) {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } else {
          console.log('[SSEService] Received unrecognized message format:', event.data);
        }
      } catch (error) {
        console.error('[SSEService] Message parsing error:', error, event.data);
      }
    });
  }

  private parseSSEMessage(rawMessage: string): void {
    try {
      // Parse the SSE format: "event: payment_status\ndata: {...}"
      const lines = rawMessage.split('\n').filter(line => line.trim());
      let eventType = '';
      let eventData = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('event:')) {
          eventType = trimmedLine.substring(6).trim();
        } else if (trimmedLine.startsWith('data:')) {
          eventData = trimmedLine.substring(5).trim();
        }
      }
      
      if (eventType === 'payment_status' && eventData) {
        try {
          const parsedData: PaymentSSEEvent = JSON.parse(eventData);
          
          // Update connection state
          this.updateConnectionState({ 
            ...this.connectionState,
            lastEvent: parsedData 
          });
          
          // Notify all event handlers
          this.eventHandlers.forEach(handler => {
            try {
              handler(parsedData);
            } catch (error) {
              console.error('[SSEService] Error in payment event handler:', error);
            }
          });
          
        } catch (parseError) {
          console.error('[SSEService] Failed to parse payment status data:', parseError, eventData);
        }
      } else if (eventType === 'connected') {
      } else if (eventType === 'ping') {
      } else {
      }
      
    } catch (error) {
      console.error('[SSEService] Error parsing raw SSE message:', error, rawMessage);
    }
  }

  private handleMessage(data: any): void {
    // Handle generic messages if needed
  }

  private handleConnectionError(event: any): void {
    console.error('[SSEService] Connection error occurred:', event);
    
    this.updateConnectionState({ 
      isConnected: false, 
      isConnecting: false, 
      error: 'Connection lost. Attempting to reconnect...' 
    });

    // Clean up current connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Attempt reconnection with exponential backoff
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSEService] Max reconnection attempts reached');
      this.updateConnectionState({ 
        ...this.connectionState,
        error: 'Failed to reconnect. Please refresh the connection.' 
      });
      return;
    }

    if (!this.storedToken) {
      console.error('[SSEService] No stored token for reconnection');
      this.updateConnectionState({ 
        ...this.connectionState,
        error: 'Reconnection failed. Please refresh the connection.' 
      });
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`[SSEService] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(async () => {
      if (this.reconnectTimeout && this.storedToken) {
        console.log('[SSEService] Attempting reconnect...');
        this.updateConnectionState({ 
          ...this.connectionState,
          isConnecting: true 
        });
        
        try {
          await this.connect(this.storedToken);
        } catch (error) {
          console.error('[SSEService] Reconnection failed:', error);
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  private updateConnectionState(newState: Partial<SSEConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...newState };
    
    // Notify all connection handlers
    this.connectionHandlers.forEach(handler => {
      try {
        handler(this.connectionState);
      } catch (error) {
        console.error('[SSEService] Error in connection handler:', error);
      }
    });
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    this.disconnect();
    this.eventHandlers.clear();
    this.connectionHandlers.clear();
  }
}

// Export singleton instance
export const sseService = new SSEService();

// Export class for testing/advanced usage
export { SSEService };
