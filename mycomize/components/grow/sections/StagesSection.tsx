import React, { useMemo, useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
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
} from 'lucide-react-native';

import MushroomIcon from '~/components/icons/MushroomIcon';
import { View } from 'react-native';
import { SyringeSection } from './SyringeSection';
import { SpawnSection } from './SpawnSection';
import { BulkSection } from './BulkSection';
import { FruitingSection } from './FruitingSection';
import { HarvestSection } from './HarvestSection';

interface StageData {
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
  dateField: keyof StageData;
  color: string;
  bgColor: string;
}

const stages: Stage[] = [
  {
    id: 'inoculation',
    name: 'Inoculation',
    description: 'Initial spore or culture introduction',
    dateField: 'inoculation_date',
    color: 'text-green-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'spawn_colonization',
    name: 'Spawn Colonization',
    description: 'Mycelium colonizing spawn substrate',
    dateField: 'spawn_colonization_date',
    color: 'text-green-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'bulk_colonization',
    name: 'Bulk Colonization',
    description: 'Mycelium colonizing bulk substrate',
    dateField: 'bulk_colonization_date',
    color: 'text-green-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'fruiting',
    name: 'Fruiting',
    description: 'Mushroom formation and growth',
    dateField: 'fruiting_start_date',
    color: 'text-green-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'harvest',
    name: 'Harvest',
    description: 'Mushroom harvesting period',
    dateField: 'harvest_date',
    color: 'text-green-600',
    bgColor: 'bg-blue-100',
  },
];

