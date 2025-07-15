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
import { BulkStageData } from '~/lib/tekTypes';

type TabType = 'items' | 'conditions' | 'tasks' | 'notes';

interface StageTabsProps {
  stageData?: BulkStageData;
  onUpdateBulkStageData?: (stageData: BulkStageData) => void;
}

export const StageTabs: React.FC<StageTabsProps> = ({ stageData, onUpdateBulkStageData }) => {
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

  const tabs = [
    { id: 'items' as TabType, icon: Package },
    { id: 'conditions' as TabType, icon: Thermometer },
    { id: 'tasks' as TabType, icon: CheckSquare },
    { id: 'notes' as TabType, icon: FileText },
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
          <TasksList tasks={currentBulkStageData.tasks} onUpdateTasks={handleUpdateTasks} />
        )}
        {activeTab === 'notes' && (
          <StageNotes notes={currentBulkStageData.notes} onUpdateNotes={handleUpdateNotes} />
        )}
      </VStack>
    </VStack>
  );
};
