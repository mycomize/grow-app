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
import { X, AlertTriangle, Globe } from 'lucide-react-native';

export type ConfirmationType = 'delete' | 'make-public' | 'warning' | 'info';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: ConfirmationType;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
}

const getTypeConfig = (type: ConfirmationType) => {
  switch (type) {
    case 'delete':
      return {
        icon: AlertTriangle,
        iconColor: 'text-error-600',
        confirmAction: 'negative' as const,
        confirmButtonText: 'Delete',
      };
    case 'make-public':
      return {
        icon: Globe,
        iconColor: 'text-typography-500',
        confirmAction: 'positive' as const,
        confirmButtonText: 'Make Public',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconColor: 'text-warning-600',
        confirmAction: 'positive' as const,
        confirmButtonText: 'Continue',
      };
    case 'info':
      return {
        icon: AlertTriangle,
        iconColor: 'text-info-600',
        confirmAction: 'positive' as const,
        confirmButtonText: 'OK',
      };
    default:
      return {
        icon: AlertTriangle,
        iconColor: 'text-warning-600',
        confirmAction: 'positive' as const,
        confirmButtonText: 'Continue',
      };
  }
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  itemName,
  confirmText,
  cancelText = 'Cancel',
}) => {
  const config = getTypeConfig(type);

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
                <Icon as={config.icon} className={config.iconColor} size="lg" />
                <Text className="text-lg font-semibold">{title}</Text>
              </HStack>
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
              <ButtonText>{cancelText}</ButtonText>
            </Button>
            <Button
              variant="solid"
              action={config.confirmAction}
              onPress={handleConfirm}
              className="flex-1">
              <ButtonText className="text-white">
                {confirmText || config.confirmButtonText}
              </ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
