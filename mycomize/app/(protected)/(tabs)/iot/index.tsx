import React, { useState, useContext, useCallback } from 'react';
import { Button, ButtonIcon } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { getBackendUrl } from '~/lib/backendUrl';
import { HStack } from '~/components/ui/hstack';
import { Icon } from '~/components/ui/icon';
import {
  PlusIcon,
  Home,
  Power,
  PowerOff,
  HouseWifi,
  PlugZap,
  Unplug,
  Wifi,
  WifiOff,
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  RadioTower,
} from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Badge, BadgeIcon, BadgeText } from '~/components/ui/badge';

import { AuthContext } from '~/lib/AuthContext';
import { IoTGateway, gatewayTypeLabels } from '~/lib/iot';

interface AddIntegrationButtonProps {
  title: string;
  initial?: boolean;
}

const AddIntegrationButton: React.FC<AddIntegrationButtonProps> = ({ title, initial = false }) => {
  const router = useRouter();

  return (
    <>
      <Button
        variant="solid"
        className={
          initial ? 'h-16 w-16 rounded-full' : 'absolute bottom-0 z-50 mb-4 h-12 w-11/12 rounded-md'
        }
        action="positive"
        onPress={() => {
          router.push('/iot/new');
        }}>
        <ButtonIcon as={PlusIcon} className="h-8 w-8 text-white" />
      </Button>
    </>
  );
};

interface IntegrationCardProps {
  gateway: IoTGateway;
  token: string | null | undefined;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ gateway, token }) => {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<
    'unknown' | 'connecting' | 'connected' | 'disconnected'
  >('unknown');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check connection to Home Assistant
  const checkConnection = async () => {
    if (!gateway.is_active) {
      setConnectionStatus('disconnected');
      return;
    }

    setIsRefreshing(true);
    setConnectionStatus('connecting');

    try {
      const response = await fetch(`${gateway.api_url}/api/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      setConnectionStatus('disconnected');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check connection on mount if gateway is active
  React.useEffect(() => {
    if (gateway.is_active) {
      checkConnection();
    } else {
      setConnectionStatus('disconnected');
    }
  }, [gateway.is_active]);

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <HStack className="items-center rounded-sm bg-success-50 px-3 py-1">
            <Icon as={PlugZap} className="mr-2 text-success-700" />
            <Text className="text-sm text-success-700">CONNECTED</Text>
          </HStack>
        );
      case 'disconnected':
        return (
          <HStack className="items-center rounded-sm bg-error-50 px-3 py-1">
            <Icon as={PowerOff} className="mr-2 text-error-700" />
            <Text className="text-sm text-error-700">DISCONNECTED</Text>
          </HStack>
        );
      case 'connecting':
        return (
          <HStack className="items-center rounded-sm bg-orange-900 px-3 py-1">
            <Icon as={RadioTower} className="mr-2 text-orange-200" />
            <Text className="text-sm text-orange-700">CONNECTING</Text>
          </HStack>
        );
      default:
        return (
          <HStack className="items-center rounded-sm bg-error-50 px-3 py-1">
            <Icon as={WifiOff} className="mr-2 text-error-700" />
            <Text className="text-sm text-error-700">UNKNOWN</Text>
          </HStack>
        );
    }
  };

  return (
    <>
      <Card className="w-11/12 rounded-xl bg-background-0">
        <VStack className="flex p-2">
          <Pressable
            onPress={() => {
              router.push({
                pathname: `/iot/[id]`,
                params: { id: gateway.id },
              });
            }}>
            <HStack className="mb-2 items-center">
              <VStack className="flex-1">
                <Heading size="lg">{gateway.name || 'Unnamed Integration'}</Heading>
                <Text size="sm" className="text-typography-500">
                  {gateway.type
                    ? gatewayTypeLabels[gateway.type as keyof typeof gatewayTypeLabels] ||
                      gateway.type
                    : 'Unknown Type'}
                </Text>
              </VStack>
              <HStack className="ml-auto items-center" space="xs">
                {getConnectionStatusBadge()}
              </HStack>
            </HStack>

            {gateway.description && (
              <Text className="mb-2 text-sm text-typography-600">{gateway.description}</Text>
            )}

            <HStack className="mb-1 mt-1">
              <Text className="text-base">API URL</Text>
              <Text className="ml-auto text-sm" numberOfLines={1} ellipsizeMode="middle">
                {gateway.api_url || 'No URL set'}
              </Text>
            </HStack>

            {gateway.grow_id && (
              <HStack className="mb-1 mt-1">
                <Text className="text-base">Grow ID</Text>
                <Text className="ml-auto">ID: {gateway.grow_id}</Text>
              </HStack>
            )}

            {!gateway.grow_id && (
              <HStack className="mb-1 mt-1">
                <Text className="text-base">Grow ID</Text>
                <Text className="ml-auto text-base">None</Text>
              </HStack>
            )}
          </Pressable>
        </VStack>
      </Card>
    </>
  );
};

export default function IoTScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [gateways, setGateways] = useState<IoTGateway[]>([]);

  // Define the fetch function
  const fetchData = useCallback(async () => {
    try {
      const url = getBackendUrl();
      // Reset gateways before fetching to avoid stale data
      setGateways([]);

      const response = await fetch(`${url}/iot-gateways/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
        } else {
          console.error('Failed to fetch IoT gateways:', response.statusText);
        }
        return;
      }

      const data: IoTGateway[] = await response.json();
      const formattedGateways = data.map((gateway) => ({
        ...gateway,
        created_at: new Date(gateway.created_at),
      }));

      setGateways(formattedGateways);
    } catch (error) {
      console.error('Exception fetching IoT gateways:', error);
    }
  }, [token, router]);

  // Use useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();

      // No cleanup needed for useFocusEffect in this case
      return () => {};
    }, [fetchData])
  );

  return gateways.length == 0 ? (
    <VStack className="flex-1 items-center justify-center gap-2 bg-background-50">
      <Text className="mb-4 text-center text-lg text-typography-600">
        Add your first Home Assistant integration!
      </Text>
      <AddIntegrationButton title="Add Integration" initial={true} />
    </VStack>
  ) : (
    <VStack className="flex-1 items-center gap-4 bg-background-50">
      <View className="mt-2" />
      {gateways.map((gateway, index) => (
        <IntegrationCard key={gateway.id} gateway={gateway} token={token} />
      ))}
      <AddIntegrationButton title="Add Integration" />
    </VStack>
  );
}
