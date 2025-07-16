import React, { useMemo, useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { InfoBadge } from '~/components/ui/info-badge';
import {
  CheckCircle,
  Circle,
  ChevronRight,
  ArrowDownToDot,
  ChevronDown,
  Disc2,
  Syringe,
  Wheat,
  Box,
  ShoppingBasket,
  Package,
  Thermometer,
  CheckSquare,
  Clock,
} from 'lucide-react-native';

import MushroomIcon from '~/components/icons/MushroomIcon';
import { View } from 'react-native';
import { InoculationSection } from './InoculationSection';
import { SpawnSection } from './SpawnSection';
import { BulkSection } from './BulkSection';
import { FruitingSection } from './FruitingSection';
import { HarvestSection } from './HarvestSection';

interface BulkStageData {
  inoculation_date?: string;
  spawn_colonization_date?: string;
  bulk_colonization_date?: string;
  fruiting_start_date?: string;
  harvest_date?: string;
  current_stage?: string;
}

interface StagesSectionProps {
  growData: any;
  updateField: (field: any, value: any) => void;
  flushCount: number;
  flushes: any[];
  addFlush: () => void;
  updateFlush: (id: string, data: any) => void;
  removeFlush: (id: string) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date) => void;
  parseDate: (dateString?: string) => Date | null;
}

interface Stage {
  id: string;
  name: string;
  description: string;
  dateField: keyof BulkStageData;
  color: string;
  bgColor: string;
}

const stages: Stage[] = [
  {
    id: 'inoculation',
    name: 'Inoculation',
    description: 'Initial spore or culture introduction',
    dateField: 'inoculation_date',
    color: 'text-typography-700',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'spawn_colonization',
    name: 'Spawn Colonization',
    description: 'Mycelium colonizing spawn substrate',
    dateField: 'spawn_colonization_date',
    color: 'text-typography-700',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'bulk_colonization',
    name: 'Bulk Colonization',
    description: 'Mycelium colonizing bulk substrate',
    dateField: 'bulk_colonization_date',
    color: 'text-typography-700',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'fruiting',
    name: 'Fruiting',
    description: 'Mushroom formation and growth',
    dateField: 'fruiting_start_date',
    color: 'text-typography-700',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'harvest',
    name: 'Harvest',
    description: 'Mushroom harvesting period',
    dateField: 'harvest_date',
    color: 'text-typography-700',
    bgColor: 'bg-blue-100',
  },
];

