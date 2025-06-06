import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { Badge } from '~/components/ui/badge';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import {
  Search,
  Wifi,
  WifiOff,
  Link,
  Unlink,
  CheckCircle,
  AlertCircle,
  Home,
  X,
  Settings,
} from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { IoTGateway, gatewayTypeLabels } from '~/lib/iot';

interface IoTGatewaySectionProps {
  growId?: number;
  onGatewayLinked?: (gatewayId: number) => void;
  onGatewayUnlinked?: () => void;
}

export const IoTGatewaySection: React.FC<IoTGatewaySectionProps> = ({
  growId,
  onGatewayLinked,
  onGatewayUnlinked,
}) => {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [gateways, setGateways] = useState<IoTGateway[]>([]);
  const [filteredGateways, setFilteredGateways] = useState<IoTGateway[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch available gateways
  const fetchGateways = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBackendUrl()}/iot-gateways/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const router = useRouter();
          router.replace('/login');
          return;
        }
        throw new Error('Failed to fetch IoT gateways');
      }

      const data: IoTGateway[] = await response.json();
      const formattedGateways = data.map((gateway) => ({
        ...gateway,
        created_at: new Date(gateway.created_at),
      }));

      setGateways(formattedGateways);
      setFilteredGateways(formattedGateways);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gateways');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter gateways based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredGateways(gateways);
    } else {
      const filtered = gateways.filter(
        (gateway) =>
          gateway.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          gateway.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          gateway.api_url.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGateways(filtered);
    }
  }, [searchQuery, gateways]);

  // Link gateway to grow
  const linkGateway = async (gatewayId: number) => {
    if (!growId) return;

    setIsLinking(gatewayId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${getBackendUrl()}/iot-gateways/${gatewayId}/link/${growId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const router = useRouter();
          router.replace('/login');
          return;
        }

        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to link gateway');
      }

      setSuccess('Gateway linked successfully!');
      onGatewayLinked?.(gatewayId);

      // Refresh gateways to show updated state
      await fetchGateways();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link gateway');
    } finally {
      setIsLinking(null);
    }
  };

  // Unlink gateway from grow
  const unlinkGateway = async (gatewayId: number) => {
    setIsLinking(gatewayId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${getBackendUrl()}/iot-gateways/${gatewayId}/unlink`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const router = useRouter();
          router.replace('/login');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to unlink gateway');
      }

      setSuccess('Gateway unlinked successfully!');
      onGatewayUnlinked?.();

      // Refresh gateways to show updated state
      fetchGateways();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink gateway');
    } finally {
      setIsLinking(null);
    }
  };

  // Navigate to IoT gateway detail/edit screen
  const navigateToGateway = (gatewayId: number) => {
    router.push(`/iot/${gatewayId}`);
  };

  // Get linked gateways from the main gateways list
  const linkedGateways = gateways.filter((gateway) => gateway.grow_id === growId);

  // Load gateways on mount
  useEffect(() => {
    fetchGateways();
  }, [growId]);

  // Clear messages after delay
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Get the currently linked gateways
  const hasLinkedGateways = linkedGateways.length > 0;

  return (
    <VStack className="bg-background-0">
      {/* Status Messages */}
      {error && (
        <HStack className="mb-2 items-center rounded-md bg-error-50 p-3">
          <Icon as={AlertCircle} className="mr-2 text-error-600" />
          <Text className="text-error-700">{error}</Text>
        </HStack>
      )}

      {success && (
        <HStack className="mb-2 items-center rounded-md bg-success-50 p-3">
          <Icon as={CheckCircle} className="mr-2 text-success-600" />
          <Text className="text-success-700">{success}</Text>
        </HStack>
      )}

      {/* Current Linked Gateways Display */}
      {hasLinkedGateways && (
        <VStack>
          {linkedGateways.map((gateway) => (
            <Card key={gateway.id} className="bg-background-0">
              <HStack className="items-center">
                <VStack className="flex-1">
                  <Text className="text-lg font-semibold text-primary-700">{gateway.name}</Text>
                  <Text className="text-sm text-typography-500">
                    {gatewayTypeLabels[gateway.type as keyof typeof gatewayTypeLabels] ||
                      gateway.type}
                  </Text>
                </VStack>
                <HStack space="sm">
                  <Button variant="outline" size="sm" onPress={() => navigateToGateway(gateway.id)}>
                    <ButtonIcon as={Settings} />
                    <ButtonText>Configure</ButtonText>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-error-400"
                    onPress={() => unlinkGateway(gateway.id)}
                    isDisabled={isLinking === gateway.id}>
                    {isLinking === gateway.id ? (
                      <Spinner size="small" />
                    ) : (
                      <ButtonIcon as={Unlink} />
                    )}
                    <ButtonText>Unlink</ButtonText>
                  </Button>
                </HStack>
              </HStack>
            </Card>
          ))}
        </VStack>
      )}

      {/* Gateway Selection - Only show when no gateways are linked */}
      {!hasLinkedGateways && (
        <VStack space="md">
          <Text className="text-typography-600">
            Connect an IoT gateway to monitor and control the grow environment.
          </Text>

          {/* Search */}
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>Search Gateways</FormControlLabelText>
            </FormControlLabel>
            <Input className="mt-2">
              <InputField
                placeholder="Search by name, description, or URL..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <InputIcon as={Search} className="mr-2" />
            </Input>
          </FormControl>

          {/* Gateway List */}
          {isLoading ? (
            <VStack className="items-center py-8">
              <Spinner size="large" />
              <Text className="mt-2 text-typography-500">Loading gateways...</Text>
            </VStack>
          ) : filteredGateways.length === 0 ? (
            <VStack className="items-center py-4">
              <Text className="text-center text-typography-500">
                {gateways.length === 0
                  ? 'No IoT gateways available. Create one first in the IoT tab.'
                  : 'No gateways match your search.'}
              </Text>
            </VStack>
          ) : (
            <VStack space="sm">
              {filteredGateways.map((gateway) => {
                const isAlreadyLinked = gateway.grow_id && gateway.grow_id !== growId;
                const isCurrentlyLinking = isLinking === gateway.id;

                return (
                  <Card key={gateway.id} className="bg-background-0">
                    <VStack className="p-0" space="sm">
                      <HStack className="items-center justify-between">
                        <VStack className="flex-1">
                          <HStack className="items-center" space="sm">
                            <Text className="font-medium">{gateway.name}</Text>
                          </HStack>

                          <Text className="text-sm text-typography-500">
                            {gatewayTypeLabels[gateway.type as keyof typeof gatewayTypeLabels] ||
                              gateway.type}
                          </Text>

                          {gateway.description && (
                            <Text className="text-sm text-typography-600">
                              {gateway.description}
                            </Text>
                          )}
                        </VStack>

                        <Button
                          variant={isAlreadyLinked ? 'outline' : 'solid'}
                          action={isAlreadyLinked ? 'secondary' : 'positive'}
                          size="sm"
                          onPress={() => linkGateway(gateway.id)}
                          isDisabled={
                            isCurrentlyLinking || !gateway.is_active || !!isAlreadyLinked
                          }>
                          {isCurrentlyLinking ? (
                            <Spinner size="small" />
                          ) : (
                            <ButtonIcon as={Link} className={isAlreadyLinked ? '' : 'text-white'} />
                          )}
                          <ButtonText className={isAlreadyLinked ? '' : 'text-white'}>
                            {isAlreadyLinked ? 'In Use' : 'Link'}
                          </ButtonText>
                        </Button>
                      </HStack>

                      {!gateway.is_active && (
                        <HStack className="items-center">
                          <Icon as={AlertCircle} className="mr-2 text-orange-500" size="sm" />
                          <Text className="text-sm text-orange-600">
                            Gateway is disabled. Enable it in the IoT tab first.
                          </Text>
                        </HStack>
                      )}
                    </VStack>
                  </Card>
                );
              })}
            </VStack>
          )}
        </VStack>
      )}
    </VStack>
  );
};
