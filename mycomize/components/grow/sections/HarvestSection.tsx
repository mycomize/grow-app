import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { ArrowDownToDot } from 'lucide-react-native';

// Import grow components
import { FlushList } from '../FlushList';

// Import tek types
import { BulkGrowFlush } from '~/lib/growTypes';
import { StageTabs } from '~/components/ui/stage-tabs';

interface HarvestSectionProps {
  flushes: BulkGrowFlush[];
  onUpdateFlushes: (flushes: BulkGrowFlush[]) => void;
  growData?: any; // Grow data for calendar integration

  // Tek stage data (if available from tek)
  stageData?: any;
  onUpdateBulkStageData?: (stageData: any) => void;

  // Complete button props
  status: string;
  currentStageIndex: number;
  stageIndex: number;
  advanceToNextStage: () => void;
}

export const HarvestSection: React.FC<HarvestSectionProps> = ({
  flushes,
  onUpdateFlushes,
  growData,
  stageData,
  onUpdateBulkStageData,
  status,
  advanceToNextStage,
}) => {
  const showCompleteButton = status === 'active';

  return (
    <VStack space="md" className="bg-background-0 p-4">
      {/* Stage Tabs */}
      <StageTabs
        stageData={stageData}
        onUpdateBulkStageData={onUpdateBulkStageData}
        grow={growData}
        stageName="Harvest"
        stageStartDate={growData?.fruiting_start_date}
      />

      {/* Harvest Flushes */}
      <VStack space="lg" className="mt-4 border-t border-background-200 pt-4">
        <FlushList flushes={flushes} onUpdateFlushes={onUpdateFlushes} />

        {/* Complete button */}
        {showCompleteButton && (
          <HStack className="mt-4 justify-end">
            <Button
              size="sm"
              variant="solid"
              onPress={advanceToNextStage}
              className="bg-success-300">
              <ButtonText className="text-white">Complete</ButtonText>
              <Icon as={ArrowDownToDot} className="ml-1" size="sm" />
            </Button>
          </HStack>
        )}
      </VStack>
    </VStack>
  );
};
