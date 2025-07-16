import React from 'react';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Heading } from '~/components/ui/heading';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '~/components/ui/modal';
import { Circle, CircleCheckBig, X } from 'lucide-react-native';

export type SortOption =
  | 'name'
  | 'species'
  | 'variant'
  | 'inoculationDate'
  | 'totalCost'
  | 'wetYield'
  | 'dryYield'
  | 'duration';

interface GrowSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSortChange: (sortBy: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'species', label: 'Species' },
  { value: 'variant', label: 'Variant' },
  { value: 'inoculationDate', label: 'Inoculation Date' },
  { value: 'totalCost', label: 'Total Cost' },
  { value: 'wetYield', label: 'Wet Yield' },
  { value: 'dryYield', label: 'Dry Yield' },
  { value: 'duration', label: 'Duration (Days)' },
];

export function GrowSortModal({ isOpen, onClose, currentSort, onSortChange }: GrowSortModalProps) {
  const [tempSortBy, setTempSortBy] = React.useState<SortOption>(currentSort);

  React.useEffect(() => {
    if (isOpen) {
      setTempSortBy(currentSort);
    }
  }, [isOpen, currentSort]);

  const handleConfirm = () => {
    onSortChange(tempSortBy);
    onClose();
  };

  const handleCancel = () => {
    setTempSortBy(currentSort);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">Grow Sort</Heading>
          <ModalCloseButton onPress={handleCancel}>
            <Icon as={X} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="lg" className="mt-3">
            <VStack space="md">
              {sortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setTempSortBy(option.value)}
                  className="flex-row items-center justify-between rounded-lg border border-outline-200 p-4">
                  <Text className="text-typography-900">{option.label}</Text>
                  {tempSortBy === option.value && (
                    <Icon as={CircleCheckBig} className="text-blue-400" size="lg" />
                  )}
                  {tempSortBy !== option.value && (
                    <Icon as={Circle} className="text-typography-300" size="lg" />
                  )}
                </Pressable>
              ))}
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack space="sm" className="w-full justify-end">
            <Button variant="outline" onPress={handleCancel}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button action="positive" onPress={handleConfirm}>
              <ButtonText className="text-typography-900">Apply Sort</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
