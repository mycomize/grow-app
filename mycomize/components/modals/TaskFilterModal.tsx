import React from 'react';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Heading } from '~/components/ui/heading';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '~/components/ui/modal';
import { X, Circle, CircleCheckBig } from 'lucide-react-native';
import { bulkGrowStages, stageLabels } from '~/lib/growTypes';

interface TaskFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Available grow names from local storage
  availableGrowNames: string[];
  // Current filter values
  filterGrowName: string;
  filterStage: string;
  // Temporary filter values
  tempFilterGrowName: string;
  tempFilterStage: string;
  // Setters for temporary values
  setTempFilterGrowName: (value: string) => void;
  setTempFilterStage: (value: string) => void;
  // Handlers
  onApplyFilters: () => void;
  onClearAll: () => void;
}

export const TaskFilterModal: React.FC<TaskFilterModalProps> = ({
  isOpen,
  onClose,
  availableGrowNames,
  tempFilterGrowName,
  tempFilterStage,
  setTempFilterGrowName,
  setTempFilterStage,
  onApplyFilters,
  onClearAll,
}) => {
  // Stage options (all stages)
  const stageOptions = [
    { value: bulkGrowStages.INOCULATION, label: stageLabels[bulkGrowStages.INOCULATION] },
    {
      value: bulkGrowStages.SPAWN_COLONIZATION,
      label: stageLabels[bulkGrowStages.SPAWN_COLONIZATION],
    },
    {
      value: bulkGrowStages.BULK_COLONIZATION,
      label: stageLabels[bulkGrowStages.BULK_COLONIZATION],
    },
    { value: bulkGrowStages.FRUITING, label: stageLabels[bulkGrowStages.FRUITING] },
    { value: bulkGrowStages.HARVEST, label: stageLabels[bulkGrowStages.HARVEST] },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBackdrop style={{ backdropFilter: 'blur(100px)' }} />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <Heading size="lg">Task Filter</Heading>
          <ModalCloseButton onPress={onClose}>
            <Icon as={X} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <ScrollView>
            <VStack space="lg" className="mt-3">
              {/* Grow Name Filter */}
              <VStack space="md">
                <Text className="text-lg font-semibold text-typography-600">Grow Name</Text>
                <ScrollView className="max-h-48">
                  <VStack space="sm">
                    {/* All Grows option */}
                    <Pressable
                      onPress={() => setTempFilterGrowName('')}
                      className="rounded-lg border border-outline-200 p-3">
                      <HStack className="items-center justify-between">
                        <Text className="text-typography-600">All Grows</Text>
                        {tempFilterGrowName === '' && (
                          <Icon as={CircleCheckBig} className="text-blue-400" size="lg" />
                        )}
                        {tempFilterGrowName !== '' && (
                          <Icon as={Circle} className="text-typography-300" size="lg" />
                        )}
                      </HStack>
                    </Pressable>
                    {/* Individual grow name options */}
                    {availableGrowNames.map((growName) => (
                      <Pressable
                        key={growName}
                        onPress={() =>
                          setTempFilterGrowName(tempFilterGrowName === growName ? '' : growName)
                        }
                        className="rounded-lg border border-outline-200 p-3">
                        <HStack className="items-center justify-between">
                          <Text className="flex-1 text-typography-600" numberOfLines={2}>
                            {growName}
                          </Text>
                          {tempFilterGrowName === growName && (
                            <Icon as={CircleCheckBig} className="text-blue-400" size="lg" />
                          )}
                          {tempFilterGrowName !== growName && (
                            <Icon as={Circle} className="text-typography-300" size="lg" />
                          )}
                        </HStack>
                      </Pressable>
                    ))}
                    {availableGrowNames.length === 0 && (
                      <VStack className="items-center rounded-lg border border-dashed border-typography-300 p-6">
                        <Text className="text-center text-typography-500">No grows available</Text>
                        <Text className="text-center text-sm text-typography-400">
                          Add tasks to grows to see them here
                        </Text>
                      </VStack>
                    )}
                  </VStack>
                </ScrollView>
              </VStack>

              {/* Stage Filter */}
              <VStack space="md">
                <Text className="text-lg font-semibold text-typography-600">Grow Stage</Text>
                <VStack space="sm">
                  {/* All Stages option */}
                  <Pressable
                    onPress={() => setTempFilterStage('')}
                    className="rounded-lg border border-outline-200 p-3">
                    <HStack className="items-center justify-between">
                      <Text className="text-typography-600">All Stages</Text>
                      {tempFilterStage === '' && (
                        <Icon as={CircleCheckBig} className="text-blue-400" size="lg" />
                      )}
                      {tempFilterStage !== '' && (
                        <Icon as={Circle} className="text-typography-300" size="lg" />
                      )}
                    </HStack>
                  </Pressable>
                  {/* Individual stage options */}
                  {stageOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        setTempFilterStage(tempFilterStage === option.value ? '' : option.value)
                      }
                      className="rounded-lg border border-outline-200 p-3">
                      <HStack className="items-center justify-between">
                        <Text className="text-typography-600">{option.label}</Text>
                        {tempFilterStage === option.value && (
                          <Icon as={CircleCheckBig} className="text-blue-400" size="lg" />
                        )}
                        {tempFilterStage !== option.value && (
                          <Icon as={Circle} className="text-typography-300" size="lg" />
                        )}
                      </HStack>
                    </Pressable>
                  ))}
                </VStack>
              </VStack>
            </VStack>
          </ScrollView>
        </ModalBody>
        <ModalFooter>
          <HStack space="sm" className="w-full justify-between">
            <Button variant="outline" onPress={onClearAll}>
              <ButtonText>Clear All</ButtonText>
            </Button>
            <Button variant="outline" onPress={onClose}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button action="positive" onPress={onApplyFilters}>
              <ButtonText className="text-typography-600">Apply Filters</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
