import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { IoTGateway, IoTGatewayUpdate } from '~/lib/iot';
import { ConnectionInfo } from '~/lib/iotTypes';

export function useHAConnectionManager() {
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: 'disconnected',
  });

  // Check Home Assistant connection via REST API
  const checkHomeAssistantConnection = async (
    gatewayOrFormData: IoTGateway | IoTGatewayUpdate
  ): Promise<boolean> => {
    try {
      const apiUrl = gatewayOrFormData.api_url;
      const apiKey = gatewayOrFormData.api_key;

      if (!apiUrl || !apiKey) {
        setConnectionInfo({ status: 'disconnected' });
        showError('URL and API token are required');
        return false;
      }

      // Measure latency
      const startTime = Date.now();

      // Try to get config info from Home Assistant
      const response = await fetch(`${apiUrl}/api/config`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok) {
        const data = await response.json();

        setConnectionInfo({
          status: 'connected',
          version: data.version,
          config: data,
          latency: latency,
        });
        return true;
      } else {
        setConnectionInfo({ status: 'disconnected' });
        if (response.status === 401) {
          router.replace('/login');
        } else {
          showError('Failed to connect to Home Assistant');
        }
        return false;
      }
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionInfo({ status: 'disconnected' });
      showError('Connection failed. Please check your URL and network connection.');
      return false;
    }
  };

  // Test connection manually
  const testConnection = async (
    formData: IoTGatewayUpdate,
    gateway?: IoTGateway | null,
    setIsTestingConnection?: (value: boolean) => void,
    onConnectionSuccess?: (connectionData: IoTGateway | IoTGatewayUpdate) => void
  ) => {
    if (!formData.api_url?.trim() || !formData.api_key?.trim()) {
      showError('URL and API token are required for connection test');
      return;
    }

    setIsTestingConnection?.(true);

    try {
      setConnectionInfo({ status: 'connecting' });
      // Use form data if no gateway exists yet, otherwise use gateway
      const connectionData = gateway || formData;
      const success = await checkHomeAssistantConnection(connectionData);

      if (success) {
        showSuccess('Connection test successful!');
        // Call the success callback if provided
        onConnectionSuccess?.(connectionData);
      }
    } catch (err) {
      showError('Connection test failed. Please check your settings.');
      setConnectionInfo({ status: 'disconnected' });
    } finally {
      setIsTestingConnection?.(false);
    }
  };

  return {
    // State
    connectionInfo,

    // Actions
    setConnectionInfo,
    checkHomeAssistantConnection,
    testConnection,
  };
}
