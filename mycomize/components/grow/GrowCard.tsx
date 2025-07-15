import React, { useState, useEffect } from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  Circle,
  Disc2,
  Clock,
  DollarSign,
  Scale,
  SquarePen,
  Trash2,
  Layers,
} from 'lucide-react-native';
import { BulkGrowComplete, bulkGrowStatuses } from '~/lib/growTypes';
import { GatewayStatus } from './GatewayStatus';
import { InfoBadge } from '~/components/ui/info-badge';

interface GrowCardProps {
  grow: BulkGrowComplete;
  onDelete?: (growId: number) => Promise<void>;
}

export const GrowCard: React.FC<GrowCardProps> = ({ grow, onDelete }) => {
  const router = useRouter();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const getStatusColor = (status?: string) => {
    if (status === bulkGrowStatuses.CONTAMINATED) return 'text-error-500';
    if (status === bulkGrowStatuses.HARVESTED) return 'text-amber-600';
    return 'text-green-700';
  };

  const statusColor = getStatusColor(grow.status);

  // Define stages for timeline
  const stages = [
    { id: 'inoculation', name: 'Inoculation', dateField: 'inoculation_date' },
    { id: 'spawn_colonization', name: 'Spawn', dateField: 'full_spawn_colonization_date' },
    { id: 'bulk_colonization', name: 'Bulk', dateField: 'full_bulk_colonization_date' },
    { id: 'fruiting', name: 'Fruiting', dateField: 'fruiting_pin_date' },
    { id: 'harvest', name: 'Harvest', dateField: 'flushes' },
  ];

  // Calculate age from inoculation date
  const calculateAge = () => {
    if (!grow.inoculation_date) return 0;
    const inoculationDate = new Date(grow.inoculation_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - inoculationDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const growAge = calculateAge();

  // Determine current stage index
  const getCurrentStageIndex = () => {
    if (grow.current_stage) {
      if (
        grow.current_stage === 'completed' ||
        grow.status === 'completed' ||
        grow.status === bulkGrowStatuses.HARVESTED
      ) {
        return 4;
      }
      const index = stages.findIndex((s) => s.id === grow.current_stage);
      if (index !== -1) return index;
    }

    // Infer from dates and flushes
    if (grow.flushes && grow.flushes.length > 0) return 4;
    if (grow.fruiting_pin_date) return 3;
    if (grow.full_bulk_colonization_date) return 2;
    if (grow.full_spawn_colonization_date) return 1;
    if (grow.inoculation_date) return 0;

    return -1;
  };

  const currentStageIndex = getCurrentStageIndex();

  const getStageStatus = (index: number) => {
    if (
      grow.status === 'completed' ||
      grow.status === bulkGrowStatuses.HARVESTED ||
      grow.current_stage === 'completed'
    ) {
      return 'completed';
    }
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  // Check if grow is completed and can be turned into a tek
  const canCreateTek = () => {
    return (
      grow.status === 'completed' ||
      grow.status === bulkGrowStatuses.HARVESTED ||
      grow.current_stage === 'completed'
    );
  };

  const handleCreateTek = () => {
    // Navigate to tek creation from grow using router.push with query params
    router.push({
      pathname: '/teks/new',
      params: { fromGrow: grow.id.toString() },
    });
  };

  // Calculate total yields
  const calculateTotalYields = () => {
    const totalWetYield =
      grow.flushes?.reduce((sum, flush) => sum + (flush.wet_yield_grams || 0), 0) || 0;
    const totalDryYield =
      grow.flushes?.reduce((sum, flush) => sum + (flush.dry_yield_grams || 0), 0) || 0;
    return { totalWetYield, totalDryYield };
  };

  const { totalWetYield, totalDryYield } = calculateTotalYields();

  return (
    <Card className="w-11/12 rounded-xl bg-background-0">
      <VStack className="p-2">
        <View>
          {/* First row: Grow name and strain */}
          <HStack className="mb-3 items-center justify-between">
            <Heading size="lg">{grow.name}</Heading>
            {grow.variant && (
              <Text className="text-lg italic text-typography-500">{grow.variant}</Text>
            )}
            {/* If no variant but has species, show species on first row */}
            {!grow.variant && grow.species && (
              <Text className="text-lg italic text-typography-500">{grow.species}</Text>
            )}
          </HStack>

          {/* Second row: Location and species (if variant exists) */}
          {(grow.location || (grow.variant && grow.species)) && (
            <HStack className="mb-3 items-center justify-between">
              {grow.location && (
                <Text className="text-md text-typography-600">{grow.location}</Text>
              )}
              {grow.variant && grow.species && (
                <Text className="text-md italic text-typography-500">{grow.species}</Text>
              )}
            </HStack>
          )}

          {/* Third row: Stage timeline */}
          <VStack className="mb-4">
            {/* Timeline with icons and connecting lines */}
            <HStack className="items-center">
              {stages.map((stage, index) => {
                const status = getStageStatus(index);
                return (
                  <React.Fragment key={stage.id}>
                    {/* Stage indicator */}
                    <View className="items-center">
                      {status === 'completed' ? (
                        <Icon as={CheckCircle} size="md" className="text-blue-500" />
                      ) : status === 'active' ? (
                        <Icon as={Disc2} size="md" className="text-typography-900" />
                      ) : (
                        <Icon as={Circle} size="md" className="text-typography-300" />
                      )}
                    </View>

                    {/* Connecting line (except for last stage) */}
                    {index < stages.length - 1 && (
                      <View
                        className={`h-0.5 flex-1 ${
                          getStageStatus(index) === 'completed'
                            ? 'bg-blue-500'
                            : 'bg-typography-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </HStack>

            {/* Stage names centered under icons */}
            <HStack className="mt-1">
              {stages.map((stage, index) => {
                const status = getStageStatus(index);
                const isFirst = index === 0;
                const isLast = index === stages.length - 1;

                return (
                  <View
                    key={stage.id}
                    className="flex-1"
                    style={{
                      alignItems: isFirst ? 'flex-start' : isLast ? 'flex-end' : 'center',
                    }}>
                    <Text
                      className={`text-sm ${
                        status === 'active'
                          ? 'font-semibold text-typography-900'
                          : status === 'completed'
                            ? 'text-blue-500'
                            : 'text-typography-400'
                      }`}>
                      {stage.name}
                    </Text>
                  </View>
                );
              })}
            </HStack>
          </VStack>

          {/* Fourth row: Badge row with total cost, wet yield, dry yield, and duration */}
          <HStack className="mb-4 flex-wrap" space="sm">
            <InfoBadge
              text={`$${grow.total_cost?.toFixed(2) || '0.00'}`}
              icon={DollarSign}
              variant="default"
              size="md"
            />
            {totalWetYield > 0 && (
              <InfoBadge
                text={`${totalWetYield.toFixed(1)}g wet`}
                icon={Scale}
                variant="default"
                size="md"
              />
            )}
            {totalDryYield > 0 && (
              <InfoBadge
                text={`${totalDryYield.toFixed(1)}g dry`}
                icon={Scale}
                variant="success"
                size="md"
              />
            )}
            <InfoBadge
              text={growAge === 1 ? `${growAge} day` : `${growAge} days`}
              icon={Clock}
              variant="default"
              size="md"
            />
          </HStack>

          {/* Fifth row: IoT Gateways */}
          <VStack className="mb-4" space="xs">
            <Text className="mb-1 text-lg font-medium text-typography-600">IoT Gateways</Text>
            {(() => {
              // Get IoT gateways from the grow
              const gateways = grow.iot_gateways || [];
              return gateways.length > 0 ? (
                <VStack space="sm">
                  {gateways.map((gateway) => (
                    <GatewayStatus key={gateway.id} gateway={gateway} />
                  ))}
                </VStack>
              ) : (
                <Text className="text-md text-typography-400">None</Text>
              );
            })()}
          </VStack>

          {/* Last row: Grow tags */}
          {grow.tags && grow.tags.length > 0 && (
            <VStack className="mb-4" space="xs">
              <HStack space="xs" className="flex-wrap">
                {grow.tags.slice(0, 3).map((tag, index) => (
                  <Text key={index} className="text-md text-blue-400">
                    #{tag}
                  </Text>
                ))}
                {grow.tags.length > 3 && (
                  <Text className="text-xs text-typography-400">+{grow.tags.length - 3} more</Text>
                )}
              </HStack>
            </VStack>
          )}

          {/* Individual grow controls */}
          <HStack className="mt-2 justify-around" space="md">
            {canCreateTek() && (
              <Pressable onPress={handleCreateTek}>
                <Icon as={Layers} size="md" className="text-typography-300" />
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                router.push({
                  pathname: `/grows/[id]`,
                  params: { id: grow.id },
                });
              }}>
              <Icon as={SquarePen} size="md" className="text-typography-300" />
            </Pressable>
            {onDelete && (
              <Pressable onPress={() => setShowDeleteAlert(true)}>
                <Icon as={Trash2} size="md" className="text-typography-300" />
              </Pressable>
            )}
          </HStack>
        </View>
      </VStack>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={async () => {
          setShowDeleteAlert(false);
          if (onDelete) {
            await onDelete(grow.id);
          }
        }}
        title="Delete Grow"
        itemName={grow.name || grow.variant || 'grow'}
      />
    </Card>
  );
};
