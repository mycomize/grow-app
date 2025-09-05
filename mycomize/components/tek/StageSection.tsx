import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { BulkStageData } from '~/lib/types/tekTypes';
import { StageTabs } from '~/components/ui/stage-tabs';

interface StageSectionProps {
  stageData: BulkStageData;
  onUpdateBulkStageData?: (stageData: BulkStageData) => void;
  readOnly?: boolean;
}

export const StageSection: React.FC<StageSectionProps> = ({ 
  stageData, 
  onUpdateBulkStageData,
  readOnly = false 
}) => {
  return (
    <VStack space="md" className="p-0">
      <StageTabs 
        stageData={stageData} 
        onUpdateBulkStageData={onUpdateBulkStageData} 
        readOnly={readOnly}
      />
    </VStack>
  );
};
