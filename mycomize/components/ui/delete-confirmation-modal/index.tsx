import React from 'react';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { HStack } from '~/components/ui/hstack';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '~/components/ui/modal';
import { X } from 'lucide-react-native';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  isDeleting?: boolean;
  confirmText?: string;
  itemName?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  message,
  isDeleting = false,
  confirmText = 'Delete',
  itemName,
}) => {
  const defaultMessage = itemName
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    : 'Are you sure you want to delete this item? This action cannot be undone.';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">{title}</Heading>
          <ModalCloseButton>
            <Icon as={X} className="text-typography-500" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <Text>{message || defaultMessage}</Text>
        </ModalBody>
        <ModalFooter>
          <HStack space="md">
            <Button variant="outline" action="secondary" onPress={onClose} isDisabled={isDeleting}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button variant="solid" action="negative" onPress={onConfirm} isDisabled={isDeleting}>
              <ButtonText className="text-white">
                {isDeleting ? 'Deleting...' : confirmText}
              </ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
