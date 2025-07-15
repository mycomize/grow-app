import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
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
import { Check, X } from 'lucide-react-native';

import { TEK_TYPES } from '~/lib/tekTypes';

interface TypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  onConfirm: () => void;
}

export function TypeSelectionModal({
  isOpen,
  onClose,
  selectedType,
  onTypeChange,
  onConfirm,
}: TypeSelectionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text className="text-lg font-semibold">Select Tek Type</Text>
          <ModalCloseButton onPress={onClose}>
            <Icon as={X} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="lg">
            <VStack space="md">
              {Object.entries(TEK_TYPES).map(([key, value]) => (
                <Pressable
                  key={key}
                  onPress={() => onTypeChange(value)}
                  className="flex-row items-center justify-between rounded-lg border border-outline-200 p-4">
                  <Text className="text-typography-900">{value}</Text>
                  {selectedType === value && (
                    <Icon as={Check} className="text-success-600" size="sm" />
                  )}
                </Pressable>
              ))}
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack space="sm" className="w-full justify-end">
            <Button variant="outline" className="border border-outline-300" onPress={onClose}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button action="positive" onPress={onConfirm}>
              <ButtonText className="text-white">Select Type</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
