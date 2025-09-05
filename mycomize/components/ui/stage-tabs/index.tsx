import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Package, Thermometer, CheckSquare, FileText } from 'lucide-react-native';

// Import tek components
import { ItemsList } from '~/components/tek/ItemsList';
import { EnvironmentalConditionsList } from '~/components/tek/EnvironmentalConditionsList';
import { TasksList } from '~/components/tek/TasksList';
import { StageNotes } from '~/components/tek/StageNotes';

// Import tek types
import { BulkStageData } from '~/lib/types/tekTypes';
import { BulkGrowComplete } from '~/lib/types/growTypes';
import { StageIoTData } from '~/lib/types/iotTypes';

type TabType = 'items' | 'conditions' | 'tasks' | 'notes';

interface StageTabsProps {
  stageData?: BulkStageData;
  onUpdateBulkStageData?: (stageData: BulkStageData) => void;
  grow?: BulkGrowComplete; // Grow data for calendar integration and IoT
  stageName?: string; // Stage name for calendar integration
  stageStartDate?: string; // Stage start date for calendar integration
  stageIoTData?: StageIoTData; // Pre-computed IoT data for this stage
  readOnly?: boolean; // Whether the component should be read-only (used in view-only contexts)
}

export const StageTabs: React.FC<StageTabsProps> = ({
  stageData,
  onUpdateBulkStageData,
  grow,
  stageName,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('items');

  // Initialize empty stage data if not provided
  const defaultBulkStageData: BulkStageData = {
    items: [],
    environmental_conditions: [],
    tasks: [],
    notes: '',
  };

  const currentBulkStageData = stageData || defaultBulkStageData;

  const handleUpdateItems = (items: typeof currentBulkStageData.items) => {
    if (onUpdateBulkStageData && !readOnly) {
      onUpdateBulkStageData({
        ...currentBulkStageData,
        items,
      });
    }
  };

  const handleUpdateConditions = (
    environmental_conditions: typeof currentBulkStageData.environmental_conditions
  ) => {
    if (onUpdateBulkStageData && !readOnly) {
      onUpdateBulkStageData({
        ...currentBulkStageData,
        environmental_conditions,
      });
    }
  };


  const handleUpdateNotes = (notes: string) => {
    if (onUpdateBulkStageData && !readOnly) {
      onUpdateBulkStageData({
        ...currentBulkStageData,
        notes,
      });
    }
  };

  const tabs = [
    { id: 'items' as TabType, icon: Package },
    { id: 'conditions' as TabType, icon: Thermometer },
    { id: 'tasks' as TabType, icon: CheckSquare },
    { id: 'notes' as TabType, icon: FileText },
  ];

  return (
    <VStack space="md">
      {/* Tab Buttons */}
      <HStack space="xs" className="mb-1 justify-center">
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
      <VStack space="md" className="mb-1">
        {activeTab === 'items' && (
          <ItemsList 
            items={currentBulkStageData.items} 
            onUpdateItems={handleUpdateItems}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'conditions' && (
          <EnvironmentalConditionsList
            conditions={currentBulkStageData.environmental_conditions}
            onUpdateConditions={handleUpdateConditions}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksList
            stageKey={stageName || 'inoculation'}
            context={grow ? 'grow' : 'tek'}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'notes' && (
          <StageNotes 
            notes={currentBulkStageData.notes} 
            onUpdateNotes={handleUpdateNotes}
            readOnly={readOnly}
          />
        )}
      </VStack>
    </VStack>
  );
};
