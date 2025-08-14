import { useState, useEffect, useContext, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { IoTGateway, IoTEntity } from '~/lib/iot';
import { ConnectionStatus } from '~/components/ui/connection-status-badge';
import { checkAllGatewayConnections } from './connectionUtils';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { AuthContext } from '~/lib/AuthContext';

interface UseGrowGatewaysResult {
  gateways: IoTGateway[];
  connectionStatuses: Record<number, ConnectionStatus>;
  connectionLatencies: Record<number, number>;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch gateway details and connection statuses for a grow's IoT entities
 */
export const useGrowGateways = (iotEntities: IoTEntity[]): UseGrowGatewaysResult => {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [gateways, setGateways] = useState<IoTGateway[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<number, ConnectionStatus>>(
    {}
  );
  const [connectionLatencies, setConnectionLatencies] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize gateway IDs to prevent infinite re-renders
  const gatewayIds = useMemo(() => {
    if (!iotEntities || iotEntities.length === 0) return [];
    return Array.from(new Set(iotEntities.map((entity) => entity.gateway_id)));
  }, [iotEntities]);

  useEffect(() => {
    const fetchGatewaysAndConnections = async () => {
      if (!token || gatewayIds.length === 0) {
        setGateways([]);
        setConnectionStatuses({});
        setConnectionLatencies({});
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all gateway details in parallel
        const gatewayPromises = gatewayIds.map(async (gatewayId) => {
          try {
            const gateway: IoTGateway = await apiClient.get(
              `/iot-gateways/${gatewayId}`,
              token,
              'IoTGateway',
              false
            );
            return {
              ...gateway,
              created_at: new Date(gateway.created_at),
            };
          } catch (err) {
            console.error(`Failed to fetch gateway ${gatewayId}:`, err);
            return null;
          }
        });

        const fetchedGateways = (await Promise.all(gatewayPromises)).filter(
          (gateway): gateway is IoTGateway => gateway !== null
        );

        setGateways(fetchedGateways);

        // Test connections for all fetched gateways
        if (fetchedGateways.length > 0) {
          const { connectionStatuses: statuses, connectionLatencies: latencies } =
            await checkAllGatewayConnections(fetchedGateways);

          setConnectionStatuses(statuses);
          setConnectionLatencies(latencies);
        }

        setLoading(false);
      } catch (err) {
        if (isUnauthorizedError(err as Error)) {
          router.replace('/login');
          return;
        }

        console.error('Error fetching gateways for grow:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch gateway data');
        setLoading(false);
      }
    };

    fetchGatewaysAndConnections();
  }, [token, gatewayIds, router]);

  return {
    gateways,
    connectionStatuses,
    connectionLatencies,
    loading,
    error,
  };
};
