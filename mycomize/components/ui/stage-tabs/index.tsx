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

// Import grow components
import { IotControlsList } from '~/components/grow/IotControlsList';

// Import tek types
import { BulkStageData } from '~/lib/tekTypes';
import { BulkGrowComplete, bulkGrowStages } from '~/lib/growTypes';
import { IoTEntity, IoTGateway } from '~/lib/iot';
import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { useUnifiedToast } from '~/components/ui/unified-toast';

type TabType = 'items' | 'conditions' | 'tasks' | 'notes' | 'iot';

interface StageIoTData {
  entities: IoTEntity[];
  gateways: IoTGateway[];
  entityStates: Record<string, string>;
  loading: boolean;
}

interface StageTabsProps {
  stageData?: BulkStageData;
  onUpdateBulkStageData?: (stageData: BulkStageData) => void;
  grow?: BulkGrowComplete; // Grow data for calendar integration and IoT
  stageName?: string; // Stage name for calendar integration
  stageStartDate?: string; // Stage start date for calendar integration
  stageIoTData?: StageIoTData; // Pre-computed IoT data for this stage
}

export const StageTabs: React.FC<StageTabsProps> = ({
  stageData,
  onUpdateBulkStageData,
  grow,
  stageName,
  stageStartDate,
  stageIoTData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

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

  const tabs = [
    { id: 'items' as TabType, icon: Package },
    { id: 'conditions' as TabType, icon: Thermometer },
    { id: 'tasks' as TabType, icon: CheckSquare },
    { id: 'notes' as TabType, icon: FileText },
    // Only show IoT tab for actual grows (when grow prop exists and has an ID)
    ...(grow?.id ? [{ id: 'iot' as TabType, icon: CircuitBoard }] : []),
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
        {activeTab === 'iot' && grow?.id && stageIoTData && (
          <IotControlsList
            entities={stageIoTData.entities}
            gateways={stageIoTData.gateways}
            entityStates={stageIoTData.entityStates}
            loading={stageIoTData.loading}
          />
        )}
      </VStack>
    </VStack>
  );
};
