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
import { Button, ButtonText } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Icon } from '~/components/ui/icon';
import { X } from 'lucide-react-native';
import { MonotubTekTemplate } from '~/lib/templateTypes';

interface TemplateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: MonotubTekTemplate;
  onUseForNewGrow: () => void;
  onCopyToNewTek: () => void;
}

export const TemplateActionModal: React.FC<TemplateActionModalProps> = ({
  isOpen,
  onClose,
  template,
  onUseForNewGrow,
  onCopyToNewTek,
}) => {
  const handleUseForNewGrow = () => {
    onUseForNewGrow();
    onClose();
  };

  const handleCopyToNewTek = () => {
    onCopyToNewTek();
    onClose();
  };

  // Only show options if template is a monotub
  const isMonotub = template.type.toLowerCase() === 'monotub';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading className="text-lg font-semibold">Template Actions</Heading>
          <ModalCloseButton>
            <Icon as={X} size="md" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <Text className="text-sm text-typography-600">
              What would you like to do with "{template.name}"?
            </Text>

            {isMonotub && (
              <>
                <Button variant="outline" className="w-full" onPress={handleUseForNewGrow}>
                  <ButtonText>Use for New Grow</ButtonText>
                </Button>

                <Button variant="outline" className="w-full" onPress={handleCopyToNewTek}>
                  <ButtonText>Copy to New Tek</ButtonText>
                </Button>
              </>
            )}

            {!isMonotub && (
              <Text className="text-center text-sm text-typography-500">
                This template is not a monotub template. Actions are only available for monotub
                templates.
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={onClose}>
            <ButtonText>Cancel</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
