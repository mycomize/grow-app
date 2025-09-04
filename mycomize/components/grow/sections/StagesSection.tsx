import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { InfoBadge } from '~/components/ui/info-badge';
import {
  CheckCircle,
  Circle,
  ChevronRight,
  ChevronDown,
  Disc2,
  Syringe,
  Wheat,
  Box,
  ShoppingBasket,
  Package,
  Thermometer,
  CheckSquare,
} from 'lucide-react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { InoculationSection } from './InoculationSection';
import { SpawnSection } from './SpawnSection';
import { BulkSection } from './BulkSection';
import { FruitingSection } from './FruitingSection';
import { HarvestSection } from './HarvestSection';
import { useAuthToken } from '~/lib/stores/authEncryptionStore';
import { useRouter } from 'expo-router';
import { useUnifiedToast } from '~/components/ui/unified-toast';

import { useCurrentGrowFormData, useCurrentGrowFlushes, useUpdateCurrentGrowField, useCurrentGrow } from '~/lib/stores';
import { BulkGrowUpdate } from '~/lib/types/growTypes';

interface StagesSectionProps {
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date) => void;
  parseDate: (dateString?: string) => Date | null;
}

interface Stage {
  id: string;
  name: string;
  description: string;
  dateField: keyof BulkGrowUpdate | null; // null for harvest since it doesn't have a direct date field
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
    dateField: 'spawn_start_date',
    color: 'text-typography-700',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'bulk_colonization',
    name: 'Bulk Colonization',
    description: 'Mycelium colonizing bulk substrate',
    dateField: 'bulk_start_date',
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
    dateField: null, // Harvest doesn't have a direct date field, uses flushes instead
    color: 'text-typography-700',
    bgColor: 'bg-blue-100',
  },
];

