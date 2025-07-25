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
  Thermometer,
  Droplet,
  Activity,
  Gauge,
  Sun,
  Wind,
  Zap,
  ChevronRight,
} from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { IoTGateway, gatewayTypeLabels, IoTEntity, HAState } from '~/lib/iot';

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
  const [enabledSensors, setEnabledSensors] = useState<IoTEntity[]>([]);
  const [sensorStates, setSensorStates] = useState<HAState[]>([]);
  const [isLoadingSensors, setIsLoadingSensors] = useState(false);

  // Get icon based on device class
  const getSensorIcon = (deviceClass?: string) => {
    switch (deviceClass) {
      case 'temperature':
        return Thermometer;
      case 'humidity':
        return Droplet;
      case 'pressure':
        return Gauge;
      case 'illuminance':
        return Sun;
      case 'wind_speed':
        return Wind;
      case 'power':
      case 'energy':
        return Zap;
      default:
        return Activity;
    }
  };

  // Fetch enabled sensors for a gateway
  const fetchEnabledSensors = async (gateway: IoTGateway) => {
    if (!gateway.is_active || !token) return;

    setIsLoadingSensors(true);
    try {
      // Fetch enabled entities from backend
      const entities: IoTEntity[] = await apiClient.getIoTEntities(gateway.id.toString(), token);
      const enabledSensorEntities = entities.filter(
        (entity) => entity.is_enabled && entity.entity_id.startsWith('sensor.')
      );
      setEnabledSensors(enabledSensorEntities);

      // Fetch current states for enabled sensors
      if (enabledSensorEntities.length > 0) {
        const statesResponse = await fetch(`${gateway.api_url}/api/states`, {
          headers: {
            Authorization: `Bearer ${gateway.api_key}`,
            'Content-Type': 'application/json',
          },
        });

        if (statesResponse.ok) {
          const allStates: HAState[] = await statesResponse.json();
          const enabledEntityIds = enabledSensorEntities.map((e) => e.entity_id);
          const filteredStates = allStates.filter((state) =>
            enabledEntityIds.includes(state.entity_id)
          );
          setSensorStates(filteredStates);
        }
      }
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Failed to fetch enabled sensors:', err);
    } finally {
      setIsLoadingSensors(false);
    }
  };

  // Navigate to sensor detail screen
  const navigateToSensor = (gatewayId: number, sensorId: string) => {
    router.push(`/iot/${gatewayId}/sensor/${sensorId}`);
  };

  // Fetch available gateways
  const fetchGateways = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data: IoTGateway[] = await apiClient.get('/iot-gateways/', token, 'IoTGateway', true);
      const formattedGateways = data.map((gateway) => ({
        ...gateway,
        created_at: new Date(gateway.created_at),
      }));

      setGateways(formattedGateways);
      setFilteredGateways(formattedGateways);

      // Fetch sensors for linked gateways
      const linkedGateway = formattedGateways.find((gateway) => gateway.grow_id === growId);
      if (linkedGateway) {
        await fetchEnabledSensors(linkedGateway);
      }
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
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
          (gateway.name?.toLowerCase()?.includes(searchQuery?.toLowerCase() ?? '') ?? false) ||
          (gateway.description?.toLowerCase()?.includes(searchQuery?.toLowerCase() ?? '') ??
            false) ||
          (gateway.api_url?.toLowerCase()?.includes(searchQuery?.toLowerCase() ?? '') ?? false)
      );
      setFilteredGateways(filtered);
    }
  }, [searchQuery, gateways]);

  // Link gateway to grow
  const linkGateway = async (gatewayId: number) => {
    if (!growId || !token) return;

    setIsLinking(gatewayId);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.call({
        endpoint: `/iot-gateways/${gatewayId}/link/${growId}`,
        config: { method: 'PUT', token },
      });

      setSuccess('Gateway linked successfully!');
      onGatewayLinked?.(gatewayId);

      // Refresh gateways to show updated state
      await fetchGateways();
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to link gateway');
    } finally {
      setIsLinking(null);
    }
  };

  // Unlink gateway from grow
  const unlinkGateway = async (gatewayId: number) => {
    if (!token) return;

    setIsLinking(gatewayId);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.call({
        endpoint: `/iot-gateways/${gatewayId}/unlink`,
        config: { method: 'PUT', token },
      });

      setSuccess('Gateway unlinked successfully!');
      onGatewayUnlinked?.();

      // Clear sensor data
      setEnabledSensors([]);
      setSensorStates([]);

      // Refresh gateways to show updated state
      fetchGateways();
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
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
              <VStack space="md">
                <HStack className="items-center">
                  <VStack className="flex-1">
                    <Text className="text-lg font-semibold text-primary-700">{gateway.name}</Text>
                    <Text className="text-sm text-typography-500">
                      {gatewayTypeLabels[gateway.type as keyof typeof gatewayTypeLabels] ||
                        gateway.type}
                    </Text>
                  </VStack>
                  <HStack space="sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => navigateToGateway(gateway.id)}>
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

                {/* Enabled Sensors List */}
                {isLoadingSensors ? (
                  <VStack className="items-center py-4">
                    <Spinner size="small" />
                    <Text className="text-sm text-typography-500">Loading sensors...</Text>
                  </VStack>
                ) : enabledSensors.length === 0 ? (
                  <VStack className="py-4">
                    <Text className="text-center text-sm text-typography-500">
                      No enabled sensors found. Configure sensors in the IoT gateway settings.
                    </Text>
                  </VStack>
                ) : (
                  <VStack space="sm">
                    <Text className="text-sm font-medium text-typography-600">
                      Enabled Sensors ({enabledSensors.length})
                    </Text>
                    {enabledSensors.map((sensor) => {
                      const sensorState = sensorStates.find(
                        (state) => state.entity_id === sensor.entity_id
                      );
                      const deviceClass = sensorState?.attributes?.device_class;
                      const IconComponent = getSensorIcon(deviceClass);
                      const friendlyName =
                        sensor.friendly_name ||
                        sensorState?.attributes?.friendly_name ||
                        sensor.entity_id;
                      const currentValue = sensorState?.state || 'Unknown';
                      const unitOfMeasurement = sensorState?.attributes?.unit_of_measurement;

                      return (
                        <Pressable
                          key={sensor.entity_id}
                          onPress={() => navigateToSensor(gateway.id, sensor.entity_id)}>
                          <Card className="bg-background-50">
                            <HStack className="items-center" space="sm">
                              <Icon
                                as={IconComponent}
                                className="mr-2 text-primary-600"
                                size="md"
                              />
                              <VStack className="flex-1">
                                <Text className="font-medium">{friendlyName}</Text>
                                <Text className="text-xs text-typography-500">
                                  {sensor.entity_id}
                                </Text>
                              </VStack>
                              <VStack className="items-end">
                                <Text className="font-semibold text-primary-600">
                                  {currentValue}
                                  {unitOfMeasurement && ` ${unitOfMeasurement}`}
                                </Text>
                              </VStack>
                              <Icon
                                as={ChevronRight}
                                className="ml-1 text-typography-400"
                                size="md"
                              />
                            </HStack>
                          </Card>
                        </Pressable>
                      );
                    })}
                  </VStack>
                )}
              </VStack>
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
