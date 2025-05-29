import { useState, useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Input, InputField, InputSlot, InputIcon } from '~/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Alert, AlertIcon, AlertText } from '~/components/ui/alert';
import { Spinner } from '~/components/ui/spinner';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import {
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Save,
  Power,
  PowerOff,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { IoTGateway, IoTGatewayUpdate } from '~/lib/iot';

interface ConnectionInfo {
  connected: boolean;
  version?: string;
}

export default function ConnectionDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useContext(AuthContext);

  const [gateway, setGateway] = useState<IoTGateway | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    connected: false,
  });

  const [formData, setFormData] = useState<IoTGatewayUpdate>({
    name: '',
    description: '',
    api_url: '',
    api_key: '',
  });

  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch gateway details
  const fetchGateway = async () => {
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

      // Initialize form with current values
      setFormData({
        name: data.name,
        description: data.description || '',
        api_url: data.api_url,
        api_key: data.api_key,
      });

      console.log('Fetched gateway:', data);

      // Check connection status if active
      if (data.is_active) {
        checkConnection(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Check connection to Home Assistant
  const checkConnection = async (gateway: IoTGateway) => {
    try {
      // Simple connection check via REST API
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
      } else {
        setConnectionInfo({ connected: false });
      }
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionInfo({ connected: false });
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
      setGateway(updatedGateway);

      if (updatedGateway.is_active) {
        checkConnection(updatedGateway);
        setSuccess('Integration connected successfully');
      } else {
        setConnectionInfo({ connected: false });
        setSuccess('Integration disconnected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Save changes
  const handleSave = async () => {
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
      setGateway(updatedGateway);
      setSuccess('Integration settings updated successfully');

      // Check connection with new settings
      if (updatedGateway.is_active) {
        checkConnection(updatedGateway);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchGateway();
  }, []);

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
    <ScrollView className="flex-1 bg-background-50">
      <VStack className="p-4" space="md">
        <Card className="bg-background-0">
          <VStack className="p-4" space="md">
            <Heading size="xl">Connection Details</Heading>

            {/* Connection Status */}
            <Card className="bg-background-50 p-4">
              <HStack className="mb-3 items-center justify-between">
                <Text className="font-semibold">Status</Text>
                <Badge
                  variant="solid"
                  action={connectionInfo.connected ? 'success' : 'error'}
                  className="px-2">
                  <Icon
                    as={connectionInfo.connected ? CheckCircle : AlertCircle}
                    size="xs"
                    className="mr-1"
                  />
                  <Text size="xs" className="text-white">
                    {connectionInfo.connected ? 'Connected' : 'Disconnected'}
                  </Text>
                </Badge>
              </HStack>

              <Button
                variant="solid"
                action={gateway.is_active ? 'negative' : 'positive'}
                onPress={toggleGatewayStatus}
                className="w-full">
                <ButtonIcon as={gateway.is_active ? PowerOff : Power} className="mr-2" />
                <ButtonText className="text-white">
                  {gateway.is_active ? 'Disconnect' : 'Connect'}
                </ButtonText>
              </Button>
            </Card>

            {error && (
              <Alert action="error">
                <AlertIcon as={AlertCircle} />
                <AlertText>{error}</AlertText>
              </Alert>
            )}

            {success && (
              <Alert action="success">
                <AlertIcon as={CheckCircle} />
                <AlertText>{success}</AlertText>
              </Alert>
            )}

            {/* Edit Form */}
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
                      <InputIcon as={showApiKey ? EyeOff : Eye} className="text-background-500" />
                    </Pressable>
                  </InputSlot>
                </Input>
              </FormControl>

              <Button
                variant="solid"
                action="positive"
                onPress={handleSave}
                isDisabled={isSaving}
                className="w-full bg-success-300">
                <ButtonText className="text-white">Save</ButtonText>
                <ButtonIcon as={Check} className="mr-2 text-white" />
              </Button>
            </VStack>
          </VStack>
        </Card>
      </VStack>
    </ScrollView>
  );
}
