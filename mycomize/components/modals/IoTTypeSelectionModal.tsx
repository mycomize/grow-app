import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { Check } from 'lucide-react-native';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from '~/components/ui/modal';

interface IoTType {
  id: string;
  name: string;
  description: string;
}

interface IoTTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType?: string;
  onSelectType: (type: string) => void;
}

const IOT_TYPES: IoTType[] = [
  {
    id: 'home_assistant',
    name: 'Home Assistant',
    description: 'Connect to your Home Assistant instance',
  },
];

export function IoTTypeSelectionModal({
  isOpen,
  onClose,
  currentType,
  onSelectType,
}: IoTTypeSelectionModalProps) {
  const handleSelectType = (type: string) => {
    onSelectType(type);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text className="text-lg font-semibold">IoT Gateway Type</Text>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody>
          <VStack space="sm">
            {IOT_TYPES.map((type) => (
              <Pressable
                key={type.id}
                onPress={() => handleSelectType(type.id)}
                className="rounded-md border border-outline-200 p-4">
                <HStack className="items-center justify-between">
                  <VStack className="flex-1">
                    <Text className="font-medium">{type.name}</Text>
                    <Text className="text-sm text-typography-500">{type.description}</Text>
                  </VStack>
                  {currentType === type.id && (
                    <Icon as={Check} size="lg" className="text-success-600" />
                  )}
                </HStack>
              </Pressable>
            ))}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
