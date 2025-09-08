import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { BulkStageData, BulkGrowCultivationStage } from '~/lib/types/tekTypes';
import { StageTabs } from '~/components/ui/stage-tabs';

interface StageSectionProps {
  stageData: BulkStageData;
  stageKey: BulkGrowCultivationStage;
  onUpdateBulkStageData?: (stageData: BulkStageData) => void;
  readOnly?: boolean;
}

export const StageSection: React.FC<StageSectionProps> = ({ 
  stageData, 
  stageKey,
  onUpdateBulkStageData,
  readOnly = false 
}) => {
  return (
    <VStack space="md" className="p-0">
      <StageTabs 
        stageData={stageData} 
        onUpdateBulkStageData={onUpdateBulkStageData} 
        stageName={stageKey}
        readOnly={readOnly}
      />
    </VStack>
  );
};
