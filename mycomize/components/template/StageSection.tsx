import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { StageData } from '~/lib/templateTypes';
import { StageTabs } from '~/components/ui/stage-tabs';

interface StageSectionProps {
  stageData: StageData;
  onUpdateStageData: (stageData: StageData) => void;
}

export const StageSection: React.FC<StageSectionProps> = ({ stageData, onUpdateStageData }) => {
  return (
    <VStack space="md" className="p-0">
      <StageTabs stageData={stageData} onUpdateStageData={onUpdateStageData} />
    </VStack>
  );
};
