import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Package, Thermometer, CheckSquare, FileText } from 'lucide-react-native';

// Import template components
import { ItemsList } from '~/components/template/ItemsList';
import { EnvironmentalConditionsList } from '~/components/template/EnvironmentalConditionsList';
import { TasksList } from '~/components/template/TasksList';
import { StageNotes } from '~/components/template/StageNotes';

// Import template types
import { StageData } from '~/lib/templateTypes';

type TabType = 'items' | 'conditions' | 'tasks' | 'notes';

interface StageTabsProps {
  stageData?: StageData;
  onUpdateStageData?: (stageData: StageData) => void;
}

export const StageTabs: React.FC<StageTabsProps> = ({ stageData, onUpdateStageData }) => {
  const [activeTab, setActiveTab] = useState<TabType>('items');

  // Initialize empty stage data if not provided
  const defaultStageData: StageData = {
    items: [],
    environmentalConditions: [],
    tasks: [],
    notes: '',
  };

  const currentStageData = stageData || defaultStageData;

  const handleUpdateItems = (items: typeof currentStageData.items) => {
    if (onUpdateStageData) {
      onUpdateStageData({
        ...currentStageData,
        items,
      });
    }
  };

  const handleUpdateConditions = (
    environmentalConditions: typeof currentStageData.environmentalConditions
  ) => {
    if (onUpdateStageData) {
      onUpdateStageData({
        ...currentStageData,
        environmentalConditions,
      });
    }
  };

  const handleUpdateTasks = (tasks: typeof currentStageData.tasks) => {
    if (onUpdateStageData) {
      onUpdateStageData({
        ...currentStageData,
        tasks,
      });
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (onUpdateStageData) {
      onUpdateStageData({
        ...currentStageData,
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
          <ItemsList items={currentStageData.items} onUpdateItems={handleUpdateItems} />
        )}
        {activeTab === 'conditions' && (
          <EnvironmentalConditionsList
            conditions={currentStageData.environmentalConditions}
            onUpdateConditions={handleUpdateConditions}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksList tasks={currentStageData.tasks} onUpdateTasks={handleUpdateTasks} />
        )}
        {activeTab === 'notes' && (
          <StageNotes notes={currentStageData.notes} onUpdateNotes={handleUpdateNotes} />
        )}
      </VStack>
    </VStack>
  );
};
