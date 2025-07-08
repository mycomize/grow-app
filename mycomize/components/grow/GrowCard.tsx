import React, { useState, useEffect } from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { Button, ButtonText } from '~/components/ui/button';
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
  X,
  Layers,
} from 'lucide-react-native';
import { Grow, stageLabels, statusLabels, growStatuses } from '~/lib/growTypes';
import { GatewayStatus } from './GatewayStatus';
import { InfoBadge } from '~/components/ui/info-badge';

interface GrowCardProps {
  grow: Grow;
  onDelete?: (growId: number) => Promise<void>;
}

export const GrowCard: React.FC<GrowCardProps> = ({ grow, onDelete }) => {
  const router = useRouter();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const getStatusColor = (status: string) => {
    if (status === growStatuses.CONTAMINATED) return 'text-error-500';
    if (status === growStatuses.HARVESTED) return 'text-amber-600';
    return 'text-green-700';
  };

  const statusColor = getStatusColor(grow.status);

  // Define stages for timeline
  const stages = [
    { id: 'inoculation', name: 'Inoculation', dateField: 'inoculation_date' },
    { id: 'spawn_colonization', name: 'Spawn', dateField: 'spawn_colonization_date' },
    { id: 'bulk_colonization', name: 'Bulk', dateField: 'bulk_colonization_date' },
    { id: 'fruiting', name: 'Fruiting', dateField: 'fruiting_start_date' },
    { id: 'harvest', name: 'Harvest', dateField: 'harvest_date' },
  ];

  // Determine current stage index
  const getCurrentStageIndex = () => {
    if (grow.current_stage) {
      if (
        grow.current_stage === 'completed' ||
        grow.status === 'completed' ||
        grow.status === growStatuses.HARVESTED
      ) {
        return 4;
      }
      const index = stages.findIndex((s) => s.id === grow.current_stage);
      if (index !== -1) return index;
    }

    // Infer from dates
    if (grow.harvest_date) return 4;
    if (grow.fruiting_start_date) return 3;
    if (grow.bulk_colonization_date) return 2;
    if (grow.spawn_colonization_date) return 1;
    if (grow.inoculation_date || grow.inoculationDate) return 0;

    return -1;
  };

  const currentStageIndex = getCurrentStageIndex();

  const getStageStatus = (index: number) => {
    if (
      grow.status === 'completed' ||
      grow.status === growStatuses.HARVESTED ||
      grow.current_stage === 'completed'
    ) {
      return 'completed';
    }
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  // Check if grow is completed and can be turned into a template
  const canCreateTemplate = () => {
    return (
      grow.status === 'completed' ||
      grow.status === growStatuses.HARVESTED ||
      grow.current_stage === 'completed'
    );
  };

  const handleCreateTemplate = () => {
    // Navigate to template creation from grow using router.push with query params
    router.push({
      pathname: '/templates/new',
      params: { fromGrow: grow.id.toString() },
    });
  };

  return (
    <Card className="w-11/12 rounded-xl bg-background-0">
      <VStack className="p-2">
        <View>
          {/* Header with strain and species */}
          <HStack className="mb-5 items-center justify-between">
            <Heading size="lg">{grow.variant}</Heading>
            <Text className="text-lg italic text-typography-500">{grow.species}</Text>
          </HStack>

          {/* Horizontal Timeline */}
          <VStack className="mb-5">
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
            {/* Info badge row */}
            <HStack className="mt-4" space="md">
              <InfoBadge text={`${grow.age || 0} days`} icon={Clock} variant="default" size="md" />
              <InfoBadge
                text={`${grow.cost?.toFixed(2) || '0.00'}`}
                icon={DollarSign}
                variant="default"
                size="md"
              />
            </HStack>
          </VStack>

          {/* IoT Gateways Section */}
          <VStack className="mb-3" space="xs">
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

          {/* Individual grow controls */}
          <HStack className=" mt-2 justify-around" space="md">
            {canCreateTemplate() && (
              <Pressable onPress={handleCreateTemplate}>
                <Icon as={Layers} size="xl" className="text-primary-600" />
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                router.push({
                  pathname: `/grows/[id]/edit`,
                  params: { id: grow.id },
                });
              }}>
              <Icon as={SquarePen} size="xl" />
            </Pressable>
            {onDelete && (
              <Pressable onPress={() => setShowDeleteAlert(true)}>
                <Icon as={Trash2} size="xl" className="text-error-500" />
              </Pressable>
            )}
          </HStack>

          {/* Harvest info if applicable */}
          {grow.harvestDate && (grow.harvestDryWeight > 0 || grow.harvestWetWeight > 0) && (
            <HStack className="mt-2 items-center justify-center rounded-lg bg-success-50 p-2">
              <Icon as={Scale} size="sm" className="mr-2 text-success-700" />
              <Text className="text-sm font-medium text-success-700">
                {grow.harvestDryWeight > 0 ? `${grow.harvestDryWeight}g dry` : ''}
                {grow.harvestDryWeight > 0 && grow.harvestWetWeight > 0 ? ' / ' : ''}
                {grow.harvestWetWeight > 0 ? `${grow.harvestWetWeight}g wet` : ''}
              </Text>
            </HStack>
          )}
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
        itemName={grow.variant}
      />
    </Card>
  );
};
