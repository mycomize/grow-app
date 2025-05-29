import { useState, useEffect, useContext, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { RefreshControl } from '~/components/ui/refresh-control';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Icon } from '~/components/ui/icon';
import { Switch } from '~/components/ui/switch';
import { Spinner } from '~/components/ui/spinner';
import { Pressable } from '~/components/ui/pressable';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertIcon, AlertText } from '~/components/ui/alert';
import { Search, X, Activity, AlertCircle, Filter } from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { IoTGateway, HAState, IoTEntity, IoTEntityCreate } from '~/lib/iot';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getSwitchColors } from '~/lib/switchUtils';

export default function EntityStatesScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);
  const [gateway, setGateway] = useState<IoTGateway | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [states, setStates] = useState<HAState[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledEntities, setEnabledEntities] = useState<IoTEntity[]>([]);
  const [enabledStates, setEnabledStates] = useState<Set<string>>(new Set());
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [isControlling, setIsControlling] = useState<Set<string>>(new Set());

  // Fetch gateway details
  const fetchGateway = useCallback(async () => {
    try {
      const url = getBackendUrl();
      const response = await fetch(`${url}/iot-gateways/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error('Failed to fetch integration details');
      }

      const data: IoTGateway = await response.json();
      setGateway(data);

      // Fetch enabled entities and states if active
      if (data.is_active) {
        await Promise.all([fetchStates(data), fetchEnabledEntities(data.id)]);
      } else {
        setError('Integration is not active. Please connect it first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, token]);

  // Fetch enabled entities from backend
  const fetchEnabledEntities = async (gatewayId: number) => {
    try {
      const url = getBackendUrl();
      const response = await fetch(`${url}/iot-gateways/${gatewayId}/entities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const entities: IoTEntity[] = await response.json();
        setEnabledEntities(entities);
        setEnabledStates(new Set(entities.filter((e) => e.is_enabled).map((e) => e.entity_id)));
      }
    } catch (err) {
      console.error('Failed to fetch enabled entities:', err);
    }
  };

  // Fetch states from Home Assistant
  const fetchStates = async (gateway: IoTGateway) => {
    try {
      const response = await fetch(`${gateway.api_url}/api/states`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: HAState[] = await response.json();
        setStates(data);
      } else {
        if (response.status === 401) {
          setError('Invalid API token');
        } else {
          setError('Failed to fetch states');
        }
      }
    } catch (err) {
      console.error('Failed to fetch states:', err);
      setError('Failed to connect to Home Assistant');
    }
  };

  // Add entity to gateway
  const addEntityToGateway = async (
    entityId: string,
    entityType: string,
    friendlyName?: string
  ) => {
    if (!gateway) return;

    try {
      const url = getBackendUrl();
      const entityData: IoTEntityCreate = {
        gateway_id: gateway.id,
        entity_id: entityId,
        entity_type: entityType,
        friendly_name: friendlyName,
        is_enabled: true,
      };

      const response = await fetch(`${url}/iot-gateways/${gateway.id}/entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entityData),
      });

      if (response.ok) {
        await fetchEnabledEntities(gateway.id);
      } else {
        const errorData = await response.json();
        console.error('Failed to add entity:', errorData);
      }
    } catch (err) {
      console.error('Failed to add entity:', err);
    }
  };

  // Remove entity from gateway
  const removeEntityFromGateway = async (entityId: string) => {
    if (!gateway) return;

    try {
      const entity = enabledEntities.find((e) => e.entity_id === entityId);
      if (!entity) return;

      const url = getBackendUrl();
      const response = await fetch(`${url}/iot-gateways/${gateway.id}/entities/${entity.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchEnabledEntities(gateway.id);
      } else {
        console.error('Failed to remove entity');
      }
    } catch (err) {
      console.error('Failed to remove entity:', err);
    }
  };

  // Control entity (turn switch on/off, etc.) - calls Home Assistant directly
  const controlEntity = async (
    entityId: string,
    domain: string,
    service: string,
    serviceData?: Record<string, any>
  ) => {
    if (!gateway) return;

    setIsControlling((prev) => new Set(prev).add(entityId));

    try {
      const serviceUrl = `${gateway.api_url}/api/services/${domain}/${service}`;

      const payload = {
        entity_id: entityId,
        ...serviceData,
      };

      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gateway.api_key}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Refresh states to get updated values
        await fetchStates(gateway);
      } else {
        console.error('Failed to control entity:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Failed to control entity:', err);
    } finally {
      setIsControlling((prev) => {
        const newSet = new Set(prev);
        newSet.delete(entityId);
        return newSet;
      });
    }
  };

  // Handle switch toggle for entity management
  const handleEntityToggle = async (
    entityId: string,
    entityType: string,
    friendlyName: string,
    enabled: boolean
  ) => {
    if (enabled) {
      await addEntityToGateway(entityId, entityType, friendlyName);
    } else {
      await removeEntityFromGateway(entityId);
    }
  };

  // Handle switch control for switches
  const handleSwitchControl = async (entityId: string, currentState: string) => {
    const service = currentState === 'on' ? 'turn_off' : 'turn_on';
    await controlEntity(entityId, 'switch', service);
  };

  // Refresh states periodically
  const refreshStates = useCallback(() => {
    if (gateway && gateway.is_active) {
      fetchStates(gateway);
    }
  }, [gateway]);

  // Filter states based on search and enabled filter
  const filteredStates = states.filter((state) => {
    const matchesSearch = state.entity_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterEnabled || enabledStates.has(state.entity_id);
    return matchesSearch && matchesFilter;
  });

  // Group states by domain
  const groupedStates = filteredStates.reduce(
    (acc, state) => {
      const domain = state.entity_id.split('.')[0];
      if (!acc[domain]) {
        acc[domain] = [];
      }
      acc[domain].push(state);
      return acc;
    },
    {} as Record<string, HAState[]>
  );

  useEffect(() => {
    fetchGateway();
  }, [fetchGateway]);

  // Set up periodic refresh for states
  useEffect(() => {
    if (gateway && gateway.is_active && states.length > 0) {
      const interval = setInterval(refreshStates, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [gateway, states.length, refreshStates]);

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
      </VStack>
    );
  }

  if (error && !states.length) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50 p-4">
        <Alert action="error">
          <AlertIcon as={AlertCircle} />
          <AlertText>{error}</AlertText>
        </Alert>
      </VStack>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-50"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchGateway();
          }}
        />
      }>
      <VStack className="p-4" space="md">
        <Card className="bg-background-0">
          <VStack className="p-4" space="xl">
            <HStack className="items-center justify-between">
              <Heading size="xl">Entity States</Heading>
              <HStack className="items-center rounded-sm bg-success-50 px-3 py-1">
                <Text className="text-sm text-success-700">{filteredStates.length} STATES</Text>
              </HStack>
            </HStack>

            {/* Search and Filter Controls */}
            <VStack space="sm">
              <Input>
                <InputIcon as={Search} className="ml-3" />
                <InputField
                  placeholder="Search entities..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery && (
                  <Pressable onPress={() => setSearchQuery('')} className="pr-3">
                    <Icon as={X} size="sm" className="text-typography-500" />
                  </Pressable>
                )}
              </Input>

              <HStack className="mt-2 items-center justify-between">
                <HStack className="mt-0 items-center" space="xs">
                  <Icon as={Filter} size="sm" className="text-typography-500" />
                  <Text className="ml-2 text-sm">Show enabled only</Text>
                </HStack>
                <Switch
                  trackColor={{ false: trackFalse, true: trackTrue }}
                  thumbColor={thumbColor}
                  ios_backgroundColor={trackFalse}
                  value={filterEnabled}
                  onValueChange={setFilterEnabled}
                />
              </HStack>
            </VStack>

            {/* Enabled count */}
            {enabledStates.size > 0 && (
              <Badge variant="outline" action="success">
                <Text size="xs">{enabledStates.size} enabled</Text>
              </Badge>
            )}
          </VStack>
        </Card>

        {/* Grouped States */}
        {Object.entries(groupedStates).map(([domain, domainStates]) => (
          <Card key={domain} className="bg-background-0">
            <VStack className="p-4" space="sm">
              <HStack className="mb-2 items-center justify-between">
                <Heading size="md" className="capitalize">
                  {domain}
                </Heading>
                <Badge variant="outline" action="muted">
                  <Text size="xs">{domainStates.length}</Text>
                </Badge>
              </HStack>

              {domainStates.map((state) => {
                const isEnabled = enabledStates.has(state.entity_id);
                const isSwitch = domain === 'switch';
                const isEntityControlling = isControlling.has(state.entity_id);
                const friendlyName = state.attributes.friendly_name || state.entity_id;

                return (
                  <Card key={state.entity_id} className="bg-background-50 p-3">
                    <VStack space="sm">
                      {/* Entity Info and Enable Toggle */}
                      <HStack className="items-center justify-between">
                        <VStack className="mr-2 flex-1">
                          <Text className="text-sm font-semibold">{state.entity_id}</Text>
                          <HStack className="mt-1 items-center" space="xs">
                            <Badge variant="solid" action="muted" size="sm">
                              <Text size="xs" className="text-white">
                                {state.state}
                              </Text>
                            </Badge>
                            {state.attributes.friendly_name && (
                              <Text className="text-xs text-typography-500">
                                {state.attributes.friendly_name}
                              </Text>
                            )}
                          </HStack>
                        </VStack>
                        {/* Enable/Disable Toggle */}
                        <VStack className="items-end" space="xs">
                          <Switch
                            trackColor={{ false: trackFalse, true: trackTrue }}
                            thumbColor={thumbColor}
                            ios_backgroundColor={trackFalse}
                            value={isEnabled}
                            onValueChange={(value) => {
                              handleEntityToggle(state.entity_id, domain, friendlyName, value);
                            }}
                          />
                        </VStack>
                      </HStack>

                      {/* Control Toggle (only for enabled switches) */}
                      {isEnabled && isSwitch && (
                        <HStack className="items-center justify-between border-t border-background-200 pt-3">
                          <Text className="text-sm font-medium">Control Switch</Text>
                          <HStack className="items-center" space="sm">
                            {isEntityControlling && <Spinner size="small" />}
                            <Switch
                              trackColor={{ false: trackFalse, true: trackTrue }}
                              thumbColor={thumbColor}
                              ios_backgroundColor={trackFalse}
                              value={state.state === 'on'}
                              onValueChange={() =>
                                handleSwitchControl(state.entity_id, state.state)
                              }
                              disabled={isEntityControlling}
                            />
                          </HStack>
                        </HStack>
                      )}
                    </VStack>
                  </Card>
                );
              })}
            </VStack>
          </Card>
        ))}
      </VStack>
    </ScrollView>
  );
}