export const StagesSection: React.FC<StagesSectionProps> = ({
  growData,
  updateField,
  flushCount,
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
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  const getDaysSinceStageStart = (stageIndex: number) => {
    if (stageIndex === 0) return null; // No duration for inoculation

    const stage = stages[stageIndex];
    const stageDate = growData[stage.dateField];
    if (!stageDate) return null;

    const startDate = new Date(stageDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const getTotalDays = () => {
    // Use the same logic as backend: prefer spawn_colonization_date, fallback to inoculation_date
    const spawnDate = growData.spawn_colonization_date;
    const inoculationDate = growData.inoculation_date;
    const startDate = spawnDate || inoculationDate;

    if (!startDate) return null;

    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Add 1 so that grows started today show as "Day 1" instead of "Day 0"
    // Return 1 if negative or 0 (future date or today), otherwise return days + 1
    return Math.max(1, diffDays + 1);
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

  const totalDays = getTotalDays();

  // Calculate total cost
  const calculateTotalCost = () => {
    const syringeCost = parseFloat(growData.syringe_cost || '0') || 0;
    const spawnCost = parseFloat(growData.spawn_cost || '0') || 0;
    const bulkCost = parseFloat(growData.bulk_cost || '0') || 0;
    return syringeCost + spawnCost + bulkCost;
  };

  const totalCost = calculateTotalCost();

  return (
    <VStack space="lg" className="bg-background-0 p-2">
      {/* Stats Display */}
      <VStack className="">
        {/* Total Days Display */}
        {totalDays !== null && (
          <Text className="font-semibold text-primary-700">Duration: {totalDays} days</Text>
        )}
        {/* Total Cost Display */}
        <Text className="font-semibold text-primary-700">Total Cost: ${totalCost.toFixed(2)}</Text>
      </VStack>

      {/* Timeline */}
      <VStack space="xs">
        {stages.map((stage, index) => {
          const status = getStageStatus(index);
          const stageDate = growData[stage.dateField];
          const daysSince = getDaysSinceStageStart(index);
          const isLast = index === stages.length - 1;

          return (
            <VStack key={stage.id} space="xs">
              <HStack space="md" className="items-start">
                {/* Timeline indicator */}
                <VStack className="items-center" style={{ width: 32 }}>
                  {/* Stage circle/checkmark */}
                  {status === 'completed' ? (
                    <Icon as={CheckCircle} size="xl" className="my-0.5 text-green-600" />
                  ) : status === 'active' ? (
                    <Icon as={Disc2} size="xl" className="my-0.5 text-success-400"></Icon>
                  ) : (
                    <Icon as={Circle} size="xl" className="my-0.5 text-typography-300" />
                  )}

                  {/* Connecting line */}
                  {!isLast && (
                    <View
                      className={`mt-1 w-0.5 flex-1 ${
                        status === 'completed' ? 'bg-green-600' : 'bg-typography-200'
                      }`}
                      style={{ minHeight: 60 }}
                    />
                  )}
                </VStack>

                {/* Stage content */}
                <VStack className="flex-1 pb-4">
                  <HStack className="items-center justify-between">
                    <VStack space="xs" className="flex-1">
                      <HStack className="justify-between">
                        {status === 'active' && (
                          <Text className="text-lg font-semibold text-success-400">
                            {stage.name}
                          </Text>
                        )}
                        {status !== 'active' && (
                          <Text
                            className={`text-lg font-bold ${status === 'pending' ? 'text-typography-400' : stage.color}`}>
                            {stage.name}
                          </Text>
                        )}
                        {stage.name === 'Inoculation' && (
                          <Icon as={Syringe} size="md" className="ml-auto text-typography-500" />
                        )}
                        {stage.name === 'Spawn Colonization' && (
                          <Icon as={Wheat} size="md" className="ml-auto text-typography-500" />
                        )}
                        {stage.name === 'Bulk Colonization' && (
                          <Icon as={Box} size="md" className="ml-auto text-typography-500" />
                        )}
                        {stage.name === 'Fruiting' && (
                          <MushroomIcon
                            height={18}
                            width={18}
                            strokeWidth={2}
                            color="#9ca3af"
                            className=""
                          />
                        )}
                        {stage.name === 'Harvest' && (
                          <Icon
                            as={ShoppingBasket}
                            size="md"
                            className="ml-auto text-typography-500"
                          />
                        )}
                      </HStack>

                      {/* Stage date and duration */}
                      {stageDate && (
                        <HStack space="sm" className="items-center">
                          {stage.id === 'inoculation' && (
                            <Text className="text-sm font-medium text-typography-600">
                              Inoculated: {new Date(stageDate).toLocaleDateString()}
                            </Text>
                          )}
                          {stage.id !== 'inoculation' && (
                            <Text className="text-sm font-medium text-typography-600">
                              Started: {new Date(stageDate).toLocaleDateString()}
                            </Text>
                          )}
                          {daysSince !== null && (
                            <>
                              <Text className="text-typography-400">•</Text>
                              <Text className="text-sm font-medium text-typography-600">
                                {daysSince} days
                              </Text>
                            </>
                          )}
                        </HStack>
                      )}

                      {/* Flush count for harvest stage */}
                      {stage.id === 'harvest' && status !== 'pending' && flushCount > 0 && (
                        <Text className="text-sm font-medium text-orange-600">
                          {flushCount} {flushCount === 1 ? 'Flush' : 'Flushes'} completed
                        </Text>
                      )}
                    </VStack>
                  </HStack>

                  {/* Expand/Collapse button and sub-section */}
                  {(status !== 'pending' ||
                    (stage.id === 'inoculation' && currentStageIndex === -1)) && (
                    <VStack space="sm" className="mt-3">
                      <HStack>
                        <Pressable
                          onPress={() => toggleStageExpansion(stage.id)}
                          className="flex-row items-center">
                          <Text className="text-md font-medium text-primary-600">
                            {expandedStages.includes(stage.id) ? 'Hide' : 'Show'} Details
                          </Text>
                          <Icon
                            as={expandedStages.includes(stage.id) ? ChevronDown : ChevronRight}
                            size="sm"
                            className="ml-1 text-primary-600"
                          />
                        </Pressable>
                        {/* Advance button */}
                        {status === 'active' && (
                          <Button
                            size="sm"
                            variant="solid"
                            onPress={advanceToNextStage}
                            className="ml-auto bg-success-300">
                            <ButtonText className="text-white">Complete</ButtonText>
                            <Icon as={ArrowDownToDot} className="ml-1" size="sm" />
                          </Button>
                        )}

                        {/* Inoculate button for first stage */}
                        {currentStageIndex === -1 && index === 0 && (
                          <Button
                            size="sm"
                            variant="solid"
                            onPress={advanceToNextStage}
                            className="ml-auto bg-success-300">
                            <ButtonText className="text-white">Complete</ButtonText>
                            <Icon as={ArrowDownToDot} className="ml-1" size="sm" />
                          </Button>
                        )}
                      </HStack>

                      {/* Render sub-sections */}
                      {expandedStages.includes(stage.id) && (
                        <View className="mt-0 rounded-lg  bg-background-50">
                          {stage.id === 'inoculation' && (
                            <SyringeSection
                              growData={growData}
                              updateField={updateField}
                              activeDatePicker={activeDatePicker}
                              setActiveDatePicker={setActiveDatePicker}
                              handleDateChange={handleDateChange}
                              parseDate={parseDate}
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
                            />
                          )}
                          {stage.id === 'harvest' && (
                            <HarvestSection
                              flushes={flushes}
                              addFlush={addFlush}
                              updateFlush={updateFlush}
                              removeFlush={removeFlush}
                              activeDatePicker={activeDatePicker}
                              setActiveDatePicker={setActiveDatePicker}
                              handleDateChange={handleDateChange}
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
          Track your grow's progress through each stage. Press "Advance" to move to the next stage
          when ready. Each stage will record its start date automatically.
        </Text>
      </VStack>
    </VStack>
  );
};
