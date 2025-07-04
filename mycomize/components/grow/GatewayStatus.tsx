import React, { useState, useEffect, useContext } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { IoTEntity } from '~/lib/iot';
import { ConnectionStatusBadge, ConnectionStatus } from '~/components/ui/connection-status-badge';
import { CountBadge } from '~/components/ui/count-badge';

interface Gateway {
  id: number;
  name: string;
  api_url: string;
  api_key?: string;
  is_active: boolean;
}

interface GatewayStatusProps {
  gateway: Gateway;
}

export const GatewayStatus: React.FC<GatewayStatusProps> = ({ gateway }) => {
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const [connectionStatus, setConnectionStatus] = useState<
    'unknown' | 'connecting' | 'connected' | 'disconnected'
  >('unknown');
  const [fullGateway, setFullGateway] = useState<Gateway | null>(null);
  const [enabledStates, setEnabledStates] = useState<Set<string>>(new Set());

  // Fetch full gateway details including api_key
  const fetchGatewayDetails = async () => {
    try {
      const url = getBackendUrl();
      const response = await fetch(`${url}/iot-gateways/${gateway.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const gatewayData = await response.json();
        setFullGateway(gatewayData);

        try {
          const url = getBackendUrl();
          const response = await fetch(`${url}/iot-gateways/${gateway.id}/entities`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const entities: IoTEntity[] = await response.json();
            setEnabledStates(new Set(entities.filter((e) => e.is_enabled).map((e) => e.entity_id)));
          }
        } catch (err) {
          console.error('Failed to fetch enabled entities:', err);
        }

        return gatewayData;
      }
    } catch (error) {
      console.error('Failed to fetch gateway details:', error);
    }
    return null;
  };

  // Check connection to Home Assistant
  const checkConnection = async () => {
    if (!gateway.is_active) {
      setConnectionStatus('disconnected');
      return;
    }

    // Get full gateway details if we don't have them
    const gatewayToUse = fullGateway || (await fetchGatewayDetails());

    if (!gatewayToUse || !gatewayToUse.api_key) {
      // If we can't get the api_key, fall back to using is_active status
      setConnectionStatus(gateway.is_active ? 'connected' : 'disconnected');
      return;
    }

    setConnectionStatus('connecting');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${gatewayToUse.api_url}/api/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gatewayToUse.api_key}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      setConnectionStatus('disconnected');
    }
  };

  // Check connection on mount and set up periodic checking
  useEffect(() => {
    if (gateway.is_active) {
      checkConnection();
      // Check connection every 5 minutes seconds
      const interval = setInterval(checkConnection, 60000 * 5);
      return () => clearInterval(interval);
    } else {
      setConnectionStatus('disconnected');
    }
  }, [gateway.is_active, gateway.api_url, token]);

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        router.push({
          pathname: `/iot/[id]`,
          params: { id: gateway.id },
        });
      }}
      className="rounded-lg">
      <VStack space="xs" className="rounded-lg border border-background-200 bg-background-0 p-3">
        <HStack className="items-center justify-between">
          <Text className="text-base font-medium">{gateway.name}</Text>
          <ConnectionStatusBadge status={connectionStatus as ConnectionStatus} />
        </HStack>
        <Text className="text-sm text-typography-500" numberOfLines={1}>
          {gateway.api_url}
        </Text>
        <HStack className="items-center">
          <CountBadge count={enabledStates.size} label="ENTITIES" variant="green-dark" />
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: `/iot/[id]`,
                params: { id: gateway.id },
              });
            }}
            className="ml-auto min-w-10">
            <Icon as={ChevronRight} size="lg" className="ml-auto mt-3" />
          </Pressable>
        </HStack>
      </VStack>
    </Pressable>
  );
};
