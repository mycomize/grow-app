import React from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '~/components/ui/modal';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { ScrollView } from '~/components/ui/scroll-view';
import { X, Unlink } from 'lucide-react-native';
import { IoTEntity } from '~/lib/iot/iot';
import { BulkGrow, stageLabels } from '~/lib/types/growTypes';

interface IoTUnlinkConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'bulk' | 'individual';
  selectedEntities: IoTEntity[];
  grows: BulkGrow[];
}

export const IoTUnlinkConfirmationModal: React.FC<IoTUnlinkConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mode,
  selectedEntities,
  grows,
}) => {
  // Create a mapping from grow ID to grow name for quick lookup
  const growIdToName = grows.reduce(
    (acc, grow) => {
      acc[grow.id] = grow.name;
      return acc;
    },
    {} as Record<number, string>
  );

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const renderEntityDetails = () => {
    if (mode === 'individual' && selectedEntities.length === 1) {
      const entity = selectedEntities[0];
      const grow = entity.linked_grow_id ? grows.find((g) => g.id === entity.linked_grow_id) : null;
      const growName = grow ? grow.name : entity.linked_grow_id ? 'Unknown Grow' : 'No Grow';
      const variantOrSpecies = grow?.variant || grow?.species || '';
      const stageName = entity.linked_stage
        ? stageLabels[entity.linked_stage as keyof typeof stageLabels] || entity.linked_stage
        : '';

      return (
        <VStack space="sm" className="rounded-lg bg-background-0 px-2 py-4">
          <HStack className="items-center justify-between">
            <Text className="font-semibold italic text-typography-600">{growName}</Text>
            {variantOrSpecies && (
              <Text className="font-medium italic text-typography-400">{variantOrSpecies}</Text>
            )}
          </HStack>
          {stageName && <Text className="text-typography-500">{stageName}</Text>}
          <HStack key={entity.entity_name} space="xs" className="ml-4 items-center">
            <Text>•</Text>
            <Text className="flex-1 text-typography-600">
              {entity.friendly_name || entity.entity_name}
            </Text>
          </HStack>
        </VStack>
      );
    }

    // Bulk mode - group entities by grow and then by stage
    const entitiesByGrow = selectedEntities.reduce(
      (acc, entity) => {
        const grow = entity.linked_grow_id
          ? grows.find((g) => g.id === entity.linked_grow_id)
          : null;
        const growName = grow ? grow.name : entity.linked_grow_id ? 'Unknown Grow' : 'No Grow';
        if (!acc[growName]) acc[growName] = { grow: grow || null, entities: [] };
        acc[growName].entities.push(entity);
        return acc;
      },
      {} as Record<string, { grow: BulkGrow | null; entities: IoTEntity[] }>
    );

    return (
      <ScrollView
        className="max-h-52 rounded-lg bg-background-50 px-4 pb-0 pt-4"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}>
        <VStack space="lg" className="pb-8">
          {Object.entries(entitiesByGrow).map(([growName, { grow, entities }]) => {
            const variantOrSpecies = grow?.variant || grow?.species || '';

            // Group entities by stage within this grow
            const entitiesByStage = entities.reduce(
              (acc, entity) => {
                const stageName = entity.linked_stage
                  ? stageLabels[entity.linked_stage as keyof typeof stageLabels] ||
                    entity.linked_stage
                  : '';
                const stageKey = stageName || 'No Stage';
                if (!acc[stageKey]) acc[stageKey] = [];
                acc[stageKey].push(entity);
                return acc;
              },
              {} as Record<string, IoTEntity[]>
            );

            return (
              <VStack key={growName} space="xs">
                <HStack className="items-center justify-between">
                  <Text className="font-semibold italic text-typography-600">{growName}</Text>
                  {variantOrSpecies && (
                    <Text className="italic text-typography-400">{variantOrSpecies}</Text>
                  )}
                </HStack>
                {Object.entries(entitiesByStage).map(([stageName, stageEntities]) => (
                  <VStack key={stageName} space="xs">
                    {stageName !== 'No Stage' && (
                      <Text className="mt-2 text-typography-500">{stageName}</Text>
                    )}
                    <VStack space="xs">
                      {stageEntities.map((entity) => (
                        <HStack key={entity.entity_name} space="xs" className="ml-4 items-center">
                          <Text>•</Text>
                          <Text className="flex-1 text-typography-600">
                            {entity.friendly_name || entity.entity_name}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </VStack>
                ))}
              </VStack>
            );
          })}
        </VStack>
      </ScrollView>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="w-11/12 max-w-2xl">
        <ModalHeader>
          <VStack space="sm">
            <HStack className="items-center justify-between">
              <HStack className="items-center" space="sm">
                <Icon as={Unlink} className="text-typography-500" size="lg" />
                <Text className="text-lg font-semibold">Unlink IoT Controls</Text>
              </HStack>
            </HStack>
          </VStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="md">
            <Text className="text-typography-700">
              {mode === 'bulk'
                ? `Are you sure you want to unlink ${selectedEntities.length} IoT control${selectedEntities.length === 1 ? '' : 's'} from their grow${selectedEntities.length === 1 ? '' : 's'} and stage${selectedEntities.length === 1 ? '' : 's'}?`
                : 'Are you sure you want to unlink this IoT control from its grow and stage?'}
            </Text>

            {renderEntityDetails()}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button variant="outline" action="secondary" onPress={onClose} className="flex-1">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button variant="solid" action="negative" onPress={handleConfirm} className="flex-1">
              <ButtonText className="text-white">Unlink</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
