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
import { InfoBadge } from '~/components/ui/info-badge';
import { MonotubTekIcon } from '~/lib/monotubTypes';
import {
  ChevronDown,
  ChevronRight,
  Package,
  Thermometer,
  CheckSquare,
  FileText,
} from 'lucide-react-native';
import {
  MonotubTekTemplateData,
  MonotubCultivationStage,
  MONOTUB_TEK_STAGES,
} from '~/lib/templateTypes';
import { StageSection } from './StageSection';

interface StageAccordionProps {
  templateData: MonotubTekTemplateData;
  onUpdateTemplateData: (templateData: MonotubTekTemplateData) => void;
}

export const StageAccordion: React.FC<StageAccordionProps> = ({
  templateData,
  onUpdateTemplateData,
}) => {
  const handleUpdateStageData = (stage: MonotubCultivationStage, stageData: any) => {
    onUpdateTemplateData({
      ...templateData,
      stages: {
        ...templateData.stages,
        [stage]: stageData,
      },
    });
  };

  const getItemCounts = (stage: MonotubCultivationStage) => {
    const stageData = templateData.stages[stage];
    return {
      materials: stageData.materials.length,
      conditions: stageData.environmentalConditions.length,
      tasks: stageData.tasks.length,
    };
  };

  const renderCountBadges = (stage: MonotubCultivationStage) => {
    const counts = getItemCounts(stage);
    const badges = [];

    if (counts.materials > 0) {
      badges.push(
        <InfoBadge
          key="materials"
          icon={Package}
          text={`x ${counts.materials}`}
          variant="default"
          size="sm"
        />
      );
    }

    if (counts.conditions > 0) {
      badges.push(
        <InfoBadge
          key="conditions"
          icon={Thermometer}
          text={`x ${counts.conditions}`}
          variant="default"
          size="sm"
        />
      );
    }

    if (counts.tasks > 0) {
      badges.push(
        <InfoBadge
          key="tasks"
          icon={CheckSquare}
          text={`x ${counts.tasks}`}
          variant="default"
          size="sm"
        />
      );
    }

    return badges.length > 0 ? badges : null;
  };

  const stageOrder: MonotubCultivationStage[] = [
    'inoculation',
    'spawnColonization',
    'bulkColonization',
    'fruiting',
    'harvest',
  ];

  return (
    <VStack space="sm">
      <Text className="text-lg font-semibold">{templateData.type} Tek</Text>
      <Accordion type="multiple" variant="unfilled" className="w-full gap-2" defaultValue={['']}>
        {stageOrder.map((stage) => (
          <AccordionItem key={stage} value={stage} className="rounded-md bg-background-0">
            <AccordionHeader>
              <AccordionTrigger>
                {({ isExpanded }: { isExpanded: boolean }) => (
                  <HStack className="flex-1 items-center justify-between">
                    <HStack className="flex-1 items-center" space="sm">
                      <MonotubTekIcon stage={stage} />
                      <VStack className="ml-2 flex-1 items-start" space="xs">
                        <Text className="text-lg font-semibold text-typography-700">
                          {MONOTUB_TEK_STAGES[stage]}
                        </Text>
                        <HStack space="xs">{renderCountBadges(stage)}</HStack>
                      </VStack>
                    </HStack>
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
