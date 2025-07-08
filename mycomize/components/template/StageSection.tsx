import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { StageData } from '~/lib/templateTypes';
import { MaterialsList } from './MaterialsList';
import { EnvironmentalConditionsList } from './EnvironmentalConditionsList';
import { TasksList } from './TasksList';
import { StageNotes } from './StageNotes';

interface StageSectionProps {
  stageData: StageData;
  onUpdateStageData: (stageData: StageData) => void;
}

export const StageSection: React.FC<StageSectionProps> = ({ stageData, onUpdateStageData }) => {
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

  return (
    <VStack space="lg" className="p-4">
      {/* Materials Section */}
      <MaterialsList materials={stageData.materials} onUpdateMaterials={handleUpdateMaterials} />

      {/* Environmental Conditions Section */}
      <EnvironmentalConditionsList
        conditions={stageData.environmentalConditions}
        onUpdateConditions={handleUpdateConditions}
      />

      {/* Tasks Section */}
      <TasksList tasks={stageData.tasks} onUpdateTasks={handleUpdateTasks} />

      {/* Notes Section */}
      <StageNotes notes={stageData.notes} onUpdateNotes={handleUpdateNotes} />
    </VStack>
  );
};
