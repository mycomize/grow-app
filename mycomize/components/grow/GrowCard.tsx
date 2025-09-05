import React, { useState, useMemo } from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';
import { GrowActionSheet } from '~/components/ui/grow-action-sheet';
import { useRouter } from 'expo-router';
import {
  CircuitBoard,
  CheckCircle,
  Circle,
  Disc2,
  Clock,
  DollarSign,
  Weight,
  SquarePen,
  Trash2,
  Layers,
  Heart,
  AlertTriangle,
  Skull,
  MapPin,
} from 'lucide-react-native';
import { BulkGrowComplete, bulkGrowStatuses } from '~/lib/types/growTypes';
import { InfoBadge } from '~/components/ui/info-badge';
import { useGrowDuration, useGrowTotalDryYield } from '~/lib/stores/growStore';

interface GrowCardProps {
  grow: BulkGrowComplete;
  onDelete?: (growId: number) => Promise<void>;
  onTagPress?: (tag: string) => void;
}

export const GrowCard: React.FC<GrowCardProps> = ({ grow, onDelete, onTagPress }) => {
  const router = useRouter();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Use efficient selectors for duration and dry yield calculations
  const growAge = useGrowDuration(grow);
  const totalDryYield = useGrowTotalDryYield(grow);

  // Memoize IoT entities to prevent infinite re-renders
  const iotEntities = useMemo(() => grow.iot_entities || [], [grow.iot_entities]);

  // Fetch gateway details and connection statuses for this grow's IoT entities
  //  const { gateways, connectionStatuses, loading: gatewaysLoading } = useGrowGateways(iotEntities);

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

  // Duration is now calculated by the efficient selector

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

  const handleConvertToTek = () => {
    // Navigate to tek creation from grow using router.push with query params
    router.push({
      pathname: '/teks/new',
      params: { fromGrow: JSON.stringify(grow) },
    });
  };

  // Calculate overall health status based on stage statuses
  const calculateHealthStatus = () => {
    // Get all stage statuses for completed and active stages
    const stageStatuses: string[] = [];

    // Check each stage status if the stage is completed or active
    stages.forEach((stage, index) => {
      const status = getStageStatus(index);
      if (status === 'completed' || status === 'active') {
        let stageHealthStatus = null;

        // Map stage to corresponding status field
        switch (stage.id) {
          case 'inoculation':
            stageHealthStatus = grow.inoculation_status;
            break;
          case 'spawn_colonization':
            stageHealthStatus = grow.spawn_colonization_status;
            break;
          case 'bulk_colonization':
            stageHealthStatus = grow.bulk_colonization_status;
            break;
          case 'fruiting':
            stageHealthStatus = grow.fruiting_status;
            break;
          case 'harvest':
            // For harvest stage, use overall grow status
            stageHealthStatus = grow.status;
            break;
        }

        if (stageHealthStatus) {
          stageStatuses.push(stageHealthStatus.toLowerCase());
        }
      }
    });

    // Priority: contaminated > suspect > healthy
    if (stageStatuses.some((status) => status === 'contaminated')) {
      return 'contaminated';
    }
    if (stageStatuses.some((status) => status === 'suspect')) {
      return 'suspect';
    }
    return 'healthy';
  };

  const healthStatus = calculateHealthStatus();

  // Get health status display info
  const getHealthStatusInfo = () => {
    if (grow.harvest_completion_date) {
        return { text: 'Complete', icon: CheckCircle, variant: 'success' as const };
    }

    switch (healthStatus) {
      case 'contaminated':
        return { text: 'Contam', icon: Skull, variant: 'error' as const };
      case 'suspect':
        return { text: 'Suspect', icon: AlertTriangle, variant: 'warning' as const };
      default:
        return { text: 'Healthy', icon: Heart, variant: 'healthy' as const };
    }
  };

  const healthInfo = getHealthStatusInfo();

  return (
      <>
      <VStack className="border-t border-outline-50 py-4 px-6 bg-background-0 w-full">
        <View>
          {/* First row: Grow name and strain */}
          <HStack className="mb-0 items-center justify-between">
            <Text
              className="flex-1 text-lg font-bold text-typography-700"
              numberOfLines={1}
              ellipsizeMode="tail">
              {grow.name}
            </Text>
            {grow.variant && (
              <Text
                className="text-right text-lg text-typography-700"
                numberOfLines={1}
                ellipsizeMode="tail">
                {grow.variant}
              </Text>
            )}
            {/* If no variant but has species, show species on first row */}
            {!grow.variant && grow.species && (
              <Text
                className="text-right text-lg text-typography-700"
                numberOfLines={1}
                ellipsizeMode="tail">
                {grow.species}
              </Text>
            )}
          </HStack>

          {/* Second row: Location and species (if variant exists) */}
          {(grow.location || (grow.variant && grow.species)) && (
            <HStack className="mb-1 items-center">
              {grow.location && (
                <>
                  <Icon as={MapPin} className="mr-1 text-typography-400" />
                  <Text
                    className="text-md text-typography-500"
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {grow.location}
                  </Text>
                </>
              )}
              {grow.variant && grow.species && (
                <Text
                  className="text-md ml-auto text-right italic text-typography-500"
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {grow.species}
                </Text>
              )}
            </HStack>
          )}

          {/* Third row: Stage timeline */}
          <VStack className="mb-5 mt-3">
            {/* Timeline with icons and connecting lines */}
            <HStack className="items-center">
              {stages.map((stage, index) => {
                const status = getStageStatus(index);
                return (
                  <React.Fragment key={stage.id}>
                    {/* Stage indicator */}
                    <View className="items-center">
                      {status === 'completed' ? (
                        <Icon as={CheckCircle} size="md" className="text-blue-400" />
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
                            ? 'bg-blue-400'
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
                          ? 'font-semibold text-typography-800'
                          : status === 'completed'
                            ? 'text-blue-400'
                            : 'text-typography-400'
                      }`}>
                      {stage.name}
                    </Text>
                  </View>
                );
              })}
            </HStack>
          </VStack>

            <HStack className="mb-2">
              <Text className="text-typography-600">Status: </Text>
              <HStack className="ml-auto">
                <InfoBadge
                  text={healthInfo.text}
                  icon={healthInfo.icon}
                  variant={healthInfo.variant}
                  size="md"
                />
              </HStack>
            </HStack>
            
          
          {grow.inoculation_date &&
            <HStack className="mb-2">
              <Text className="text-typography-600">Inoculation Date: </Text>
              <Text className="text-typography-500 italic">{grow.inoculation_date}</Text>
              <HStack className="ml-auto">
              <InfoBadge
                text={growAge === 1 ? `${growAge} day` : `${growAge} days`}
                icon={Clock}
                variant="default"
                size="md"
              />
              </HStack>
            </HStack>
          }
          
            <HStack className="mb-2">
              <Text className="text-typography-600">Cost: </Text>
              <HStack className="ml-auto">
                <InfoBadge
                  text={`${grow.total_cost?.toFixed(2) || '0.00'}`}
                  icon={DollarSign}
                  variant="default"
                  size="md"
                />
              </HStack>
            </HStack>
            
            <HStack className="mb-2">
              <Text className="text-typography-600">Yield: </Text>
              <HStack className="ml-auto">
                <InfoBadge
                  text={`${totalDryYield.toFixed(1)}g`}
                  icon={Weight}
                  variant="default"
                  size="md"
                />
              </HStack>
            </HStack>
            
          {/* Fifth row: IoT Gateways with Connection Status - Only show if there are IoT entities */}
          {iotEntities.length > 0 && (
            <VStack className="mb-4 mt-1" space="xs">
              <HStack className="items-center gap-2">
                <Icon as={CircuitBoard} className="text-typography-400" size="lg" />
                <Text className="text-lg font-medium text-typography-600">IoT Gateways</Text>
              </HStack>
              {(() => {
                //if (gatewaysLoading) {
                //  return (
                //    <HStack className="items-center justify-center py-2">
                //      <Spinner size="small" />
                //    </HStack>
                //  );
                //}

                //if (gateways.length === 0) {
                //  return (
                //    <Text className="text-md text-typography-400">Gateway data unavailable</Text>
                //  );
                //}

                // Show each gateway with name and connection status
                //return (
                //  <VStack space="sm">
                //    {gateways.map((gateway) => {
                //      const connectionStatus = connectionStatuses[gateway.id] || 'unknown';
                //      const badgeProps = getConnectionBadgeProps(connectionStatus);

                //      return (
                //        <HStack key={gateway.id} className="items-center justify-between">
                //          <Text
                //            className="text-md ml-3 flex-1 text-typography-600"
                //            numberOfLines={1}
                //            ellipsizeMode="tail">
                //            {gateway.name || 'Unnamed Gateway'}
                //          </Text>
                //          <InfoBadge {...badgeProps} size="sm" />
                //        </HStack>
                //      );
                //    })}
                //  </VStack>
                //);

                // Since the gateway logic is commented out, just return null for now
                return null;
              })()}
            </VStack>
          )}

          {/* Last row: Grow tags */}
          {Array.isArray(grow.tags) && grow.tags.length > 0 && (
            <VStack className="mb-1" space="xs">
              <HStack space="xs" className="flex-wrap">
                {grow.tags.slice(0, 3).map((tag, index) => (
                  <Pressable
                    key={index}
                    onPress={() => onTagPress?.(tag)}
                    className="rounded-md px-0 py-0.5">
                    <Text className="text-md text-blue-400">#{tag}</Text>
                  </Pressable>
                ))}
                {grow.tags.length > 3 && (
                  <Text className="text-xs text-typography-400">+{grow.tags.length - 3} more</Text>
                )}
              </HStack>
            </VStack>
          )}

          {/* Individual grow controls */}
          <HStack className="mt-2 justify-around" space="md">
            <Pressable onPress={() => setShowActionSheet(true)}>
              <Icon as={Layers} size="md" className="text-typography-300" />
            </Pressable>
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

      {/* Action Sheet */}
      <GrowActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onConvertToTek={handleConvertToTek}
        growName={grow.name || grow.variant || 'grow'}
      />

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
      </>
  );
};
