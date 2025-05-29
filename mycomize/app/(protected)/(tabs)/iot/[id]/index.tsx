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
import {
  Home,
  Wifi,
  WifiOff,
  Settings,
  Activity,
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
  Plus,
  PlugZap,
  ChevronsLeftRightEllipsis,
  View,
} from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { IoTGateway, IoTGatewayUpdate, IoTEntity } from '~/lib/iot';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getSwitchColors } from '~/lib/switchUtils';

interface ConnectionInfo {
  connected: boolean;
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
    connected: false,
  });
  const [stateCount, setEntityCount] = useState(0);
  const [enabledStates, setEnabledStates] = useState<string[]>([]);

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

  // Fetch enabled entities from backend
  const fetchEnabledEntities = useCallback(async () => {
    if (!id) return;

    try {
      const url = getBackendUrl();
      const response = await fetch(`${url}/iot-gateways/${id}/entities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const entities: IoTEntity[] = await response.json();
        setEnabledStates(entities.filter((e) => e.is_enabled).map((e) => e.entity_id));
      }
    } catch (err) {
      console.error('Failed to fetch enabled entities:', err);
    }
  }, [id, token]);

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
      await fetchEnabledEntities();
    } catch (err) {
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
          connected: true,
          version: data.version,
        });

        // Get state count
        await getEntityCount(gateway);
      } else {
        setConnectionInfo({ connected: false });
        if (response.status === 401) {
          setError('Invalid API token');
        }
      }
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionInfo({ connected: false });
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
      await checkHomeAssistantConnection(gateway);
      if (connectionInfo.connected) {
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
    if (!gateway) return;

    try {
      const url = getBackendUrl();
      const endpoint = gateway.is_active
        ? `/iot-gateways/${id}/disable`
        : `/iot-gateways/${id}/enable`;

      const response = await fetch(`${url}${endpoint}`, {
        method: 'PUT',
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
        throw new Error('Failed to update integration status');
      }

      const updatedGateway: IoTGateway = await response.json();
      setGateway({
        ...updatedGateway,
        created_at: new Date(updatedGateway.created_at),
      });

      if (updatedGateway.is_active) {
        checkHomeAssistantConnection(updatedGateway);
        setSuccess('Integration connected successfully');
      } else {
        setConnectionInfo({ connected: false });
        setSuccess('Integration disconnected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Save gateway changes
  const saveChanges = async () => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const url = getBackendUrl();
      const response = await fetch(`${url}/iot-gateways/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update integration');
      }

      const updatedGateway: IoTGateway = await response.json();
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

  // Navigate to state search/selection
  const navigateToEntitySearch = () => {
    const gatewayId = Array.isArray(id) ? id[0] : id;
    router.push({
      pathname: `/iot/[id]/states`,
      params: { id: gatewayId },
    });
  };

  // Toast functions
  const showErrorToast = (message: string) => {
    const newId = Math.random();
    setToastId(newId);

    if (!toast.isActive('error-toast-' + newId)) {
      toast.show({
        id: 'error-toast-' + newId,
        placement: 'bottom',
        duration: 4000,
        render: ({ id }) => {
          return (
            <Toast
              action="error"
              variant="outline"
              className="mx-auto mb-20 w-11/12 border-error-500 p-4 shadow-hard-5 dark:border-error-400 dark:bg-background-900">
              <VStack space="xs" className="w-full">
                <HStack className="flex-row gap-2">
                  <Icon
                    as={AlertCircle}
                    className="mt-0.5 stroke-error-500 dark:stroke-error-400"
                  />
                  <ToastTitle className="font-semibold text-error-700 dark:text-error-300">
                    Error
                  </ToastTitle>
                </HStack>
                <ToastDescription className="text-typography-700 dark:text-typography-300">
                  {message}
                </ToastDescription>
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
        placement: 'bottom',
        duration: 4000,
        render: ({ id }) => {
          return (
            <Toast
              action="success"
              variant="outline"
              className="mx-auto mb-20 w-11/12 border-success-500 p-4 shadow-hard-5 dark:border-success-400 dark:bg-background-900">
              <VStack space="xs" className="w-full">
                <HStack className="flex-row gap-2">
                  <Icon
                    as={CheckCircle}
                    className="mt-0.5 stroke-success-500 dark:stroke-success-400"
                  />
                  <ToastTitle className="font-semibold text-success-700 dark:text-success-300">
                    Success
                  </ToastTitle>
                </HStack>
                <ToastDescription className="text-typography-700 dark:text-typography-300">
                  {message}
                </ToastDescription>
              </VStack>
            </Toast>
          );
        },
      });
    }
  };

  useEffect(() => {
    fetchGateway();
  }, [fetchGateway]);

  // Refresh enabled entities when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchEnabledEntities();
    }, [fetchEnabledEntities])
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
        <Heading className="bg-background-0 pb-5 pt-8 text-center">IoT Gateway</Heading>
        <VStack className="p-4" space="md">
          {/* Header Card */}

          {/* Messages - Now handled via toasts */}

          {/* Connection Details Panel */}
          <Card className="bg-background-0">
            <VStack className="p-4" space="md">
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
                    <Text className="font-medium">Token:</Text>
                    <Text>••••••••••••••••</Text>
                  </HStack>
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
            <VStack className="p-4" space="md">
              <HStack className="mb-2 items-center justify-between">
                <Heading size="lg">Status</Heading>
                {connectionInfo.connected ? (
                  <HStack className="items-center rounded-sm bg-success-50 px-3 py-1">
                    <Icon as={PlugZap} className="mr-2 text-success-700" />
                    <Text className="text-sm text-success-700">CONNECTED</Text>
                  </HStack>
                ) : (
                  <HStack className="items-center rounded-sm bg-error-50 px-3 py-1">
                    <Icon as={PowerOff} className="mr-2 text-error-700" />
                    <Text className="text-sm text-error-700">DISCONNECTED</Text>
                  </HStack>
                )}
              </HStack>

              {connectionInfo.connected && connectionInfo.version && (
                <Text className="text-sm text-typography-500">
                  Home Assistant Version: {connectionInfo.version}
                </Text>
              )}

              {/* Connection Controls */}
              <HStack space="sm">
                <Button
                  variant="solid"
                  action={gateway.is_active ? 'negative' : 'positive'}
                  onPress={toggleGatewayStatus}
                  className="flex-1">
                  <ButtonIcon as={gateway.is_active ? PowerOff : Power} className="text-white" />
                  <ButtonText className="text-white">
                    {gateway.is_active ? 'Disconnect' : 'Connect'}
                  </ButtonText>
                </Button>

                <Button
                  variant="outline"
                  onPress={testConnection}
                  isDisabled={isTestingConnection || !gateway.is_active}
                  className="flex-1">
                  <ButtonIcon as={ChevronsLeftRightEllipsis} className="mr-0" />
                  <ButtonText>{isTestingConnection ? 'Testing...' : 'Test'}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          </Card>

          {/* Enabled States Section */}
          <Card className="bg-background-0">
            <VStack className="p-4" space="md">
              <HStack className="items-center justify-between">
                <Heading size="lg">Enabled States</Heading>
                <Badge variant="outline" action="muted">
                  <Text size="xs">{enabledStates.length} enabled</Text>
                </Badge>
              </HStack>

              {enabledStates.length === 0 ? (
                <VStack className="items-center py-8" space="md">
                  <Text className="text-center text-typography-500">
                    No states enabled yet.{'\n'}
                    Browse and select states to monitor.
                  </Text>
                  <Button
                    variant="solid"
                    action="positive"
                    onPress={navigateToEntitySearch}
                    isDisabled={!gateway.is_active || !connectionInfo.connected}>
                    <ButtonIcon as={Search} className="text-white" />
                    <ButtonText className="text-white">Browse States</ButtonText>
                  </Button>
                </VStack>
              ) : (
                <VStack space="sm">
                  {enabledStates.map((stateId) => (
                    <Card key={stateId} className="bg-background-50 p-3">
                      <HStack className="items-center justify-between">
                        <Text className="flex-1 font-medium">{stateId}</Text>
                        <Switch
                          trackColor={{ false: trackFalse, true: trackTrue }}
                          thumbColor={thumbColor}
                          ios_backgroundColor={trackFalse}
                          value={true}
                          onValueChange={(value) => {
                            if (!value) {
                              setEnabledStates((prev) => prev.filter((id) => id !== stateId));
                            }
                          }}
                        />
                      </HStack>
                    </Card>
                  ))}
                  <Button variant="outline" onPress={navigateToEntitySearch} className="mt-2">
                    <ButtonIcon as={Plus} className="mr-2" />
                    <ButtonText>Add More States</ButtonText>
                  </Button>
                </VStack>
              )}
            </VStack>
          </Card>
        </VStack>
      </ScrollView>
    </>
  );
}
