import React from 'react';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Heading } from '~/components/ui/heading';
import { Icon } from '~/components/ui/icon';
import { Input, InputField } from '~/components/ui/input';
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
import { bulkGrowStatuses, bulkGrowStages, stageLabels, statusLabels } from '~/lib/growTypes';

interface GrowFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current filter values
  filterStatus: string;
  filterStage: string;
  filterSpecies: string;
  filterVariant: string;
  filterLocation: string;
  // Temporary filter values
  tempFilterStatus: string;
  tempFilterStage: string;
  tempFilterSpecies: string;
  tempFilterVariant: string;
  tempFilterLocation: string;
  // Setters for temporary values
  setTempFilterStatus: (value: string) => void;
  setTempFilterStage: (value: string) => void;
  setTempFilterSpecies: (value: string) => void;
  setTempFilterVariant: (value: string) => void;
  setTempFilterLocation: (value: string) => void;
  // Handlers
  onApplyFilters: () => void;
  onClearAll: () => void;
}

export const GrowFilterModal: React.FC<GrowFilterModalProps> = ({
  isOpen,
  onClose,
  tempFilterStatus,
  tempFilterStage,
  tempFilterSpecies,
  tempFilterVariant,
  tempFilterLocation,
  setTempFilterStatus,
  setTempFilterStage,
  setTempFilterSpecies,
  setTempFilterVariant,
  setTempFilterLocation,
  onApplyFilters,
  onClearAll,
}) => {
  // Status options (excluding completed)
  const statusOptions = [
    { value: bulkGrowStatuses.HEALTHY, label: statusLabels[bulkGrowStatuses.HEALTHY] },
    { value: bulkGrowStatuses.SUSPECT, label: statusLabels[bulkGrowStatuses.SUSPECT] },
    { value: bulkGrowStatuses.CONTAMINATED, label: statusLabels[bulkGrowStatuses.CONTAMINATED] },
  ];

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
          <Heading size="lg">Grow Filter</Heading>
          <ModalCloseButton onPress={onClose}>
            <Icon as={X} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <ScrollView>
            <VStack space="lg" className="mt-3">
              {/* Health Status Filter */}
              <VStack space="md">
                <Text className="text-lg font-semibold text-typography-600">Health Status</Text>
                <VStack space="sm">
                  {/* All Status option */}
                  <Pressable
                    onPress={() => setTempFilterStatus('')}
                    className="rounded-lg border border-outline-200 p-3">
                    <HStack className="items-center justify-between">
                      <Text className="text-typography-600">All</Text>
                      {tempFilterStatus === '' && (
                        <Icon as={CircleCheckBig} className="text-blue-400" size="lg" />
                      )}
                      {tempFilterStatus !== '' && (
                        <Icon as={Circle} className="text-typography-300" size="lg" />
                      )}
                    </HStack>
                  </Pressable>
                  {/* Individual status options */}
                  {statusOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        setTempFilterStatus(tempFilterStatus === option.value ? '' : option.value)
                      }
                      className="rounded-lg border border-outline-200 p-3">
                      <HStack className="items-center justify-between">
                        <Text className="text-typography-600">{option.label}</Text>
                        {tempFilterStatus === option.value && (
                          <Icon as={CircleCheckBig} className="text-blue-400" size="lg" />
                        )}
                        {tempFilterStatus !== option.value && (
                          <Icon as={Circle} className="text-typography-300" size="lg" />
                        )}
                      </HStack>
                    </Pressable>
                  ))}
                </VStack>
              </VStack>

              {/* Stage Filter */}
              <VStack space="md">
                <Text className="text-lg font-semibold text-typography-600">Current Stage</Text>
                <VStack space="sm">
                  {/* All Stages option */}
                  <Pressable
                    onPress={() => setTempFilterStage('')}
                    className="rounded-lg border border-outline-200 p-3">
                    <HStack className="items-center justify-between">
                      <Text className="text-typography-600">All</Text>
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

              {/* Species Filter */}
              <VStack space="md">
                <Text className="text-lg font-semibold text-typography-600">Species</Text>
                <Input>
                  <InputField value={tempFilterSpecies} onChangeText={setTempFilterSpecies} />
                </Input>
              </VStack>

              {/* Variant Filter */}
              <VStack space="md">
                <Text className="text-lg font-semibold text-typography-600">Variant</Text>
                <Input>
                  <InputField value={tempFilterVariant} onChangeText={setTempFilterVariant} />
                </Input>
              </VStack>

              {/* Location Filter */}
              <VStack space="md">
                <Text className="text-lg font-semibold text-typography-600">Location</Text>
                <Input>
                  <InputField
                    placeholder="Enter location (e.g., Tent A, Room 2)"
                    value={tempFilterLocation}
                    onChangeText={setTempFilterLocation}
                  />
                </Input>
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
