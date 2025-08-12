import React, { useState, useEffect, useContext, useCallback } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Package, Thermometer, CheckSquare, FileText, CircuitBoard } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Import tek components
import { ItemsList } from '~/components/tek/ItemsList';
import { EnvironmentalConditionsList } from '~/components/tek/EnvironmentalConditionsList';
import { TasksList } from '~/components/tek/TasksList';
import { StageNotes } from '~/components/tek/StageNotes';
import { StageIoTControls } from '~/components/tek/StageIoTControls';

// Import tek types
import { BulkStageData } from '~/lib/tekTypes';
import { BulkGrowComplete, bulkGrowStages } from '~/lib/growTypes';
import { IoTEntity } from '~/lib/iot';
import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { useUnifiedToast } from '~/components/ui/unified-toast';

type TabType = 'items' | 'conditions' | 'tasks' | 'notes' | 'iot';

interface StageTabsProps {
  stageData?: BulkStageData;
  onUpdateBulkStageData?: (stageData: BulkStageData) => void;
  grow?: BulkGrowComplete; // Grow data for calendar integration and IoT
  stageName?: string; // Stage name for calendar integration
  stageStartDate?: string; // Stage start date for calendar integration
}

export const StageTabs: React.FC<StageTabsProps> = ({
  stageData,
  onUpdateBulkStageData,
  grow,
  stageName,
  stageStartDate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  // IoT Controls state
  const [linkedControls, setLinkedControls] = useState<IoTEntity[]>([]);
  const [availableControls, setAvailableControls] = useState<IoTEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingControls, setIsLoadingControls] = useState(false);

  // Initialize empty stage data if not provided
  const defaultBulkStageData: BulkStageData = {
    items: [],
    environmental_conditions: [],
    tasks: [],
    notes: '',
  };

  const currentBulkStageData = stageData || defaultBulkStageData;

  const handleUpdateItems = (items: typeof currentBulkStageData.items) => {
    if (onUpdateBulkStageData) {
      onUpdateBulkStageData({
        ...currentBulkStageData,
        items,
      });
    }
  };

  const handleUpdateConditions = (
    environmental_conditions: typeof currentBulkStageData.environmental_conditions
  ) => {
    if (onUpdateBulkStageData) {
      onUpdateBulkStageData({
        ...currentBulkStageData,
        environmental_conditions,
      });
    }
  };

  const handleUpdateTasks = (tasks: typeof currentBulkStageData.tasks) => {
    if (onUpdateBulkStageData) {
      onUpdateBulkStageData({
        ...currentBulkStageData,
        tasks,
      });
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (onUpdateBulkStageData) {
      onUpdateBulkStageData({
        ...currentBulkStageData,
        notes,
      });
    }
  };

  // Get stage key from stage name for API calls
  const getStageKey = (stageNameParam?: string): string => {
    if (!stageNameParam) return bulkGrowStages.INOCULATION;

    const stageMap: Record<string, string> = {
      Inoculation: bulkGrowStages.INOCULATION,
      'Spawn Colonization': bulkGrowStages.SPAWN_COLONIZATION,
      'Bulk Colonization': bulkGrowStages.BULK_COLONIZATION,
      Fruiting: bulkGrowStages.FRUITING,
      Harvest: bulkGrowStages.HARVEST,
    };

    return stageMap[stageNameParam] || bulkGrowStages.INOCULATION;
  };

  // Fetch all IoT entities from all gateways to build available controls list
  const fetchAvailableControls = useCallback(async () => {
    if (!token) return [];

    try {
      // First, get all gateways that the user has access to
      const allGateways = await apiClient.get('/iot-gateways/', token);
      const allAvailableControls: IoTEntity[] = [];

      // Fetch entities from each gateway
      for (const gateway of allGateways) {
        try {
          const gatewayEntities: IoTEntity[] = await apiClient.getIoTEntities(
            gateway.id.toString(),
            token
          );

          // Only include enabled entities
          const enabledEntities = gatewayEntities.filter((entity) => entity.is_enabled === 'true');

          allAvailableControls.push(...enabledEntities);
        } catch (err) {
          console.warn(`Failed to fetch entities from gateway ${gateway.id}:`, err);
          // Continue with other gateways
        }
      }

      console.log('Fetched available controls:', allAvailableControls.length);
      return allAvailableControls;
    } catch (err) {
      console.error('Failed to fetch available controls:', err);
      return [];
    }
  }, [token]);

  // Fetch linked controls for current stage
  const fetchLinkedControls = useCallback(async () => {
    if (!grow?.id || !stageName || !token) return [];

    try {
      // Fetch fresh grow data to get updated entity links
      const freshGrowData: BulkGrowComplete = await apiClient.getBulkGrow(
        grow.id.toString(),
        token
      );

      const stageKey = getStageKey(stageName);
      console.log('Stage key:', stageKey, 'for stage name:', stageName);
      console.log('Fresh grow iot_entities:', freshGrowData.iot_entities?.length || 0);

      if (!freshGrowData.iot_entities) return [];

      // Filter entities linked to current grow and stage
      const linkedForStage = freshGrowData.iot_entities.filter(
        (entity) => entity.linked_grow_id === grow.id && entity.linked_stage === stageKey
      );

      console.log('Linked controls for stage:', linkedForStage.length);
      return linkedForStage;
    } catch (err) {
      console.error('Failed to fetch fresh grow data:', err);
      // Fallback to using the passed grow prop
      if (grow?.iot_entities) {
        const stageKey = getStageKey(stageName);
        return grow.iot_entities.filter(
          (entity) => entity.linked_grow_id === grow.id && entity.linked_stage === stageKey
        );
      }
      return [];
    }
  }, [grow?.id, stageName, token]);

  // Load controls data
  const loadControlsData = useCallback(async () => {
    setIsLoadingControls(true);

    try {
      const [linked, available] = await Promise.all([
        fetchLinkedControls(),
        fetchAvailableControls(),
      ]);

      setLinkedControls(linked);

      // Filter out already linked controls from available
      const unlinkedControls = available.filter(
        (control) => !linked.some((linkedControl) => linkedControl.id === control.id)
      );
      setAvailableControls(unlinkedControls);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Failed to load controls data:', err);
      showError('Failed to load IoT controls data');
    } finally {
      setIsLoadingControls(false);
    }
  }, [fetchLinkedControls, fetchAvailableControls, router, showError]);

  // Load controls when IoT tab becomes active or grow data changes
  useEffect(() => {
    if (activeTab === 'iot' && grow && token) {
      loadControlsData();
    }
  }, [activeTab, grow, token]);

  // Handle linking a control to current grow and stage
  const handleLinkControl = async (controlId: number) => {
    if (!grow || !stageName || !token) {
      showError('Missing required data for linking control');
      return;
    }

    try {
      // Find the control to link
      const controlToLink = availableControls.find((control) => control.id === controlId);
      if (!controlToLink) {
        showError('Control not found');
        return;
      }

      const stageKey = getStageKey(stageName);

      // Call API to link entity
      await apiClient.linkIoTEntity(
        controlToLink.gateway_id.toString(),
        controlId.toString(),
        grow.id,
        stageKey,
        token
      );

      showSuccess(
        `Successfully linked ${controlToLink.friendly_name || controlToLink.entity_name} to ${stageName}`
      );

      // Refresh controls data
      await loadControlsData();
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Failed to link control:', err);
      showError(
        'Failed to link control: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
    }
  };

  // Handle unlinking a control from current grow and stage
  const handleUnlinkControl = async (controlId: number) => {
    if (!token) {
      showError('Authentication required');
      return;
    }

    try {
      // Find the control to unlink
      const controlToUnlink = linkedControls.find((control) => control.id === controlId);
      if (!controlToUnlink) {
        showError('Control not found');
        return;
      }

      // Call API to remove link
      await apiClient.removeIoTEntityLink(
        controlToUnlink.gateway_id.toString(),
        controlId.toString(),
        token
      );

      showSuccess(
        `Successfully unlinked ${controlToUnlink.friendly_name || controlToUnlink.entity_name}`
      );

      // Refresh controls data
      await loadControlsData();
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Failed to unlink control:', err);
      showError(
        'Failed to unlink control: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
    }
  };

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!grow || !token) return;

    try {
      await loadControlsData();
      showSuccess('IoT controls refreshed');
    } catch (err) {
      console.error('Failed to refresh controls:', err);
      showError('Failed to refresh controls');
    }
  };

  const tabs = [
    { id: 'items' as TabType, icon: Package },
    { id: 'conditions' as TabType, icon: Thermometer },
    { id: 'tasks' as TabType, icon: CheckSquare },
    { id: 'notes' as TabType, icon: FileText },
    { id: 'iot' as TabType, icon: CircuitBoard },
  ];

  return (
    <VStack space="md">
      {/* Tab Buttons */}
      <HStack space="xs" className="mb-2 justify-center">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'solid' : 'outline'}
            size="sm"
            onPress={() => setActiveTab(tab.id)}
            className={`flex-1 ${
              activeTab === tab.id
                ? 'border border-success-400 bg-success-300'
                : 'border-background-300 bg-transparent'
            }`}>
            <Icon
              as={tab.icon}
              size="lg"
              className={activeTab === tab.id ? 'text-white' : 'text-typography-500'}
            />
          </Button>
        ))}
      </HStack>

      {/* Tab Content */}
      <VStack space="md">
        {activeTab === 'items' && (
          <ItemsList items={currentBulkStageData.items} onUpdateItems={handleUpdateItems} />
        )}
        {activeTab === 'conditions' && (
          <EnvironmentalConditionsList
            conditions={currentBulkStageData.environmental_conditions}
            onUpdateConditions={handleUpdateConditions}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksList
            tasks={currentBulkStageData.tasks}
            onUpdateTasks={handleUpdateTasks}
            grow={grow}
            stageName={stageName}
            stageStartDate={stageStartDate}
          />
        )}
        {activeTab === 'notes' && (
          <StageNotes notes={currentBulkStageData.notes} onUpdateNotes={handleUpdateNotes} />
        )}
        {activeTab === 'iot' && (
          <StageIoTControls
            stageId={getStageKey(stageName)}
            stageName={stageName || 'Current Stage'}
            growId={grow?.id}
            linkedControls={linkedControls}
            availableControls={availableControls}
            searchQuery={searchQuery}
            onLinkControl={handleLinkControl}
            onUnlinkControl={handleUnlinkControl}
            onSearchChange={handleSearchChange}
            onRefresh={handleRefresh}
          />
        )}
      </VStack>
    </VStack>
  );
};
