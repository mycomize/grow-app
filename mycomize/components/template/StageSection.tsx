import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Package, Thermometer, CheckSquare, FileText } from 'lucide-react-native';
import { StageData } from '~/lib/templateTypes';
import { MaterialsList } from './MaterialsList';
import { EnvironmentalConditionsList } from './EnvironmentalConditionsList';
import { TasksList } from './TasksList';
import { StageNotes } from './StageNotes';

type TabType = 'materials' | 'conditions' | 'tasks' | 'notes';

interface StageSectionProps {
  stageData: StageData;
  onUpdateStageData: (stageData: StageData) => void;
}

export const StageSection: React.FC<StageSectionProps> = ({ stageData, onUpdateStageData }) => {
  const [activeTab, setActiveTab] = useState<TabType>('materials');

  const handleUpdateMaterials = (materials: typeof stageData.materials) => {
    onUpdateStageData({
      ...stageData,
      materials,
    });
  };

  const handleUpdateConditions = (
    environmentalConditions: typeof stageData.environmentalConditions
  ) => {
    onUpdateStageData({
      ...stageData,
      environmentalConditions,
    });
  };

  const handleUpdateTasks = (tasks: typeof stageData.tasks) => {
    onUpdateStageData({
      ...stageData,
      tasks,
    });
  };

  const handleUpdateNotes = (notes: string) => {
    onUpdateStageData({
      ...stageData,
      notes,
    });
  };

  const tabs = [
    { id: 'materials' as TabType, icon: Package },
    { id: 'conditions' as TabType, icon: Thermometer },
    { id: 'tasks' as TabType, icon: CheckSquare },
    { id: 'notes' as TabType, icon: FileText },
  ];

  return (
    <VStack space="md" className="p-2">
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
        {activeTab === 'materials' && (
          <MaterialsList
            materials={stageData.materials}
            onUpdateMaterials={handleUpdateMaterials}
          />
        )}
        {activeTab === 'conditions' && (
          <EnvironmentalConditionsList
            conditions={stageData.environmentalConditions}
            onUpdateConditions={handleUpdateConditions}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksList tasks={stageData.tasks} onUpdateTasks={handleUpdateTasks} />
        )}
        {activeTab === 'notes' && (
          <StageNotes notes={stageData.notes} onUpdateNotes={handleUpdateNotes} />
        )}
      </VStack>
    </VStack>
  );
};
