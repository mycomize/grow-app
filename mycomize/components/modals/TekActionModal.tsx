import React, { useState } from 'react';
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
import { Button, ButtonText } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { X, Import, Copy, Check } from 'lucide-react-native';
import { BulkGrowTek } from '~/lib/types/tekTypes';

interface TekActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tek: BulkGrowTek;
  onUseForNewGrow: () => void;
  onCopyToNewTek: () => void;
}

export const TekActionModal: React.FC<TekActionModalProps> = ({
  isOpen,
  onClose,
  tek,
  onUseForNewGrow,
  onCopyToNewTek,
}) => {
  const [selectedAction, setSelectedAction] = useState<string>('');

  const handleConfirm = () => {
    if (selectedAction === 'new-grow') {
      onUseForNewGrow();
    } else if (selectedAction === 'copy-tek') {
      onCopyToNewTek();
    }
    onClose();
  };

  const actions = [
    {
      id: 'new-grow',
      label: 'Import to new grow',
      icon: Import,
    },
    {
      id: 'copy-tek',
      label: 'Copy to new tek',
      icon: Copy,
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text className="text-lg font-semibold">Tek Actions</Text>
          <ModalCloseButton onPress={onClose}>
            <Icon as={X} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="lg">
            <Text className="text-typography-600">
              What would you like to do with "{tek.name}"?
            </Text>
            <VStack space="md">
              {actions.map((action) => (
                <Pressable
                  key={action.id}
                  onPress={() => setSelectedAction(action.id)}
                  className="flex-row items-center justify-between rounded-lg border border-outline-200 p-4">
                  <HStack className="items-center" space="sm">
                    <Icon as={action.icon} className="text-typography-600" size="sm" />
                    <Text className="text-typography-900">{action.label}</Text>
                  </HStack>
                  {selectedAction === action.id && (
                    <Icon as={Check} className="text-success-600" size="sm" />
                  )}
                </Pressable>
              ))}
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack space="sm" className="w-full justify-end">
            <Button variant="outline" onPress={onClose}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button action="positive" onPress={handleConfirm} isDisabled={!selectedAction}>
              <ButtonText className="text-white">Confirm</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
