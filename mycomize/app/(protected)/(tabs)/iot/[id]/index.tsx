import { useState, useEffect, useContext, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { RefreshControl } from '~/components/ui/refresh-control';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Input, InputField, InputSlot, InputIcon } from '~/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Badge } from '~/components/ui/badge';
import { Icon } from '~/components/ui/icon';
import { Switch } from '~/components/ui/switch';
import { Spinner } from '~/components/ui/spinner';
import { useToast, Toast, ToastTitle, ToastDescription } from '~/components/ui/toast';
import { Pressable } from '~/components/ui/pressable';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Link, LinkText } from '~/components/ui/link';
import { Divider } from '~/components/ui/divider';
import {
  Home,
  Settings,
  Activity,
  Bot,
  Calculator,
  ToggleRight,
  Power,
  PowerOff,
  Search,
  AlertCircle,
  CheckCircle,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  TestTube,
  CirclePlus,
  CircleMinus,
  PlugZap,
  ChevronsLeftRightEllipsis,
  View,
  Zap,
  ZapOff,
  Thermometer,
  Droplet,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  ListX,
} from 'lucide-react-native';

import { CountBadge } from '~/components/ui/count-badge';
import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { IoTGateway, IoTGatewayUpdate, IoTEntity, IoTEntityCreate, HAState } from '~/lib/iot';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getSwitchColors } from '~/lib/switchUtils';
import { ConnectionStatusBadge, ConnectionStatus } from '~/components/ui/connection-status-badge';
import {
  getUserPreferences,
  updateIoTFilterPreferences,
  IoTFilterPreferences,
} from '~/lib/userPreferences';

interface ConnectionInfo {
  status: ConnectionStatus;
  version?: string;
  config?: any;
}

