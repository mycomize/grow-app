import { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Keyboard } from 'react-native';
import { useUnifiedToast } from '~/components/ui/unified-toast';

import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import {
  IoTGateway,
  IoTGatewayUpdate,
  IoTGatewayCreate,
  IoTEntity,
  IoTEntityCreate,
  HAState,
  gatewayTypes,
} from '~/lib/iot';
import {
  getUserPreferences,
  updateIoTFilterPreferences,
  IoTFilterPreferences,
} from '~/lib/userPreferences';

interface ConnectionInfo {
  status: 'connected' | 'connecting' | 'disconnected';
  version?: string;
  config?: any;
}

const createEmptyGateway = (): IoTGatewayUpdate => ({
  name: '',
  description: '',
  api_url: '',
  api_key: '',
});

const createEmptyGatewayForNew = (): IoTGatewayCreate => ({
  name: '',
  type: gatewayTypes.HASS,
  description: '',
  api_url: '',
  api_key: '',
  is_active: true,
});

interface UseIoTGatewayFormLogicProps {
  gatewayId?: string;
}

export function useIoTGatewayFormLogic({ gatewayId }: UseIoTGatewayFormLogicProps = {}) {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  // Basic gateway state
  const [gateway, setGateway] = useState<IoTGateway | null>(null);
  const [formData, setFormData] = useState<IoTGatewayUpdate>(createEmptyGateway());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Connection state
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: 'disconnected',
  });
  const [stateCount, setEntityCount] = useState(0);

  // Control state
  const [enabledStates, setEnabledStates] = useState<string[]>([]);
  const [currentStates, setCurrentStates] = useState<HAState[]>([]);
  const [isControlling, setIsControlling] = useState<Set<string>>(new Set());
  const [pendingValues, setPendingValues] = useState<Record<string, string>>({});

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

  // Keyboard visibility tracking
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getUserPreferences();
      setFilterPreferences(prefs.iotFilters);
    };
    loadPreferences();
  }, []);

  // Fetch enabled entities from backend
  const fetchEnabledEntities = useCallback(
    async (gatewayData?: IoTGateway) => {
      if (!gatewayId || !token || gatewayId === 'new') return;

      try {
        const entities: IoTEntity[] = await apiClient.getIoTEntities(gatewayId as string, token);
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
    [gatewayId, token, router]
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
          showError('Invalid API token');
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
          showError('Invalid API token');
        } else {
          showError('Failed to fetch states');
        }
      }
    } catch (err) {
      console.error('Failed to fetch states:', err);
      showError('Failed to connect to Home Assistant');
    }
  };

  // Fetch gateway details
  const fetchGateway = useCallback(async () => {
    if (!gatewayId || !token) return;

    if (gatewayId === 'new') {
      setIsLoading(false);
      return;
    }

    try {
      const data: IoTGateway = await apiClient.getIoTGateway(gatewayId as string, token);
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
      showError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [gatewayId, token, router, fetchEnabledEntities]);

  // Load states when gateway becomes active
  useEffect(() => {
    if (gateway && gateway.is_active && states.length === 0) {
      fetchStates(gateway);
    }
  }, [gateway]);

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

  // Update form field
  const updateFormField = (field: keyof IoTGatewayUpdate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  // Test connection manually
  const testConnection = async () => {
    if (!gateway) return;

    setIsTestingConnection(true);

    try {
      setConnectionInfo({ status: 'connecting' });
      await checkHomeAssistantConnection(gateway);
      if (connectionInfo.status === 'connected') {
        showSuccess('Connection test successful!');
      } else {
        showError('Connection test failed. Please check your settings.');
      }
    } catch (err) {
      showError('Connection test failed. Please check your settings.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Toggle gateway active status
  const toggleGatewayStatus = async () => {
    if (!gateway || !token) return;

    try {
      const updatedGateway: IoTGateway = gateway.is_active
        ? await apiClient.disableIoTGateway(gatewayId as string, token)
        : await apiClient.enableIoTGateway(gatewayId as string, token);

      setGateway({
        ...updatedGateway,
        created_at: new Date(updatedGateway.created_at),
      });

      if (updatedGateway.is_active) {
        checkHomeAssistantConnection(updatedGateway);
        showSuccess('Integration connected successfully');
      } else {
        setConnectionInfo({ status: 'disconnected' });
        showSuccess('Integration disconnected');
      }
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      showError(err instanceof Error ? err.message : 'An error occurred');
    }
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
        showError('Failed to control entity');
      }
    } catch (err) {
      showError('Failed to control entity');
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
      showError('Failed to add entity: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
      showError(
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

  // Delete gateway
  const deleteGateway = async () => {
    if (!gatewayId || gatewayId === 'new' || !token) return;

    setIsDeleting(true);

    try {
      await apiClient.deleteIoTGateway(gatewayId, token);

      showSuccess('IoT Gateway deleted successfully!');
      setShowDeleteModal(false);

      // Navigate back to IoT list after a brief delay
      setTimeout(() => {
        router.replace('/iot');
      }, 1000);
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

  // Save gateway
  const saveGateway = async () => {
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

    if (!token) {
      showError('Authentication required');
      return;
    }

    setIsSaving(true);

    try {
      const isEdit = gatewayId && gatewayId !== 'new';

      if (isEdit) {
        // Update existing gateway
        const updatedGateway: IoTGateway = await apiClient.updateIoTGateway(
          gatewayId,
          formData,
          token
        );

        setGateway({
          ...updatedGateway,
          created_at: new Date(updatedGateway.created_at),
        });
        showSuccess('Settings updated successfully');

        // Check connection with new settings
        if (updatedGateway.is_active) {
          checkHomeAssistantConnection(updatedGateway);
        }
      } else {
        // Create new gateway
        const createData: IoTGatewayCreate = {
          name: formData.name!,
          description: formData.description || '',
          api_url: formData.api_url!,
          api_key: formData.api_key!,
          type: gatewayTypes.HASS,
          is_active: true,
        };

        await apiClient.createIoTGateway(createData, token);
        showSuccess('IoT Gateway created successfully!');

        // Navigate back to IoT list after a brief delay
        setTimeout(() => {
          router.replace('/iot');
        }, 1500);
      }
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

  return {
    // Basic gateway state
    gateway,
    formData,
    isLoading,
    isRefreshing,
    isSaving,
    isDeleting,
    showDeleteModal,
    keyboardVisible,

    // Edit mode state
    isEditing,
    isTestingConnection,
    showApiKey,

    // Connection state
    connectionInfo,
    stateCount,

    // Control state
    enabledStates,
    currentStates,
    isControlling,
    pendingValues,

    // Control selection state
    states,
    searchQuery,
    enabledEntities,
    enabledEntitiesSet,
    filterEnabled,
    filterPreferences,
    showFilters,

    // Functions
    updateFormField,
    toggleApiKeyVisibility,
    testConnection,
    toggleGatewayStatus,
    handleToggle,
    handleNumberChange,
    adjustNumberValue,
    saveNumberValue,
    handleEntityToggle,
    toggleDomainFilter,
    toggleShowAllDomains,
    deleteGateway,
    saveGateway,

    // State setters
    setSearchQuery: setSearchQuery,
    setFilterEnabled,
    setShowFilters,
    setShowDeleteModal,
  };
}