export const StagesSection: React.FC<StagesSectionProps> = ({
  activeDatePicker,
  setActiveDatePicker,
  handleDateChange,
  parseDate,
}) => {
  const token = useAuthToken();
  const router = useRouter();
  const { showError } = useUnifiedToast();

  // Store hooks
  const growData = useCurrentGrowFormData();
  const flushes = useCurrentGrowFlushes();
  const storeUpdateField = useUpdateCurrentGrowField();
  const currentGrow = useCurrentGrow();
  const grow = currentGrow; // For compatibility with existing IoT code

  // Create a wrapper function that accepts string field names for compatibility
  const updateField = (field: string, value: any) => {
    storeUpdateField(field as keyof BulkGrowUpdate | "flushes", value);
  };

  // Don't render if no grow data
  if (!growData) {
    return null;
  }

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
    return growData.stages[stageId as keyof typeof growData.stages] || null;
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
    // Note: harvest doesn't have a direct date field, so we check if flushes exist
    if (flushes && flushes.length > 0) return 4; // harvest
    if (growData.fruiting_start_date) return 3; // fruiting
    if (growData.bulk_start_date) return 2; // bulk_colonization
    if (growData.spawn_start_date) return 1; // spawn_colonization
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
      // Set harvest completion date if not already set
      if (!growData.harvest_completion_date) {
        updateField('harvest_completion_date', today);
      }
      updateField('status', 'completed');
      updateField('current_stage', 'completed');
      return;
    }

    if (currentStageIndex >= stages.length - 1) return;

    const nextStageIndex = currentStageIndex + 1;
    const nextStage = stages[nextStageIndex];

    // Special handling for inoculation -> spawn colonization
    if (currentStageIndex === -1 || currentStageIndex === 0) {
      // Only set inoculation date if not already set
      if (!growData.inoculation_date) {
        updateField('inoculation_date', today);
      }
      // Only set spawn start date if not already set (but sync with inoculation date if that exists)
      if (!growData.spawn_start_date) {
        updateField('spawn_start_date', growData.inoculation_date || today);
      }
      updateField('current_stage', 'spawn_colonization');
    } else if (nextStage.dateField) {
      // Skip auto-setting dates for bulk colonization and fruiting - user should set manually
      if (nextStage.id === 'bulk_colonization' || nextStage.id === 'fruiting') {
        updateField('current_stage', nextStage.id);
      } else {
        // Only set the next stage date if not already set for other stages
        const currentDateValue = growData[nextStage.dateField];
        if (!currentDateValue) {
          updateField(nextStage.dateField, today);
        }
        updateField('current_stage', nextStage.id);
      }
    } else {
      // Handle harvest stage which has no dateField
      updateField('current_stage', nextStage.id);
    }
  };

  return (
    <VStack space="lg" className="bg-background-0 px-1 py-1">
      {/* Instructions */}
      <Text className="text-md mb-2 text-typography-500">
        Track your grow's progress through each stage. Press Complete to move to the next stage when
        the current stage is completed.
      </Text>

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
                      <Icon as={Disc2} size="xl" className="my-0.5 text-blue-500"></Icon>
                    ) : (
                      <Icon as={Circle} size="xl" className="my-0.5 text-typography-300" />
                    )}
                  </HStack>

                  {/* Connecting line */}
                  {!isLast && (
                    <View
                      className={`mt-1 w-0.5 flex-1 ${
                        status === 'completed' ? 'bg-green-700' : 'bg-outline-50'
                      }`}
                      style={{ minHeight: 60 }}
                    />
                  )}
                </VStack>

                {/* Stage content */}
                <VStack className="flex-1 pb-4">
                  <VStack space="xs">
                    {/* Stage name row */}
                    {status !== 'pending' ||
                    (stage.id === 'inoculation' && currentStageIndex === -1) ? (
                      <Pressable
                        onPress={() => toggleStageExpansion(stage.id)}
                        className="flex-row items-center justify-between">
                        <HStack className="flex-1 items-center gap-2">
                          {stage.name === 'Inoculation' && (
                            <>
                              <View className="ml-0" />
                              <Icon as={Syringe} size="md" className="text-typography-500" />
                            </>
                          )}
                          {stage.name === 'Spawn Colonization' && (
                            <>
                              <View className="ml-0" />
                              <Icon as={Wheat} size="md" className="text-typography-500" />
                            </>
                          )}
                          {stage.name === 'Bulk Colonization' && (
                            <>
                              <View className="ml-0" />
                              <Icon as={Box} size="md" className="text-typography-500" />
                            </>
                          )}
                          {stage.name === 'Fruiting' && (
                            <>
                              <View className="ml-0" />
                              <MaterialCommunityIcons
                                name="mushroom-outline"
                                size={18}
                                color="#9ca3af"
                              />
                            </>
                          )}
                          {stage.name === 'Harvest' && (
                            <>
                              <View className="ml-0" />
                              <Icon as={ShoppingBasket} size="md" className="text-typography-500" />
                            </>
                          )}
                          {status === 'active' ? (
                            <Text className="text-lg font-semibold text-typography-700">
                              {stage.name}
                            </Text>
                          ) : (
                            <Text className={`text-lg ${stage.color}`}>{stage.name}</Text>
                          )}
                          <View className="ml-auto">
                            {getCostBadge(getBulkStageDataKey(stage.id))}
                          </View>
                          {getStatusBadge(stage.id)}
                        </HStack>
                        <Icon
                          as={expandedStages.includes(stage.id) ? ChevronDown : ChevronRight}
                          size="md"
                          className="ml-2 text-primary-600"
                        />
                      </Pressable>
                    ) : (
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
                              <MaterialCommunityIcons
                                name="mushroom-outline"
                                size={20}
                                color="#9ca3af"
                              />
                            </>
                          )}
                          {stage.name === 'Harvest' && (
                            <>
                              <View className="ml-0.5" />
                              <Icon as={ShoppingBasket} size="md" className="text-typography-500" />
                            </>
                          )}
                          <Text className="text-lg text-typography-700">{stage.name}</Text>
                          <View className="ml-auto">
                            {getCostBadge(getBulkStageDataKey(stage.id))}
                          </View>
                          {getStatusBadge(stage.id)}
                        </HStack>
                      </HStack>
                    )}

                    {/* Count badges */}
                    <HStack space="xs" className="my-1 ml-3">
                      {renderCountBadges(stage.id)}
                    </HStack>
                  </VStack>

                  {/* Sub-section content */}
                  {(status !== 'pending' ||
                    (stage.id === 'inoculation' && currentStageIndex === -1)) && (
                    <VStack space="sm" className="mt-3">
                      {expandedStages.includes(stage.id) && (
                        <View className="mt-0 rounded-lg  bg-background-0">
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
                              grow={grow}
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
                              grow={grow}
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
                              grow={grow}
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
                              grow={grow}
                            />
                          )}
                          {stage.id === 'harvest' && (
                            <HarvestSection
                              growData={growData}
                              updateField={updateField}
                              activeDatePicker={activeDatePicker}
                              setActiveDatePicker={setActiveDatePicker}
                              handleDateChange={handleDateChange}
                              parseDate={parseDate}
                              status={status}
                              currentStageIndex={currentStageIndex}
                              stageIndex={index}
                              advanceToNextStage={advanceToNextStage}
                              stageData={getBulkStageData(getBulkStageDataKey(stage.id))}
                              onUpdateBulkStageData={(data) =>
                                updateBulkStageData(getBulkStageDataKey(stage.id), data)
                              }
                              grow={grow}
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

      {/* Totals Section */}
      <VStack space="md" className="border-t border-background-200 pt-6 pb-3">
        <Text className="text-lg font-semibold text-typography-700">Grow Totals</Text>
        
        <VStack space="sm" className="ml-3">
          {/* Total Cost */}
          <HStack className="items-center justify-between">
            <Text className="text-typography-700">Cost</Text>
            <InfoBadge
              text={`$${(() => {
                if (!growData.stages) return '0.00';
                let totalCost = 0;
                Object.values(growData.stages).forEach((stage: any) => {
                  if (stage?.items) {
                    stage.items.forEach((item: any) => {
                      totalCost += parseFloat(item.cost || '0') || 0;
                    });
                  }
                });
                return totalCost.toFixed(2);
              })()}`}
              variant="default"
              size="md"
            />
          </HStack>

          {/* Duration */}
          <HStack className="items-center justify-between">
            <Text className="text-typography-700">Duration</Text>
            <InfoBadge
              text={`${(() => {
                if (!growData.inoculation_date) return '0 days';
                
                const inoculationDate = parseDate(growData.inoculation_date);
                if (!inoculationDate) return '0 days';
                
                // Use completion date for completed grows, otherwise use today
                let endDate = new Date();
                if (growData.status === 'completed' || growData.current_stage === 'completed') {
                  if (growData.harvest_completion_date) {
                    endDate = parseDate(growData.harvest_completion_date) || new Date();
                  } else {
                    // Fall back to most recent flush date if no completion date
                    const flushDates = flushes
                      ?.map(flush => flush.harvest_date)
                      .filter(Boolean)
                      .map(date => new Date(date!))
                      .sort((a, b) => b.getTime() - a.getTime());
                    
                    if (flushDates && flushDates.length > 0) {
                      endDate = flushDates[0];
                    }
                  }
                }
                
                const diffTime = Math.abs(endDate.getTime() - inoculationDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
              })()}`}
              variant="default"
              size="md"
            />
          </HStack>

          {/* Dry Yield */}
          <HStack className="items-center justify-between">
            <Text className="text-typography-700">Dry Yield</Text>
            <InfoBadge
              text={`${(() => {
                const totalDry = flushes?.reduce((sum, flush) => 
                  sum + (parseFloat(flush.dry_yield_grams || '0') || 0), 0) || 0;
                return `${totalDry.toFixed(2)}g`;
              })()}`}
              variant="default"
              size="md"
            />
          </HStack>

          {/* Wet Yield */}
          <HStack className="items-center justify-between">
            <Text className="text-typography-700">Wet Yield</Text>
            <InfoBadge
              text={`${(() => {
                const totalWet = flushes?.reduce((sum, flush) => 
                  sum + (parseFloat(flush.wet_yield_grams || '0') || 0), 0) || 0;
                return `${totalWet.toFixed(2)}g`;
              })()}`}
              variant="default"
              size="md"
            />
          </HStack>
        </VStack>
      </VStack>
    </VStack>
  );
};
