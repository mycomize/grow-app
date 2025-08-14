import { useRouter } from 'expo-router';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { IoTGateway, IoTGatewayUpdate, IoTGatewayCreate, gatewayTypes } from '~/lib/iot';

export function useHAGatewayOperations(appAuthToken: string | null) {
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  // Delete gateway
  const deleteGateway = async (gatewayId: string, setIsDeleting: (value: boolean) => void) => {
    if (!gatewayId || gatewayId === 'new' || !appAuthToken) return;

    setIsDeleting(true);

    try {
      await apiClient.deleteIoTGateway(gatewayId, appAuthToken);

      showSuccess('IoT Gateway deleted successfully!');

      // Navigate back to IoT list after a brief delay
      setTimeout(() => {
        router.replace('/iot');
      }, 100);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      showError(err instanceof Error ? err.message : 'Failed to delete gateway');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save gateway (create or update)
  const saveGateway = async (
    gatewayId: string | undefined,
    formData: IoTGatewayUpdate,
    setIsSaving: (value: boolean) => void,
    setGateway?: (gateway: IoTGateway) => void,
    syncDbEntities?: (savedGateway: IoTGateway) => Promise<void>
  ) => {
    if (!appAuthToken) {
      router.replace('/login');
      return;
    }

    // Basic validation
    if (!formData.name?.trim()) {
      showError('Gateway name is required');
      return;
    }

    if (!formData.api_url?.trim()) {
      showError('Home Assistant URL is required');
      return;
    }

    if (!formData.api_key?.trim()) {
      showError('API Token is required');
      return;
    }

    setIsSaving(true);

    try {
      const isEdit = gatewayId && gatewayId !== 'new';

      let savedGateway: IoTGateway;

      if (isEdit) {
        // Update existing gateway
        savedGateway = await apiClient.updateIoTGateway(gatewayId, formData, appAuthToken);

        if (setGateway) {
          setGateway({
            ...savedGateway,
            created_at: new Date(savedGateway.created_at),
          });
        }
        showSuccess('IoT Gateway saved successfully');
      } else {
        // Create new gateway
        const createData: IoTGatewayCreate = {
          name: formData.name!,
          description: formData.description || '',
          api_url: formData.api_url!,
          api_key: formData.api_key!,
          type: gatewayTypes.HASS,
        };

        savedGateway = await apiClient.createIoTGateway(createData, appAuthToken);
        showSuccess('IoT Gateway created successfully!');
      }

      // Sync entities after successful gateway save
      if (syncDbEntities) {
        await syncDbEntities(savedGateway);
      }

      // Navigate back to IoT list after a brief delay
      setTimeout(() => {
        router.replace('/iot');
      }, 100);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      showError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch gateway details
  const fetchGateway = async (
    gatewayId: string | undefined,
    setIsLoading: (value: boolean) => void,
    setIsRefreshing: (value: boolean) => void,
    initializeFormFromGateway: (gateway: IoTGateway) => void,
    checkHomeAssistantConnection: (gateway: IoTGateway) => Promise<void>,
    fetchDbEntities: (gatewayId: string) => Promise<void>
  ) => {
    if (!gatewayId || !appAuthToken) return;

    if (gatewayId === 'new') {
      setIsLoading(false);
      return;
    }

    try {
      const data: IoTGateway = await apiClient.getIoTGateway(gatewayId, appAuthToken);

      // Initialize form data
      initializeFormFromGateway(data);

      // Check Home Assistant connection
      await checkHomeAssistantConnection(data);

      // Fetch db entities
      await fetchDbEntities(data.id.toString());
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      showError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  return {
    deleteGateway,
    saveGateway,
    fetchGateway,
  };
}
