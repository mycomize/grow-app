import { useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AuthContext } from '~/lib/AuthContext';
import { useFormState } from './useFormState';
import { useHAConnectionManager } from './useHAConnectionManager';
import { useHAEntityManager } from './useHAEntityManager';
import { useHAFilterManager } from './useHAFilterManager';
import { useHAEntityLinkingManager } from './useHAEntityLinkingManager';
import { useHAGatewayOperations } from './useHAGatewayOperations';
import { useUtilities } from './useUtilities';

interface UseIoTGatewayFormLogicProps {
  gatewayId?: string;
}

/**
 * Main orchestrator hook for IoT Gateway form functionality
 *
 * This hook follows a modular architecture where complex functionality is broken down
 * into specialized hooks, each responsible for a specific domain of concern:
 *
 * formState: Manages form data, validation, and UI state
 * connectionManager: Handles Home Assistant connection testing and status
 * entityManager: Manages both HA entities (from HA API) and DB entities (from backend)
 * filterManager: Controls entity filtering by domain and device class
 * linkingManager: Handles entity-to-grow linking operations and grow data
 * gatewayOperations: CRUD operations for gateway management
 * utilities: Shared utilities like keyboard visibility detection
 *
 * @param gatewayId Optional gateway ID for editing existing gateways
 * @returns Comprehensive state and functions for IoT gateway management
 */
