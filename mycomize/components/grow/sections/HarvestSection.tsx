import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { ArrowDownToDot } from 'lucide-react-native';

// Import grow components
import { FlushList, HarvestFlush } from '../FlushList';

// Import template types
import { StageData } from '~/lib/templateTypes';
import { StageTabs } from '~/components/ui/stage-tabs';

interface HarvestSectionProps {
  flushes: HarvestFlush[];
  onUpdateFlushes: (flushes: HarvestFlush[]) => void;

  // Template stage data (if available from template)
  stageData?: any;
  onUpdateStageData?: (stageData: any) => void;

  // Complete button props
  status: string;
  currentStageIndex: number;
  stageIndex: number;
  advanceToNextStage: () => void;
}

const potencyOptions = ['Low', 'Medium', 'High', 'Very High', 'Unknown'];

export const HarvestSection: React.FC<HarvestSectionProps> = ({
  flushes,
  onUpdateFlushes,
  stageData,
  onUpdateStageData,
  status,
  currentStageIndex,
  stageIndex,
  advanceToNextStage,
}) => {
  const showCompleteButton = status === 'active';

  return (
    <VStack space="md" className="bg-background-0 p-4">
      {/* Stage Tabs */}
      <StageTabs stageData={stageData} onUpdateStageData={onUpdateStageData} />

      {/* Harvest Flushes */}
      <VStack space="md" className="mt-6 border-t border-background-200 pt-4">
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
