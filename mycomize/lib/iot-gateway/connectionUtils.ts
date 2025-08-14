import { IoTGateway } from '~/lib/iot';
import { ConnectionStatus } from '~/components/ui/connection-status-badge';
import { InfoBadgeVariant } from '~/components/ui/info-badge';
import { Wifi, WifiOff, PowerOff, RadioTower } from 'lucide-react-native';

export interface ConnectionResult {
  status: ConnectionStatus;
  latency?: number;
}

/**
 * Test connection to a single IoT gateway
 */
export const checkGatewayConnection = async (gateway: IoTGateway): Promise<ConnectionResult> => {
  // Check if gateway has required credentials
  if (!gateway.api_key || !gateway.api_url) {
    return { status: 'disconnected' };
  }

  try {
    const startTime = Date.now();
    const response = await fetch(`${gateway.api_url}/api/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${gateway.api_key}`,
        'Content-Type': 'application/json',
      },
    });
    const endTime = Date.now();
    const latency = endTime - startTime;

    return {
      status: response.ok ? 'connected' : 'disconnected',
      latency: response.ok ? latency : undefined,
    };
  } catch (err) {
    return {
      status: 'disconnected',
      latency: undefined,
    };
  }
};

/**
 * Determine connection status without testing (based on credentials only)
 */
export const determineConnectionStatus = (gateway: IoTGateway): ConnectionStatus => {
  if (!gateway.api_key || !gateway.api_url) {
    return 'disconnected';
  }
  // If credentials exist, we need to test to know for sure
  return 'unknown';
};

/**
 * Get InfoBadge props for connection status - matches iot/index.tsx implementation
 */
export const getConnectionBadgeProps = (status: ConnectionStatus) => {
  switch (status) {
    case 'connected':
      return {
        text: 'CONNECTED',
        icon: Wifi,
        variant: 'success' as InfoBadgeVariant,
      };
    case 'connecting':
      return {
        text: 'CONNECTING',
        icon: RadioTower,
        variant: 'info' as InfoBadgeVariant,
      };
    case 'disconnected':
      return {
        text: 'DISCONNECTED',
        icon: PowerOff,
        variant: 'error' as InfoBadgeVariant,
      };
    default:
      return {
        text: 'UNKNOWN',
        icon: WifiOff,
        variant: 'error' as InfoBadgeVariant,
      };
  }
};

/**
 * Test connections for multiple gateways in parallel
 */
export const checkAllGatewayConnections = async (
  gateways: IoTGateway[]
): Promise<{
  connectionStatuses: Record<number, ConnectionStatus>;
  connectionLatencies: Record<number, number>;
}> => {
  const statusPromises = gateways.map(async (gateway) => {
    const result = await checkGatewayConnection(gateway);
    return {
      id: gateway.id,
      status: result.status,
      latency: result.latency,
    };
  });

  const results = await Promise.all(statusPromises);

  const connectionStatuses = results.reduce(
    (acc, result) => {
      acc[result.id] = result.status;
      return acc;
    },
    {} as Record<number, ConnectionStatus>
  );

  const connectionLatencies = results.reduce(
    (acc, result) => {
      if (result.latency !== undefined) {
        acc[result.id] = result.latency;
      }
      return acc;
    },
    {} as Record<number, number>
  );

  return { connectionStatuses, connectionLatencies };
};
