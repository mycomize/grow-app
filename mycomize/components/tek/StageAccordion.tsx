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
import { BulkGrowTekIcon } from '~/lib/types/bulkGrowTypes';
import {
  ChevronDown,
  ChevronRight,
  Package,
  Thermometer,
  CheckSquare,
  FileText,
} from 'lucide-react-native';
import { BulkGrowTekData, BulkGrowCultivationStage, BULK_GROW_TEK_STAGES } from '~/lib/types/tekTypes';
import { StageSection } from './StageSection';

interface StageAccordionProps {
  tekData: BulkGrowTekData;
  onUpdateTekData: (tekData: BulkGrowTekData) => void;
}

export const StageAccordion: React.FC<StageAccordionProps> = ({ tekData, onUpdateTekData }) => {
  const handleUpdateBulkStageData = (stage: BulkGrowCultivationStage, stageData: any) => {
    onUpdateTekData({
      ...tekData,
      stages: {
        ...tekData.stages,
        [stage]: stageData,
      },
    });
  };

  const getItemCounts = (stage: BulkGrowCultivationStage) => {
    const stageData = tekData.stages[stage];
    return {
      items: stageData.items?.length || 0,
      conditions: stageData.environmental_conditions?.length || 0,
      tasks: stageData.tasks?.length || 0,
    };
  };

  const renderCountBadges = (stage: BulkGrowCultivationStage) => {
    const counts = getItemCounts(stage);
    const badges = [];

    if (counts.items > 0) {
      badges.push(
        <InfoBadge
          key="materials"
          icon={Package}
          text={`x ${counts.items}`}
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

  const stageOrder: BulkGrowCultivationStage[] = [
    'inoculation',
    'spawn_colonization',
    'bulk_colonization',
    'fruiting',
    'harvest',
  ];

  return (
    <VStack space="sm">
      <Accordion
        type="multiple"
        variant="unfilled"
        className="m-0 w-full gap-0 p-0"
        defaultValue={['']}>
        {stageOrder.map((stage) => (
          <AccordionItem key={stage} value={stage} className="rounded-md bg-background-0">
            <AccordionHeader>
              <AccordionTrigger>
                {({ isExpanded }: { isExpanded: boolean }) => (
                  <HStack className="flex-1 items-center justify-between">
                    <HStack className="flex-1 items-center" space="sm">
                      <BulkGrowTekIcon stage={stage} />
                      <VStack className="ml-2 flex-1 items-start" space="xs">
                        <Text className="text-lg font-semibold text-typography-700">
                          {BULK_GROW_TEK_STAGES[stage]}
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
                stageData={tekData.stages[stage]}
                onUpdateBulkStageData={(stageData) => handleUpdateBulkStageData(stage, stageData)}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </VStack>
  );
};