export default function IoTIntegrationDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);
  const toast = useToast();
  const [toastId, setToastId] = useState(0);
  const [gateway, setGateway] = useState<IoTGateway | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: 'disconnected',
  });
  const [stateCount, setEntityCount] = useState(0);
  const [enabledStates, setEnabledStates] = useState<string[]>([]);
  const [currentStates, setCurrentStates] = useState<HAState[]>([]);
  const [isControlling, setIsControlling] = useState<Set<string>>(new Set());
  const [pendingValues, setPendingValues] = useState<Record<string, string>>({});

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState<IoTGatewayUpdate>({
    name: '',
    description: '',
    api_url: '',
    api_key: '',
  });

  // Control selection state
  const [states, setStates] = useState<HAState[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledEntities, setEnabledEntities] = useState<IoTEntity[]>([]);
  const [enabledEntitiesSet, setEnabledEntitiesSet] = useState<Set<string>>(new Set());
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filterPreferences, setFilterPreferences] = useState<IoTFilterPreferences>({
    domains: ['switch', 'automation', 'sensor', 'number'],
    showAllDomains: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch enabled entities from backend
  const fetchEnabledEntities = useCallback(
    async (gatewayData?: IoTGateway) => {
      if (!id || !token) return;

      try {
        const entities: IoTEntity[] = await apiClient.getIoTEntities(id as string, token);
        const enabledEntityIds = entities.filter((e) => e.is_enabled).map((e) => e.entity_id);

        setEnabledEntities(entities);
        setEnabledStates(enabledEntityIds);
        setEnabledEntitiesSet(new Set(enabledEntityIds));

        // Fetch current states for enabled entities
        if (gatewayData && gatewayData.is_active) {
          await fetchCurrentStates(
            gatewayData,
            entities.filter((e) => e.is_enabled)
          );
        }
      } catch (err) {
        if (isUnauthorizedError(err as Error)) {
          router.replace('/login');
          return;
        }
        console.error('Failed to fetch enabled entities:', err);
      }
    },
    [id, token, router]
  );

  // Fetch current states for enabled entities
  const fetchCurrentStates = async (gateway: IoTGateway, entities: IoTEntity[]) => {
    try {
      const response = await fetch(`${gateway.api_url}/api/states`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const allStates: HAState[] = await response.json();
        const enabledEntityIds = entities.map((e) => e.entity_id);
        const filteredStates = allStates.filter((state) =>
          enabledEntityIds.includes(state.entity_id)
        );
        setCurrentStates(filteredStates);
      }
    } catch (err) {
      console.error('Failed to fetch current states:', err);
    }
  };

  // Fetch gateway details
  const fetchGateway = useCallback(async () => {
    if (!id || !token) return;

    try {
      const data: IoTGateway = await apiClient.getIoTGateway(id as string, token);
      setGateway({
        ...data,
        created_at: new Date(data.created_at),
      });

      // Initialize form data
      setFormData({
        name: data.name,
        description: data.description || '',
        api_url: data.api_url,
        api_key: data.api_key,
      });

      // Check Home Assistant connection if active
      if (data.is_active) {
        checkHomeAssistantConnection(data);
      }

      // Fetch enabled entities
      await fetchEnabledEntities(data);
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
  }, [id, token, router, fetchEnabledEntities]);

  // Check Home Assistant connection via REST API
  const checkHomeAssistantConnection = async (gateway: IoTGateway) => {
    try {
      // Try to get basic info from Home Assistant
      const response = await fetch(`${gateway.api_url}/api/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionInfo({
          status: 'connected',
          version: data.version,
        });

        // Get state count
        await getEntityCount(gateway);
      } else {
        setConnectionInfo({ status: 'disconnected' });
        if (response.status === 401) {
          setError('Invalid API token');
        }
      }
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionInfo({ status: 'disconnected' });
    }
  };

  // Get state count
  const getEntityCount = async (gateway: IoTGateway) => {
    try {
      const statesResponse = await fetch(`${gateway.api_url}/api/states`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (statesResponse.ok) {
        const states = await statesResponse.json();
        setEntityCount(states.length);
      }
    } catch (err) {
      console.error('Failed to get state count:', err);
    }
  };

  // Test connection manually
  const testConnection = async () => {
    if (!gateway) return;

    setIsTestingConnection(true);
    setError(null);
    setSuccess(null);

    try {
      setConnectionInfo({ status: 'connecting' });
      await checkHomeAssistantConnection(gateway);
      if (connectionInfo.status === 'connected') {
        setSuccess('Connection test successful!');
      } else {
        setError('Connection test failed. Please check your settings.');
      }
    } catch (err) {
      setError('Connection test failed. Please check your settings.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Toggle gateway active status
  const toggleGatewayStatus = async () => {
    if (!gateway || !token) return;

    try {
      const updatedGateway: IoTGateway = gateway.is_active
        ? await apiClient.disableIoTGateway(id as string, token)
        : await apiClient.enableIoTGateway(id as string, token);

      setGateway({
        ...updatedGateway,
        created_at: new Date(updatedGateway.created_at),
      });

      if (updatedGateway.is_active) {
        checkHomeAssistantConnection(updatedGateway);
        setSuccess('Integration connected successfully');
      } else {
        setConnectionInfo({ status: 'disconnected' });
        setSuccess('Integration disconnected');
      }
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Save gateway changes
  const saveChanges = async () => {
    if (!token) return;

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updatedGateway: IoTGateway = await apiClient.updateIoTGateway(
        id as string,
        formData,
        token
      );

      setGateway({
        ...updatedGateway,
        created_at: new Date(updatedGateway.created_at),
      });
      setSuccess('Settings updated successfully');
      setIsEditing(false);

      // Check connection with new settings
      if (updatedGateway.is_active) {
        checkHomeAssistantConnection(updatedGateway);
      }
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    if (gateway) {
      setFormData({
        name: gateway.name,
        description: gateway.description || '',
        api_url: gateway.api_url,
        api_key: gateway.api_key,
      });
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  // Control entity functions
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
        if (gateway.is_active && token) {
          try {
            const entities: IoTEntity[] = await apiClient.getIoTEntities(
              gateway.id.toString(),
              token
            );
            await fetchCurrentStates(
              gateway,
              entities.filter((e) => e.is_enabled)
            );
          } catch (err) {
            if (isUnauthorizedError(err as Error)) {
              router.replace('/login');
              return;
            }
            console.error('Failed to refresh entity states:', err);
          }
        }
      } else {
        setError('Failed to control entity');
      }
    } catch (err) {
      setError('Failed to control entity');
    } finally {
      setIsControlling((prev) => {
        const newSet = new Set(prev);
        newSet.delete(entityId);
        return newSet;
      });
    }
  };

  // Handle switch/automation toggle
  const handleToggle = async (entityId: string, domain: string, currentState: string) => {
    const service = currentState === 'on' ? 'turn_off' : 'turn_on';
    await controlEntity(entityId, domain, service);
  };

  // Handle number input change (just update local state)
  const handleNumberChange = (entityId: string, value: string) => {
    setPendingValues((prev) => ({
      ...prev,
      [entityId]: value,
    }));
  };

  // Handle increment/decrement
  const adjustNumberValue = (entityId: string, increment: boolean, currentValue: string) => {
    const currentNum = parseFloat(currentValue);
    if (isNaN(currentNum)) return;

    const step = increment ? 1 : -1;
    const newValue = (currentNum + step).toString();

    setPendingValues((prev) => ({
      ...prev,
      [entityId]: newValue,
    }));
  };

  // Save pending value to Home Assistant
  const saveNumberValue = async (entityId: string, pendingValue: string) => {
    const numValue = parseFloat(pendingValue);
    if (!isNaN(numValue)) {
      await controlEntity(entityId, 'number', 'set_value', { value: numValue });
      // Clear pending value after successful save
      setPendingValues((prev) => {
        const updated = { ...prev };
        delete updated[entityId];
        return updated;
      });
    }
  };

  // Fetch states from Home Assistant for control selection
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
      await fetchEnabledEntities(gateway);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Failed to add entity:', err);
      setError('Failed to add entity: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Remove entity from gateway
  const removeEntityFromGateway = async (entityId: string) => {
    if (!gateway || !token) return;

    try {
      const entity = enabledEntities.find((e) => e.entity_id === entityId);
      if (!entity) return;

      await apiClient.deleteIoTEntity(gateway.id.toString(), entity.id.toString(), token);
      await fetchEnabledEntities(gateway);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Failed to remove entity:', err);
      setError(
        'Failed to remove entity: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
    }
  };

  // Handle entity toggle for control selection
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

  // Load states when gateway becomes active
  useEffect(() => {
    if (gateway && gateway.is_active && states.length === 0) {
      fetchStates(gateway);
    }
  }, [gateway]);

  // Toast functions
  const showErrorToast = (message: string) => {
    const newId = Math.random();
    setToastId(newId);

    if (!toast.isActive('error-toast-' + newId)) {
      toast.show({
        id: 'error-toast-' + newId,
        placement: 'top',
        duration: 3000,
        render: ({ id }) => {
          return (
            <Toast variant="outline" className="mx-auto mt-36 w-full p-4">
              <VStack space="xs" className="w-full">
                <HStack className="flex-row gap-2">
                  <Icon as={AlertCircle} className="mt-0.5 stroke-error-500" />
                  <ToastTitle className="font-semibold text-error-500">Error</ToastTitle>
                </HStack>
                <ToastDescription className="text-typography-200">{message}</ToastDescription>
              </VStack>
            </Toast>
          );
        },
      });
    }
  };

  const showSuccessToast = (message: string) => {
    const newId = Math.random();
    setToastId(newId);

    if (!toast.isActive('success-toast-' + newId)) {
      toast.show({
        id: 'success-toast-' + newId,
        placement: 'top',
        duration: 3000,
        render: ({ id }) => {
          return (
            <Toast className="mx-auto mt-36 w-full p-4">
              <VStack space="xs" className="w-full">
                <HStack className="flex-row gap-2">
                  <Icon as={CheckCircle} className="mt-0.5 stroke-green-600" />
                  <ToastTitle className="font-semibold text-green-600">Success</ToastTitle>
                </HStack>
                <ToastDescription className="text-typography-200">{message}</ToastDescription>
              </VStack>
            </Toast>
          );
        },
      });
    }
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

  // Refresh enabled entities when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (gateway) {
        fetchEnabledEntities(gateway);
      }
    }, [fetchEnabledEntities, gateway])
  );

  // Show toasts when error or success state changes
  useEffect(() => {
    if (error) {
      showErrorToast(error);
      setError(null);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      showSuccessToast(success);
      setSuccess(null);
    }
  }, [success]);

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
      </VStack>
    );
  }

  if (!gateway) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Text>Integration not found</Text>
      </VStack>
    );
  }

  // Group states by domain
  const groupedStates = currentStates.reduce(
    (acc, state) => {
      const domain = state.entity_id.split('.')[0];
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(state);
      return acc;
    },
    {} as Record<string, HAState[]>
  );

  return (
    <>
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
          {/* Connection Details Panel */}
          <Card className="bg-background-0">
            <VStack className="p-2" space="md">
              <HStack className="items-center justify-between">
                <Heading size="lg">Details</Heading>
                {!isEditing ? (
                  <Button variant="outline" onPress={() => setIsEditing(true)}>
                    <ButtonIcon as={Edit} />
                    <ButtonText>Edit</ButtonText>
                  </Button>
                ) : (
                  <HStack space="md">
                    <Button variant="outline" onPress={cancelEditing}>
                      <ButtonIcon as={X} />
                      <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button
                      variant="solid"
                      action="positive"
                      onPress={saveChanges}
                      isDisabled={isSaving}>
                      <ButtonIcon as={Save} className="text-white" />
                      <ButtonText className="text-white">
                        {isSaving ? 'Saving...' : 'Save'}
                      </ButtonText>
                    </Button>
                  </HStack>
                )}
              </HStack>

              {isEditing ? (
                <VStack space="lg">
                  <FormControl isRequired>
                    <FormControlLabel>
                      <FormControlLabelText>Integration Name</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                      />
                    </Input>
                  </FormControl>

                  <FormControl>
                    <FormControlLabel>
                      <FormControlLabelText>Description</FormControlLabelText>
                    </FormControlLabel>
                    <Textarea>
                      <TextareaInput
                        placeholder="Optional description"
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        style={{ textAlignVertical: 'top' }}
                      />
                    </Textarea>
                  </FormControl>

                  <FormControl isRequired>
                    <FormControlLabel>
                      <FormControlLabelText>Home Assistant URL</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        value={formData.api_url}
                        onChangeText={(text) => setFormData({ ...formData, api_url: text })}
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                    </Input>
                  </FormControl>

                  <FormControl isRequired>
                    <FormControlLabel>
                      <FormControlLabelText>API Token</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        placeholder="Enter new token to change"
                        value={formData.api_key}
                        onChangeText={(text) => setFormData({ ...formData, api_key: text })}
                        autoCapitalize="none"
                        secureTextEntry={!showApiKey}
                      />
                      <InputSlot className="pr-3">
                        <Pressable onPress={() => setShowApiKey(!showApiKey)}>
                          <InputIcon
                            as={showApiKey ? EyeOff : Eye}
                            className="text-background-500"
                          />
                        </Pressable>
                      </InputSlot>
                    </Input>
                  </FormControl>
                </VStack>
              ) : (
                <VStack space="md">
                  <HStack className="justify-between">
                    <Text className="font-medium">Name:</Text>
                    <Text className="flex-1 text-right" numberOfLines={1} ellipsizeMode="middle">
                      {gateway.name}
                    </Text>
                  </HStack>
                  <HStack className="justify-between">
                    <Text className="font-medium">URL:</Text>
                    <Text className="flex-1 text-right" numberOfLines={1} ellipsizeMode="middle">
                      {gateway.api_url}
                    </Text>
                  </HStack>
                  <HStack className="justify-between">
                    <Text className="font-medium">API Token:</Text>
                    <Text>••••••••••••••••</Text>
                  </HStack>
                  {gateway.grow_id && (
                    <HStack className="justify-between">
                      <Text className="font-medium">Linked Grow:</Text>
                      <Text className="font-medium text-primary-600">Grow #{gateway.grow_id}</Text>
                    </HStack>
                  )}
                  {gateway.created_at && (
                    <HStack className="justify-between">
                      <Text className="font-medium">Created:</Text>
                      <Text>{gateway.created_at.toLocaleDateString()}</Text>
                    </HStack>
                  )}
                </VStack>
              )}
            </VStack>
          </Card>

          {/* Connection Status Panel */}
          <Card className="bg-background-0">
            <VStack className="p-2" space="md">
              <HStack className="mb-2 items-center justify-between">
                <Heading size="lg">Status</Heading>
                <ConnectionStatusBadge
                  status={isTestingConnection ? 'connecting' : connectionInfo.status}
                />
              </HStack>

              {connectionInfo.status === 'connected' && connectionInfo.version && (
                <Text className="text-sm text-typography-500">
                  Home Assistant Version: {connectionInfo.version}
                </Text>
              )}

              {/* Connection Controls */}
              <HStack space="sm">
                <Button
                  onPress={toggleGatewayStatus}
                  className={gateway.is_active ? 'flex-1 bg-error-200' : 'flex-1 bg-success-300'}>
                  <ButtonIcon
                    as={gateway.is_active ? PowerOff : Power}
                    className={gateway.is_active ? 'text-typography-700' : 'text-white'}
                  />
                  <ButtonText className={gateway.is_active ? 'text-typography-700' : 'text-white'}>
                    {gateway.is_active ? 'Disconnect' : 'Connect'}
                  </ButtonText>
                </Button>

                <Button
                  variant="outline"
                  onPress={testConnection}
                  isDisabled={isTestingConnection || !gateway.is_active}
                  className="flex-1">
                  <ButtonIcon as={ChevronsLeftRightEllipsis} />
                  <ButtonText>{isTestingConnection ? 'Testing...' : 'Test'}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          </Card>

          {/* Control Panel Section */}
          <Card className="bg-background-0">
            <VStack className="p-2" space="md">
              <HStack className="items-center justify-between">
                <Heading size="lg">Control Panel</Heading>
                <HStack className="gap-2">
                  <CountBadge
                    count={enabledStates.length}
                    label="ASSIGNED"
                    variant="green-dark"
                    size="md"
                  />
                  <CountBadge
                    count={
                      states.filter((state) => {
                        const domain = state.entity_id.split('.')[0];
                        const friendlyName = state.attributes.friendly_name || '';
                        const searchLower = searchQuery.toLowerCase();
                        const matchesDomain =
                          filterPreferences.showAllDomains ||
                          filterPreferences.domains.includes(domain);
                        const matchesSearch =
                          searchQuery === '' ||
                          state.entity_id.toLowerCase().includes(searchLower) ||
                          friendlyName.toLowerCase().includes(searchLower) ||
                          (state.attributes.device_class &&
                            state.attributes.device_class.toLowerCase().includes(searchLower));
                        const matchesEnabledFilter =
                          !filterEnabled || enabledEntitiesSet.has(state.entity_id);
                        return matchesDomain && matchesSearch && matchesEnabledFilter;
                      }).length
                    }
                    label="ENTITIES"
                    variant="success"
                    size="md"
                  />
                </HStack>
              </HStack>

              {enabledStates.length === 0 ? (
                <VStack className="items-center  pt-6" space="md">
                  <Text className="text-center text-typography-500">No controls assigned yet.</Text>
                  <Icon as={ListX} className="text-typography-500" />
                </VStack>
              ) : (
                <VStack space="sm">
                  {/* Group states by domain */}
                  {Object.entries(groupedStates).map(([domain, domainStates]) => (
                    <VStack key={domain} space="md">
                      <HStack className="mt-4">
                        {domain === 'sensor' && (
                          <Icon as={Activity} className="text-typography-500" />
                        )}
                        {domain === 'number' && (
                          <Icon as={Calculator} className="text-typography-500" />
                        )}
                        {domain === 'automation' && (
                          <Icon as={Bot} className="text-typography-500" />
                        )}
                        {domain === 'switch' && (
                          <Icon as={ToggleRight} className="text-typography-500" />
                        )}
                        <Text className="text-md ml-2 font-semibold capitalize text-typography-600">
                          {domain} ({domainStates.length})
                        </Text>
                      </HStack>
                      {domainStates.map((state) => {
                        const friendlyName = state.attributes.friendly_name || state.entity_id;
                        const isEntityControlling = isControlling.has(state.entity_id);

                        return (
                          <Card key={state.entity_id} className="bg-background-50 p-4">
                            <HStack className="items-center" space="sm">
                              {/* State Icon for switches and automations */}
                              {(domain === 'switch' || domain === 'automation') &&
                                (state.state === 'on' ? (
                                  <Icon as={Zap} className="text-green-500" />
                                ) : (
                                  <Icon as={ZapOff} className="text-typography-400" />
                                ))}

                              {/* Entity Name */}
                              <VStack className="flex-1">
                                {/* Sensor display with icon and value */}
                                {domain === 'sensor' && (
                                  <HStack>
                                    {state.attributes.device_class === 'temperature' && (
                                      <Icon as={Thermometer} />
                                    )}
                                    {state.attributes.device_class === 'humidity' && (
                                      <Icon as={Droplet} />
                                    )}
                                    <Text className="ml-3 font-medium">{friendlyName}</Text>
                                    <Text className="text-md ml-auto text-typography-500">
                                      {state.state}
                                      {state.attributes.unit_of_measurement &&
                                        ` ${state.attributes.unit_of_measurement}`}
                                    </Text>
                                  </HStack>
                                )}

                                {/* Other domains display friendly name */}
                                {domain !== 'sensor' && (
                                  <>
                                    <Text className="font-medium">{friendlyName}</Text>

                                    {domain === 'number' && (
                                      <Text className="text-md mt-1 text-typography-500">
                                        Current: {state.state}
                                        {state.attributes.unit_of_measurement &&
                                          ` ${state.attributes.unit_of_measurement}`}
                                      </Text>
                                    )}
                                  </>
                                )}
                              </VStack>

                              {/* Domain-specific controls */}
                              <HStack className="items-center" space="sm">
                                {isEntityControlling && (
                                  <Spinner size="small" className="mr-6 mt-2 text-success-500" />
                                )}

                                {/* Switch and Automation Toggle */}
                                {(domain === 'switch' || domain === 'automation') &&
                                  !isEntityControlling && (
                                    <Switch
                                      trackColor={{ false: trackFalse, true: trackTrue }}
                                      thumbColor={thumbColor}
                                      ios_backgroundColor={trackFalse}
                                      value={state.state === 'on'}
                                      onValueChange={() =>
                                        handleToggle(state.entity_id, domain, state.state)
                                      }
                                      disabled={isEntityControlling}
                                    />
                                  )}

                                {/* Number Input */}
                                {domain === 'number' && !isEntityControlling && (
                                  <Input className="mt-4 w-20">
                                    <InputField
                                      value={pendingValues[state.entity_id] ?? state.state}
                                      onChangeText={(value) =>
                                        handleNumberChange(state.entity_id, value)
                                      }
                                      keyboardType="numeric"
                                      editable={!isEntityControlling}
                                    />
                                  </Input>
                                )}
                              </HStack>
                            </HStack>
                            {/* Number input controls */}
                            {domain === 'number' && (
                              <HStack className=" mt-3 gap-9">
                                <Pressable
                                  onPress={() =>
                                    adjustNumberValue(
                                      state.entity_id,
                                      false,
                                      pendingValues[state.entity_id] ?? state.state
                                    )
                                  }
                                  disabled={isEntityControlling}>
                                  <Icon
                                    as={CircleMinus}
                                    size="xl"
                                    className="text-typography-600"
                                  />
                                </Pressable>
                                <Pressable
                                  onPress={() =>
                                    adjustNumberValue(
                                      state.entity_id,
                                      true,
                                      pendingValues[state.entity_id] ?? state.state
                                    )
                                  }
                                  disabled={isEntityControlling}>
                                  <Icon as={CirclePlus} size="xl" className="text-typography-600" />
                                </Pressable>
                                {pendingValues[state.entity_id] && (
                                  <Pressable
                                    className="ml-auto"
                                    onPress={() =>
                                      saveNumberValue(
                                        state.entity_id,
                                        pendingValues[state.entity_id]
                                      )
                                    }
                                    disabled={isEntityControlling}>
                                    <Icon as={Save} size="xl" className="text-typography-600" />
                                  </Pressable>
                                )}
                              </HStack>
                            )}
                          </Card>
                        );
                      })}
                    </VStack>
                  ))}
                </VStack>
              )}

              {/* Control Selection Interface - Always Visible */}
              <VStack space="xl" className="mt-8">
                <Divider />

                {/* Search and Filter Controls */}
                <VStack space="sm">
                  <Input className="mb-4 mt-2">
                    <Icon as={Search} className="ml-3 text-typography-500" />
                    <InputField
                      placeholder="Search controls..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery && (
                      <InputSlot className="pr-3">
                        <Pressable onPress={() => setSearchQuery('')}>
                          <Icon as={X} size="sm" className="text-typography-500" />
                        </Pressable>
                      </InputSlot>
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
                    <HStack className="mt-1 items-center">
                      <Icon as={Filter} size="lg" className="text-typography-500" />
                      <Text className="ml-2">Domain Filters</Text>
                      <Button
                        className="ml-auto"
                        variant="solid"
                        action="primary"
                        size="sm"
                        onPress={() => setShowFilters(!showFilters)}>
                        <ButtonText>Configure</ButtonText>
                        <ButtonIcon as={showFilters ? ChevronDown : SlidersHorizontal} size="sm" />
                      </Button>
                    </HStack>

                    {showFilters && (
                      <VStack space="sm">
                        <VStack space="xs">
                          <Text className="text-typography-500">Select domains to display:</Text>
                          <VStack space="xs">
                            {Array.from(
                              new Set(states.map((state) => state.entity_id.split('.')[0]))
                            )
                              .sort()
                              .map((domain) => (
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
                      </VStack>
                    )}
                  </VStack>
                </VStack>

                {/* Grouped States */}
                {Object.entries(
                  states
                    .filter((state) => {
                      const domain = state.entity_id.split('.')[0];
                      const friendlyName = state.attributes.friendly_name || '';
                      const searchLower = searchQuery.toLowerCase();
                      const matchesDomain =
                        filterPreferences.showAllDomains ||
                        filterPreferences.domains.includes(domain);
                      const matchesSearch =
                        searchQuery === '' ||
                        state.entity_id.toLowerCase().includes(searchLower) ||
                        friendlyName.toLowerCase().includes(searchLower) ||
                        (state.attributes.device_class &&
                          state.attributes.device_class.toLowerCase().includes(searchLower));
                      const matchesEnabledFilter =
                        !filterEnabled || enabledEntitiesSet.has(state.entity_id);
                      return matchesDomain && matchesSearch && matchesEnabledFilter;
                    })
                    .reduce(
                      (acc, state) => {
                        const domain = state.entity_id.split('.')[0];
                        if (!acc[domain]) acc[domain] = [];
                        acc[domain].push(state);
                        return acc;
                      },
                      {} as Record<string, HAState[]>
                    )
                ).map(([domain, domainStates]) => (
                  <VStack key={domain} className="p-0" space="sm">
                    <Divider className="mb-3" />
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
                      const isEnabled = enabledEntitiesSet.has(state.entity_id);
                      const friendlyName = state.attributes.friendly_name || state.entity_id;

                      return (
                        <Card key={state.entity_id} className="bg-background-0 p-2">
                          <VStack space="sm">
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
                              <VStack className="items-end" space="xs">
                                <Switch
                                  trackColor={{ false: trackFalse, true: trackTrue }}
                                  thumbColor={thumbColor}
                                  ios_backgroundColor={trackFalse}
                                  value={isEnabled}
                                  onValueChange={(value) => {
                                    handleEntityToggle(
                                      state.entity_id,
                                      domain,
                                      friendlyName,
                                      value
                                    );
                                  }}
                                />
                              </VStack>
                            </HStack>
                          </VStack>
                        </Card>
                      );
                    })}
                  </VStack>
                ))}
              </VStack>
            </VStack>
          </Card>
        </VStack>
      </ScrollView>
    </>
  );
}
