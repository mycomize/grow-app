import { useEffect, useRef, useState } from 'react';
import { useAuthToken } from '../stores/authEncryptionStore';
import { sseService, SSEEventHandler, SSEConnectionHandler } from '../services/SSEService';
import { PaymentSSEEvent, SSEConnectionState } from '../types/paymentTypes';

/**
 * React hook for managing payment SSE connections
 * Handles connection lifecycle and provides payment event updates
 */
export function usePaymentSSE() {
  const token = useAuthToken();
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
  });
  const [lastPaymentEvent, setLastPaymentEvent] = useState<PaymentSSEEvent | null>(null);
  const eventHandlerRef = useRef<SSEEventHandler | null>(null);
  const connectionHandlerRef = useRef<SSEConnectionHandler | null>(null);
  const isConnectedRef = useRef(false);

  // Connect to SSE when token is available
  useEffect(() => {
    if (token && !isConnectedRef.current) {
      console.log('[usePaymentSSE] Connecting with token...');
      connect();
    } else if (!token && isConnectedRef.current) {
      console.log('[usePaymentSSE] Token lost, disconnecting...');
      disconnect();
    }

    return () => {
      if (isConnectedRef.current) {
        disconnect();
      }
    };
  }, [token]);

  // Setup event handlers
  useEffect(() => {
    // Payment event handler
    eventHandlerRef.current = (event: PaymentSSEEvent) => {
      console.log('[usePaymentSSE] Payment event received:', event);
      setLastPaymentEvent(event);
    };

    // Connection state handler
    connectionHandlerRef.current = (state: SSEConnectionState) => {
      console.log('[usePaymentSSE] Connection state changed:', state);
      setConnectionState(state);
      isConnectedRef.current = state.isConnected;
    };

    // Register handlers with SSE service
    if (eventHandlerRef.current) {
      sseService.addEventListener(eventHandlerRef.current);
    }
    if (connectionHandlerRef.current) {
      sseService.addConnectionListener(connectionHandlerRef.current);
    }

    return () => {
      // Cleanup handlers
      if (eventHandlerRef.current) {
        sseService.removeEventListener(eventHandlerRef.current);
      }
      if (connectionHandlerRef.current) {
        sseService.removeConnectionListener(connectionHandlerRef.current);
      }
    };
  }, []);

  const connect = async () => {
    if (!token) {
      console.warn('[usePaymentSSE] No token available for connection');
      return;
    }

    try {
      await sseService.connect(token);
    } catch (error) {
      console.error('[usePaymentSSE] Connection failed:', error);
    }
  };

  const disconnect = () => {
    try {
      sseService.disconnect();
      isConnectedRef.current = false;
    } catch (error) {
      console.error('[usePaymentSSE] Disconnect failed:', error);
    }
  };

  const reconnect = async () => {
    console.log('[usePaymentSSE] Manual reconnect requested');
    disconnect();
    
    // Small delay to ensure cleanup
    setTimeout(() => {
      connect();
    }, 500);
  };

  return {
    // Connection state
    connectionState,
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    connectionError: connectionState.error,
    
    // Payment events
    lastPaymentEvent,
    
    // Connection controls
    connect,
    disconnect,
    reconnect,
    
    // Helper functions
    isPaymentStatusEvent: (event: PaymentSSEEvent | null): event is PaymentSSEEvent => {
      return event !== null && event.event_type === 'payment_status';
    },
    
    clearLastEvent: () => {
      setLastPaymentEvent(null);
    }
  };
}

/**
 * Hook for listening to specific payment status updates
 * @param onPaymentStatus - Callback for payment status events
 * @param options - Configuration options
 */
export function usePaymentStatusListener(
  onPaymentStatus: (event: PaymentSSEEvent) => void,
  options: {
    enabled?: boolean;
    paymentIntentId?: string;
  } = {}
) {
  const { enabled = true, paymentIntentId } = options;
  const { lastPaymentEvent, isConnected } = usePaymentSSE();
  const lastProcessedEventRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !lastPaymentEvent || !isConnected) {
      return;
    }

    // Generate unique event ID for deduplication
    const eventId = `${lastPaymentEvent.payment_intent_id}-${lastPaymentEvent.timestamp}`;
    
    // Skip if we already processed this event
    if (lastProcessedEventRef.current === eventId) {
      return;
    }

    // Filter by payment intent ID if specified
    if (paymentIntentId && lastPaymentEvent.payment_intent_id !== paymentIntentId) {
      return;
    }

    try {
      lastProcessedEventRef.current = eventId;
      onPaymentStatus(lastPaymentEvent);
    } catch (error) {
      console.error('[usePaymentStatusListener] Error in payment status callback:', error);
    }
  }, [lastPaymentEvent, enabled, paymentIntentId, onPaymentStatus, isConnected]);

  return {
    isConnected,
    lastEvent: lastPaymentEvent,
  };
}
