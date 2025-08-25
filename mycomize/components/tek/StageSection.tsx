import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { BulkStageData } from '~/lib/types/tekTypes';
import { StageTabs } from '~/components/ui/stage-tabs';

interface StageSectionProps {
  stageData: BulkStageData;
  onUpdateBulkStageData: (stageData: BulkStageData) => void;
}

export const StageSection: React.FC<StageSectionProps> = ({ stageData, onUpdateBulkStageData }) => {
  return (
    <VStack space="md" className="p-0">
      <StageTabs stageData={stageData} onUpdateBulkStageData={onUpdateBulkStageData} />
    </VStack>
  );
};