export const StagesSection: React.FC<StagesSectionProps> = ({
  growData,
  updateField,
  flushes,
  addFlush,
  updateFlush,
  removeFlush,
  activeDatePicker,
  setActiveDatePicker,
  handleDateChange,
  parseDate,
}) => {
  const [expandedStages, setExpandedStages] = useState<string[]>([]);

  const toggleStageExpansion = (stageId: string) => {
    setExpandedStages((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
  };

  // Map stage IDs to stage data keys (backend expects snake_case)
  const getBulkStageDataKey = (stageId: string) => {
    // All stage keys should remain in snake_case to match backend schema
    return stageId;
  };

  // Get stage data for a specific stage
  const getBulkStageData = (stageId: string) => {
    if (!growData.stages) return null;
    return growData.stages[stageId] || null;
  };

  // Update stage data for a specific stage
  const updateBulkStageData = (stageId: string, stageData: any) => {
    const currentStages = growData.stages || {};
    const updatedStages = {
      ...currentStages,
      [stageId]: stageData,
    };
    updateField('stages', updatedStages);
  };

  // Get item counts for a stage
  const getItemCounts = (stageId: string) => {
    const stageData = getBulkStageData(getBulkStageDataKey(stageId));
    if (!stageData) {
      return {
        items: 0,
        conditions: 0,
        tasks: 0,
      };
    }
    return {
      items: stageData.items?.length || 0,
      conditions: stageData.environmental_conditions?.length || 0,
      tasks: stageData.tasks?.length || 0,
    };
  };

  // Render count badges for a stage
  const renderCountBadges = (stageId: string) => {
    const counts = getItemCounts(stageId);
    const badges = [];

    if (counts.items > 0) {
      badges.push(
        <InfoBadge
          key="items"
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

  // Get status badge for a stage
  const getStatusBadge = (stageId: string) => {
    let status: string | undefined;
    let variant: 'default' | 'success' | 'healthy' | 'warning' | 'error' = 'default';

    switch (stageId) {
      case 'inoculation':
        status = growData.inoculation_status;
        break;
      case 'spawn_colonization':
        status = growData.spawn_colonization_status;
        break;
      case 'bulk_colonization':
        status = growData.bulk_colonization_status;
        break;
      case 'fruiting':
        status = growData.fruiting_status;
        break;
      case 'harvest':
        // For harvest, we could show completed status or number of flushes
        // Only count flushes that have actual data (harvest_date or weight)
        const validFlushes =
          flushes?.filter(
            (flush) => flush?.harvest_date || flush?.wet_yield_grams || flush?.dry_yield_grams
          ) || [];
        const actualFlushCount = validFlushes.length;
        if (actualFlushCount > 0) {
          return (
            <InfoBadge
              key="harvest-status"
              text={`${actualFlushCount} flush${actualFlushCount !== 1 ? 'es' : ''}`}
              variant="success"
              size="sm"
            />
          );
        }
        return null;
      default:
        return null;
    }

    if (!status) return null;

    // Set variant based on status
    switch (status) {
      case 'Healthy':
        variant = 'healthy';
        break;
      case 'Suspect':
        variant = 'warning';
        break;
      case 'Contaminated':
        variant = 'error';
        break;
      default:
        variant = 'default';
        break;
    }

    return (
      <InfoBadge
        key="status"
        text={status === 'Contaminated' ? 'Contam' : status}
        variant={variant}
        size="sm"
      />
    );
  };

  // Get cost badge for a stage
  const getCostBadge = (stageId: string) => {
    const stageData = getBulkStageData(stageId);
    if (!stageData?.items) return null;

    const cost = stageData.items.reduce((total: number, item: any) => {
      const itemCost = parseFloat(item.cost || '0') || 0;
      return total + itemCost;
    }, 0);

    if (cost <= 0) return null;

    return <InfoBadge key="cost" text={`$${cost.toFixed(2)}`} variant="default" size="sm" />;
  };

  const getCurrentStageIndex = () => {
    // First check if current_stage is explicitly set
    if (growData.current_stage) {
      // Handle completed state
      if (growData.current_stage === 'completed' || growData.status === 'completed') {
        return 4; // Show harvest as the last active stage
      }
      const index = stages.findIndex((s) => s.id === growData.current_stage);
      if (index !== -1) return index;
    }

    // Otherwise, infer from date fields (working backwards from most advanced stage)
    if (growData.harvest_date) return 4; // harvest
    if (growData.fruiting_start_date) return 3; // fruiting
    if (growData.bulk_colonization_date) return 2; // bulk_colonization
    if (growData.spawn_colonization_date) return 1; // spawn_colonization
    if (growData.inoculation_date) return 0; // inoculation

    return -1; // Not started
  };

  const currentStageIndex = getCurrentStageIndex();

  const getStageStatus = (index: number) => {
    // If grow is completed, all stages are completed
    if (growData.status === 'completed' || growData.current_stage === 'completed') {
      return 'completed';
    }

    if (index < currentStageIndex) {
      return 'completed';
    }

    if (index === currentStageIndex) {
      return 'active';
    }

    return 'pending';
  };

  const advanceToNextStage = () => {
    const today = new Date().toISOString().split('T')[0];

    // Special handling for finishing harvest stage
    if (currentStageIndex === stages.length - 1) {
      updateField('status', 'completed');
      updateField('current_stage', 'completed');
      return;
    }

    if (currentStageIndex >= stages.length - 1) return;

    const nextStageIndex = currentStageIndex + 1;
    const nextStage = stages[nextStageIndex];

    // Special handling for inoculation -> spawn colonization
    if (currentStageIndex === -1 || currentStageIndex === 0) {
      updateField('inoculation_date', today);
      updateField('spawn_colonization_date', today);
      updateField('current_stage', 'spawn_colonization');
    } else {
      updateField(nextStage.dateField, today);
      updateField('current_stage', nextStage.id);
    }
  };

  return (
    <VStack space="lg" className="bg-background-0 p-2">
      {/* Timeline */}
      <VStack space="xs">
        {stages.map((stage, index) => {
          const status = getStageStatus(index);
          const isLast = index === stages.length - 1;

          return (
            <VStack key={stage.id} space="xs">
              <HStack space="md" className="items-start">
                {/* Timeline indicator */}
                <VStack className="items-center" style={{ width: 8 }}>
                  {/* Stage circle/checkmark */}
                  <HStack>
                    {status === 'completed' ? (
                      <Icon as={CheckCircle} size="xl" className="my-0.5 text-green-700" />
                    ) : status === 'active' ? (
                      <Icon as={Disc2} size="xl" className="my-0.5 text-success-400"></Icon>
                    ) : (
                      <Icon as={Circle} size="xl" className="my-0.5 text-typography-300" />
                    )}
                  </HStack>

                  {/* Connecting line */}
                  {!isLast && (
                    <View
                      className={`mt-1 w-0.5 flex-1 ${
                        status === 'completed' ? 'bg-green-700' : 'bg-typography-200'
                      }`}
                      style={{ minHeight: 60 }}
                    />
                  )}
                </VStack>

                {/* Stage content */}
                <VStack className="flex-1 pb-4">
                  <VStack space="xs">
                    {/* Stage name row */}
                    <HStack className="items-center justify-between">
                      <HStack className="flex-1 items-center gap-2">
                        {stage.name === 'Inoculation' && (
                          <>
                            <View className="ml-0.5" />
                            <Icon as={Syringe} size="md" className="text-typography-500" />
                          </>
                        )}
                        {stage.name === 'Spawn Colonization' && (
                          <>
                            <View className="ml-0.5" />
                            <Icon as={Wheat} size="md" className="text-typography-500" />
                          </>
                        )}
                        {stage.name === 'Bulk Colonization' && (
                          <>
                            <View className="ml-0.5" />
                            <Icon as={Box} size="md" className="text-typography-500" />
                          </>
                        )}
                        {stage.name === 'Fruiting' && (
                          <>
                            <View className="ml-0.5" />
                            <MushroomIcon height={18} width={18} strokeWidth={2} color="#9ca3af" />
                          </>
                        )}
                        {stage.name === 'Harvest' && (
                          <>
                            <View className="ml-0.5" />
                            <Icon as={ShoppingBasket} size="md" className="text-typography-500" />
                          </>
                        )}
                        {status === 'active' && (
                          <>
                            <Text className="text-lg font-semibold text-typography-700">
                              {stage.name}
                            </Text>
                          </>
                        )}
                        {status !== 'active' && (
                          <Text
                            className={`text-lg ${status === 'pending' ? 'text-typography-700' : stage.color}`}>
                            {stage.name}
                          </Text>
                        )}
                        <View className="ml-auto">
                          {getCostBadge(getBulkStageDataKey(stage.id))}
                        </View>
                        {getStatusBadge(stage.id)}
                      </HStack>
                    </HStack>

                    {/* Count badges */}
                    <HStack space="xs" className="my-1 ml-3">
                      {renderCountBadges(stage.id)}
                    </HStack>
                  </VStack>

                  {/* Expand/Collapse button and sub-section */}
                  {(status !== 'pending' ||
                    (stage.id === 'inoculation' && currentStageIndex === -1)) && (
                    <VStack space="sm" className="mt-3">
                      <Pressable
                        onPress={() => toggleStageExpansion(stage.id)}
                        className="flex-row items-center">
                        <Text className="text-md ml-3 text-typography-600">
                          {expandedStages.includes(stage.id) ? 'Hide' : 'Show'} Details
                        </Text>
                        <Icon
                          as={expandedStages.includes(stage.id) ? ChevronDown : ChevronRight}
                          size="sm"
                          className="ml-1 text-primary-600"
                        />
                      </Pressable>

                      {/* Render sub-sections */}
                      {expandedStages.includes(stage.id) && (
                        <View className="mt-0 rounded-lg  bg-background-50">
                          {stage.id === 'inoculation' && (
                            <InoculationSection
                              growData={growData}
                              updateField={updateField}
                              activeDatePicker={activeDatePicker}
                              setActiveDatePicker={setActiveDatePicker}
                              handleDateChange={handleDateChange}
                              parseDate={parseDate}
                              stageData={getBulkStageData(getBulkStageDataKey(stage.id))}
                              onUpdateBulkStageData={(data) =>
                                updateBulkStageData(getBulkStageDataKey(stage.id), data)
                              }
                              status={status}
                              currentStageIndex={currentStageIndex}
                              stageIndex={index}
                              advanceToNextStage={advanceToNextStage}
                            />
                          )}
                          {stage.id === 'spawn_colonization' && (
                            <SpawnSection
                              growData={growData}
                              updateField={updateField}
                              activeDatePicker={activeDatePicker}
                              setActiveDatePicker={setActiveDatePicker}
                              handleDateChange={handleDateChange}
                              parseDate={parseDate}
                              stageData={getBulkStageData(getBulkStageDataKey(stage.id))}
                              onUpdateBulkStageData={(data) =>
                                updateBulkStageData(getBulkStageDataKey(stage.id), data)
                              }
                              status={status}
                              currentStageIndex={currentStageIndex}
                              stageIndex={index}
                              advanceToNextStage={advanceToNextStage}
                            />
                          )}
                          {stage.id === 'bulk_colonization' && (
                            <BulkSection
                              growData={growData}
                              updateField={updateField}
                              activeDatePicker={activeDatePicker}
                              setActiveDatePicker={setActiveDatePicker}
                              handleDateChange={handleDateChange}
                              parseDate={parseDate}
                              stageData={getBulkStageData(getBulkStageDataKey(stage.id))}
                              onUpdateBulkStageData={(data) =>
                                updateBulkStageData(getBulkStageDataKey(stage.id), data)
                              }
                              status={status}
                              currentStageIndex={currentStageIndex}
                              stageIndex={index}
                              advanceToNextStage={advanceToNextStage}
                            />
                          )}
                          {stage.id === 'fruiting' && (
                            <FruitingSection
                              growData={growData}
                              updateField={updateField}
                              activeDatePicker={activeDatePicker}
                              setActiveDatePicker={setActiveDatePicker}
                              handleDateChange={handleDateChange}
                              parseDate={parseDate}
                              stageData={getBulkStageData(getBulkStageDataKey(stage.id))}
                              onUpdateBulkStageData={(data) =>
                                updateBulkStageData(getBulkStageDataKey(stage.id), data)
                              }
                              status={status}
                              currentStageIndex={currentStageIndex}
                              stageIndex={index}
                              advanceToNextStage={advanceToNextStage}
                            />
                          )}
                          {stage.id === 'harvest' && (
                            <HarvestSection
                              flushes={flushes}
                              onUpdateFlushes={(updatedFlushes) => {
                                // Update the flushes directly via the updateField function
                                updateField('flushes', updatedFlushes);
                              }}
                              status={status}
                              currentStageIndex={currentStageIndex}
                              stageIndex={index}
                              advanceToNextStage={advanceToNextStage}
                              stageData={getBulkStageData(getBulkStageDataKey(stage.id))}
                              onUpdateBulkStageData={(data) =>
                                updateBulkStageData(getBulkStageDataKey(stage.id), data)
                              }
                            />
                          )}
                        </View>
                      )}
                    </VStack>
                  )}
                </VStack>
              </HStack>
            </VStack>
          );
        })}
      </VStack>

      {/* Instructions */}
      <VStack className="rounded-lg bg-background-50 p-3">
        <Text className="text-sm text-typography-500">
          Track your grow's progress through each stage. Press "Complete" to move to the next stage
          when ready. Each stage will record its start date automatically.
        </Text>
      </VStack>
    </VStack>
  );
};
