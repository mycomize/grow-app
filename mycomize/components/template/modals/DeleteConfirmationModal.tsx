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
import { X, AlertTriangle } from 'lucide-react-native';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <VStack space="sm">
            <HStack className="items-center justify-between">
              <HStack className="items-center" space="sm">
                <Icon as={AlertTriangle} className="text-error-600" size="lg" />
                <Text className="text-lg font-semibold">{title}</Text>
              </HStack>
              <ModalCloseButton>
                <Icon as={X} />
              </ModalCloseButton>
            </HStack>
          </VStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="sm">
            <Text className="text-typography-700">{message}</Text>
            {itemName && <Text className="font-medium text-typography-900">"{itemName}"</Text>}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button variant="outline" action="secondary" onPress={onClose} className="flex-1">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button variant="solid" action="negative" onPress={handleConfirm} className="flex-1">
              <ButtonText>Delete</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
