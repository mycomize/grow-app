import React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { MonotubTekTemplateData, CultivationStage, CULTIVATION_STAGES } from '~/lib/templateTypes';
import { StageSection } from './StageSection';

interface StageAccordionProps {
  templateData: MonotubTekTemplateData;
  onUpdateTemplateData: (templateData: MonotubTekTemplateData) => void;
}

export const StageAccordion: React.FC<StageAccordionProps> = ({
  templateData,
  onUpdateTemplateData,
}) => {
  const handleUpdateStageData = (stage: CultivationStage, stageData: any) => {
    onUpdateTemplateData({
      ...templateData,
      stages: {
        ...templateData.stages,
        [stage]: stageData,
      },
    });
  };

  const getItemCounts = (stage: CultivationStage) => {
    const stageData = templateData.stages[stage];
    const materialCount = stageData.materials.length;
    const conditionCount = stageData.environmentalConditions.length;
    const taskCount = stageData.tasks.length;

    const counts = [];
    if (materialCount > 0)
      counts.push(`${materialCount} material${materialCount !== 1 ? 's' : ''}`);
    if (conditionCount > 0)
      counts.push(`${conditionCount} condition${conditionCount !== 1 ? 's' : ''}`);
    if (taskCount > 0) counts.push(`${taskCount} task${taskCount !== 1 ? 's' : ''}`);

    return counts.length > 0 ? counts.join(', ') : 'No items added';
  };

  const stageOrder: CultivationStage[] = [
    'inoculation',
    'spawnColonization',
    'bulkColonization',
    'fruiting',
    'harvest',
  ];

  return (
    <VStack space="md">
      <Text className="text-lg font-semibold">Cultivation Stages</Text>
      <Accordion
        type="multiple"
        variant="unfilled"
        className="w-full gap-4"
        defaultValue={['inoculation']}>
        {stageOrder.map((stage) => (
          <AccordionItem key={stage} value={stage} className="rounded-md bg-background-0">
            <AccordionHeader>
              <AccordionTrigger>
                {({ isExpanded }: { isExpanded: boolean }) => (
                  <HStack className="flex-1 items-center justify-between">
                    <VStack className="flex-1 items-start" space="xs">
                      <Text className="text-lg font-semibold text-typography-900">
                        {CULTIVATION_STAGES[stage]}
                      </Text>
                      <Text className="text-sm text-typography-500">{getItemCounts(stage)}</Text>
                    </VStack>
                    <Icon
                      as={isExpanded ? ChevronDown : ChevronRight}
                      size="lg"
                      className="text-typography-900"
                    />
                  </HStack>
                )}
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              <StageSection
                stageData={templateData.stages[stage]}
                onUpdateStageData={(stageData) => handleUpdateStageData(stage, stageData)}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </VStack>
  );
};