export function useIoTGatewayFormLogic({ gatewayId }: UseIoTGatewayFormLogicProps = {}) {
  const { token: appAuthToken } = useContext(AuthContext);
  const router = useRouter();

  // Authentication guard - redirect to login if no token
  if (!appAuthToken) {
    router.replace('/login');
  }

  // Initialize all modular hooks
  const formState = useFormState();
  const connectionManager = useHAConnectionManager();
  const entityManager = useHAEntityManager(appAuthToken || null, gatewayId === 'new');
  const filterManager = useHAFilterManager();
  const linkingManager = useHAEntityLinkingManager(appAuthToken || null);
  const gatewayOperations = useHAGatewayOperations(appAuthToken || null);
  const utilities = useUtilities();

  // Single effect to fetch entities once on mount for existing gateways (only if credentials exist)
  useEffect(() => {
    if (formState.gateway && gatewayId && gatewayId !== 'new') {
      // For existing gateways, only fetch if api_url and api_key are available
      if (formState.gateway.api_url && formState.gateway.api_key) {
        console.log('[useIoTGatewayFormLogic] Fetching entities on mount for existing gateway');
        entityManager.fetchHaEntities(formState.gateway);
        entityManager.fetchDbEntities(gatewayId);
      } else {
        console.log('[useIoTGatewayFormLogic] Skipping entity fetch - missing credentials');
        // Still fetch DB entities even if HA credentials are missing
        entityManager.fetchDbEntities(gatewayId);
      }
    }
  }, [formState.gateway?.id]); // Only depend on gateway.id to fetch once when gateway is loaded

  // Load gateway data on component mount - only run once per gatewayId
  useEffect(() => {
    if (!gatewayId) return;

    if (gatewayId === 'new') {
      // For new gateways, just set loading to false since no data needs to be fetched
      formState.setIsLoading(false);
      return;
    }

    console.log('[useIoTGatewayFormLogic] Initializing gateway data on mount');
    gatewayOperations.fetchGateway(
      gatewayId,
      formState.setIsLoading,
      formState.setIsRefreshing,
      formState.initializeFormFromGateway,
      // Wrap checkHomeAssistantConnection to match expected signature
      async (gateway) => {
        await connectionManager.checkHomeAssistantConnection(gateway);
      },
      // Don't fetch entities here - handled by dedicated effect above
      async () => {}
    );
  }, [gatewayId]); // Only depend on gatewayId to run once per gateway

  // Load available grows for entity linking functionality on mount
  useEffect(() => {
    linkingManager.fetchGrows();
  }, []);

  // Test connection to Home Assistant API and fetch entities on successful connection
  // Validates credentials and connectivity before allowing save operation
  const testConnection = useCallback(async () => {
    await connectionManager.testConnection(
      formState.formData,
      formState.gateway,
      formState.setIsTestingConnection,
      // Callback for successful connection - fetch HA entities
      (connectionData) => {
        console.log(
          '[useIoTGatewayFormLogic] Fetching HA entities after successful connection test'
        );
        entityManager.fetchHaEntities(connectionData);
      }
    );
  }, [
    connectionManager.testConnection,
    formState.formData,
    formState.gateway,
    formState.setIsTestingConnection,
    entityManager.fetchHaEntities,
  ]);

  // Save gateway configuration (handles both create and update operations)
  // After successful save, syncs DB entities to ensure IoT entities are stored in backend
  const saveGateway = useCallback(async () => {
    await gatewayOperations.saveGateway(
      gatewayId,
      formState.formData,
      formState.setIsSaving,
      formState.setGateway,
      entityManager.syncDbEntities
    );
  }, [
    gatewayOperations.saveGateway,
    gatewayId,
    formState.formData,
    formState.setIsSaving,
    formState.setGateway,
    entityManager.syncDbEntities,
  ]);

  // Delete gateway and navigate away (only available for existing gateways)
  const deleteGateway = useCallback(async () => {
    if (gatewayId) {
      await gatewayOperations.deleteGateway(gatewayId, formState.setIsDeleting);
    }
  }, [gatewayOperations.deleteGateway, gatewayId, formState.setIsDeleting]);

  // Refresh entities after successful linking operation
  const refreshEntitiesAfterLinking = useCallback(async () => {
    if (formState.gateway) {
      await entityManager.fetchDbEntities(formState.gateway.id.toString());
    }
  }, [entityManager.fetchDbEntities, formState.gateway]);

  // Link multiple entities to a grow stage simultaneously
  // Optimized for bulk operations to reduce API calls and improve UX
  const handleBulkLink = useCallback(
    async (entityIds: string[], growId: number, stage: string) => {
      if (formState.gateway) {
        const success = await linkingManager.handleBulkLink(
          formState.gateway,
          entityManager.dbEntities,
          entityIds,
          growId,
          stage
        );
        if (success) {
          await refreshEntitiesAfterLinking();
        }
      }
    },
    [
      formState.gateway,
      linkingManager.handleBulkLink,
      entityManager.dbEntities,
      refreshEntitiesAfterLinking,
    ]
  );

  // Link a single entity to a grow stage with immediate UI feedback
  const handleIndividualLink = useCallback(
    async (entityId: string, growId: number, stage: string) => {
      if (formState.gateway) {
        const success = await linkingManager.handleIndividualLink(
          formState.gateway,
          entityManager.dbEntities,
          entityId,
          growId,
          stage
        );
        if (success) {
          await refreshEntitiesAfterLinking();
        }
      }
    },
    [
      formState.gateway,
      linkingManager.handleIndividualLink,
      entityManager.dbEntities,
      refreshEntitiesAfterLinking,
    ]
  );

  // Unlink multiple entities from their grows simultaneously
  const handleBulkUnlink = useCallback(
    async (entityIds: string[]) => {
      if (formState.gateway) {
        const success = await linkingManager.handleBulkUnlink(
          formState.gateway,
          entityManager.dbEntities,
          entityIds
        );
        if (success) {
          await refreshEntitiesAfterLinking();
        }
      }
    },
    [
      formState.gateway,
      linkingManager.handleBulkUnlink,
      entityManager.dbEntities,
      refreshEntitiesAfterLinking,
    ]
  );

  // Unlink a single entity from its grow with immediate UI feedback
  const handleIndividualUnlink = useCallback(
    async (entityId: string) => {
      if (formState.gateway) {
        const success = await linkingManager.handleIndividualUnlink(
          formState.gateway,
          entityManager.dbEntities,
          entityId
        );
        if (success) {
          await refreshEntitiesAfterLinking();
        }
      }
    },
    [
      formState.gateway,
      linkingManager.handleIndividualUnlink,
      entityManager.dbEntities,
      refreshEntitiesAfterLinking,
    ]
  );

  return {
    // Basic gateway state from formState
    gateway: formState.gateway,
    formData: formState.formData,
    isLoading: formState.isLoading,
    isRefreshing: formState.isRefreshing,
    isSaving: formState.isSaving,
    isDeleting: formState.isDeleting,
    showDeleteModal: formState.showDeleteModal,
    keyboardVisible: utilities.keyboardVisible,

    // Edit mode state from formState
    isEditing: formState.isEditing,
    isTestingConnection: formState.isTestingConnection,
    showApiKey: formState.showApiKey,

    // Connection state from connectionManager
    connectionInfo: connectionManager.connectionInfo,

    // Entity state from entityManager
    linkableEntities: entityManager.linkableEntities,
    linkedEntities: entityManager.linkedEntities,

    // Filter state from filterManager
    filterEnabled: filterManager.filterEnabled,
    filterPreferences: filterManager.filterPreferences,
    showDomainFilters: filterManager.showDomainFilters,
    showDeviceClassFilters: filterManager.showDeviceClassFilters,

    // Linking state from linkingManager
    grows: linkingManager.grows,

    // Functions from formState
    updateFormField: formState.updateFormField,
    toggleApiKeyVisibility: formState.toggleApiKeyVisibility,

    // Functions from connectionManager
    testConnection,

    // Functions from filterManager
    toggleDomainFilter: filterManager.toggleDomainFilter,
    toggleShowAllDomains: filterManager.toggleShowAllDomains,
    toggleDeviceClassFilter: filterManager.toggleDeviceClassFilter,
    toggleShowAllDeviceClasses: filterManager.toggleShowAllDeviceClasses,

    // Enhanced functions that integrate multiple modules
    handleBulkLink,
    handleIndividualLink,
    handleBulkUnlink,
    handleIndividualUnlink,
    deleteGateway,
    saveGateway,

    // State setters from entityManager and filterManager
    setFilterEnabled: filterManager.setFilterEnabled,
    setShowDomainFilters: filterManager.setShowDomainFilters,
    setShowDeviceClassFilters: filterManager.setShowDeviceClassFilters,
    setShowDeleteModal: formState.setShowDeleteModal,
  };
}
