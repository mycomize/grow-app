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
import {
  Search,
  X,
  Activity,
  AlertCircle,
  Filter,
  ChevronDown,
  Bot,
  SlidersHorizontal,
  Calculator,
  ToggleRight,
} from 'lucide-react-native';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';

import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { IoTGateway, HAState, IoTEntity, IoTEntityCreate } from '~/lib/iot';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getSwitchColors } from '~/lib/switchUtils';
import {
  getUserPreferences,
  updateIoTFilterPreferences,
  IoTFilterPreferences,
} from '~/lib/userPreferences';
import { CountBadge } from '~/components/ui/count-badge';

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

  // Filter preferences
  const [filterPreferences, setFilterPreferences] = useState<IoTFilterPreferences>({
    domains: ['switch', 'automation', 'sensor', 'number'],
    showAllDomains: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch gateway details
  const fetchGateway = useCallback(async () => {
    if (!id || !token) return;

    try {
      const data: IoTGateway = await apiClient.getIoTGateway(id as string, token);
      setGateway(data);

      // Fetch enabled entities and states if active
      if (data.is_active) {
        await Promise.all([fetchStates(data), fetchEnabledEntities(data.id)]);
      } else {
        setError('Integration is not active. Please connect it first.');
      }
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, token, router]);

  // Fetch enabled entities from backend
  const fetchEnabledEntities = async (gatewayId: number) => {
    if (!token) return;

    try {
      const entities: IoTEntity[] = await apiClient.getIoTEntities(gatewayId.toString(), token);
      setEnabledEntities(entities);
      setEnabledStates(new Set(entities.filter((e) => e.is_enabled).map((e) => e.entity_id)));
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
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
    if (!gateway || !token) return;

    try {
      const entityData: IoTEntityCreate = {
        gateway_id: gateway.id,
        entity_id: entityId,
        entity_type: entityType,
        friendly_name: friendlyName,
        is_enabled: true,
      };

      await apiClient.createIoTEntity(gateway.id.toString(), entityData, token);
      await fetchEnabledEntities(gateway.id);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Failed to add entity:', err);
    }
  };

  // Remove entity from gateway
  const removeEntityFromGateway = async (entityId: string) => {
    if (!gateway || !token) return;

    try {
      const entity = enabledEntities.find((e) => e.entity_id === entityId);
      if (!entity) return;

      await apiClient.deleteIoTEntity(gateway.id.toString(), entity.id.toString(), token);
      await fetchEnabledEntities(gateway.id);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
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

  // Filter states based on search, enabled filter, and domain preferences
  const filteredStates = states.filter((state) => {
    const domain = state.entity_id.split('.')[0];
    const friendlyName = state.attributes.friendly_name || '';

    // Domain filter
    const matchesDomain =
      filterPreferences.showAllDomains || filterPreferences.domains.includes(domain);

    // Search filter (entity_id, friendly_name, device_class)
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      state.entity_id.toLowerCase().includes(searchLower) ||
      friendlyName.toLowerCase().includes(searchLower) ||
      (state.attributes.device_class &&
        state.attributes.device_class.toLowerCase().includes(searchLower));

    // Enabled filter
    const matchesEnabledFilter = !filterEnabled || enabledStates.has(state.entity_id);

    return matchesDomain && matchesSearch && matchesEnabledFilter;
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

  // Get all available domains from states
  const availableDomains = Array.from(
    new Set(states.map((state) => state.entity_id.split('.')[0]))
  ).sort();

  // Toggle domain filter
  const toggleDomainFilter = async (domain: string) => {
    const newDomains = filterPreferences.domains.includes(domain)
      ? filterPreferences.domains.filter((d) => d !== domain)
      : [...filterPreferences.domains, domain];

    const newPrefs = { ...filterPreferences, domains: newDomains };
    setFilterPreferences(newPrefs);
    await updateIoTFilterPreferences(newPrefs);
  };

  // Toggle show all domains
  const toggleShowAllDomains = async () => {
    const newPrefs = { ...filterPreferences, showAllDomains: !filterPreferences.showAllDomains };
    setFilterPreferences(newPrefs);
    await updateIoTFilterPreferences(newPrefs);
  };

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getUserPreferences();
      setFilterPreferences(prefs.iotFilters);
    };
    loadPreferences();
  }, []);

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
          <VStack className="p-2" space="xl">
            <HStack className="items-center justify-between">
              <Heading size="xl">Control Selection</Heading>
            </HStack>
            <HStack className="items-center gap-2">
              <CountBadge count={filteredStates.length} label="ENTITIES" variant="success" />
              {enabledStates.size > 0 && (
                <CountBadge count={enabledStates.size} label="ASSIGNED" variant="green-dark" />
              )}
            </HStack>
            <Text>
              Select the Home Assistant states from the list below to assign them to your grow's IoT
              Control Panel.
            </Text>

            {/* Search and Filter Controls */}
            <VStack space="sm">
              <Input className="mb-4 mt-2">
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

              <HStack className="items-center">
                <Icon as={Filter} size="lg" className="text-typography-500" />
                <Text className="ml-2">Show assigned only</Text>
                <Switch
                  trackColor={{ false: trackFalse, true: trackTrue }}
                  thumbColor={thumbColor}
                  ios_backgroundColor={trackFalse}
                  value={filterEnabled}
                  onValueChange={setFilterEnabled}
                  className="ml-auto"
                />
              </HStack>

              {/* Domain Filters */}
              <VStack space="sm">
                <HStack className="mt-1 items-center ">
                  <Icon as={Filter} size="lg" className="text-typography-500" />
                  <Text className="ml-2">Domain Filters</Text>
                  <Button
                    className="ml-auto"
                    variant="solid"
                    action="primary"
                    size="sm"
                    onPress={() => setShowFilters(!showFilters)}>
                    <ButtonText>Configure</ButtonText>
                    {showFilters && <ButtonIcon as={ChevronDown} size="sm" />}
                    {!showFilters && <ButtonIcon as={SlidersHorizontal} size="sm" />}
                  </Button>
                </HStack>

                {showFilters && (
                  <VStack space="sm">
                    {true && (
                      <VStack space="xs">
                        <Text className="text-typography-500">Select domains to display:</Text>
                        <VStack space="xs">
                          {availableDomains.map((domain) => (
                            <HStack
                              key={domain}
                              className="my-1 ml-5 items-center justify-between border-b border-background-200">
                              <Text className="text-md mb-2 capitalize">{domain}</Text>
                              <Switch
                                trackColor={{ false: trackFalse, true: trackTrue }}
                                thumbColor={thumbColor}
                                ios_backgroundColor={trackFalse}
                                value={filterPreferences.domains.includes(domain)}
                                onValueChange={() => toggleDomainFilter(domain)}
                                className="mb-2"
                              />
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>
                    )}
                  </VStack>
                )}
              </VStack>
            </VStack>
          </VStack>
        </Card>

        {/* Grouped States */}
        {Object.entries(groupedStates).map(([domain, domainStates]) => (
          <Card key={domain} className="bg-background-0">
            <VStack className="p-2" space="sm">
              <HStack className="mb-2 items-center">
                {domain === 'sensor' && (
                  <Icon as={Activity} size="lg" className="text-typography-500" />
                )}
                {domain === 'automation' && (
                  <Icon as={Bot} size="xl" className="text-typography-500" />
                )}
                {domain === 'number' && (
                  <Icon as={Calculator} size="lg" className="text-typography-500" />
                )}
                {domain === 'switch' && (
                  <Icon as={ToggleRight} size="lg" className="text-typography-500" />
                )}
                <Heading size="md" className="ml-2 capitalize">
                  {domain}
                </Heading>
                <Badge className="ml-auto" variant="outline" action="muted">
                  <Text size="xs">{domainStates.length}</Text>
                </Badge>
              </HStack>

              {domainStates.map((state) => {
                const isEnabled = enabledStates.has(state.entity_id);
                const friendlyName = state.attributes.friendly_name || state.entity_id;

                return (
                  <Card key={state.entity_id} className="bg-background-50 p-3">
                    <VStack space="sm">
                      {/* Entity Info and Enable Toggle */}
                      <HStack className="items-center justify-between">
                        <VStack className="mr-2 flex-1">
                          <Text className="font-semibold">{friendlyName}</Text>
                          {state.attributes.device_class && (
                            <HStack>
                              <Text className="ml-2 text-typography-400">Device Class: </Text>
                              <Text className="capitalize italic text-typography-400">
                                {state.attributes.device_class}
                              </Text>
                            </HStack>
                          )}
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
