import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';

import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion';

import { Save, ChevronDown, ChevronRight, FileText, ServerCog, Trash2 } from 'lucide-react-native';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';
import { useGatewayStore, useCurrentGateway } from '~/lib/stores/iot/gatewayStore';
import { useEntityStore } from '~/lib/stores/iot/entityStore';
import { useAuthToken } from '~/lib/stores/authEncryptionStore';

// Import modular sections
import { BasicsSection } from '~/components/iot/sections/BasicsSection';
import { ControlPanelSection } from '~/components/iot/sections/ControlPanelSection';
import { NEW_GATEWAY_ID } from '~/lib/types/iotTypes';

interface IoTGatewayFormProps {
  gatewayId: string;
  saveButtonText?: string;
}

export function IoTGatewayForm({ gatewayId, saveButtonText = 'Save' }: IoTGatewayFormProps) {
  const token = useAuthToken();
  const router = useRouter();
  const currentGateway = useCurrentGateway();

  const {
    createGateway,
    createGatewayWithEntities,
    updateGateway,
    deleteGateway: deleteGatewayAction,
  } = useGatewayStore();

  const { clearPendingLinks } = useEntityStore();

  // Local UI state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
        return () => {
            clearPendingLinks();
        }
    }, [clearPendingLinks])
  )
  // Save gateway handler
  const handleSaveGateway = useCallback(async () => {
    if (!token) {
        router.replace('/login');
        return;
    }

    if (!currentGateway?.formData) {
        return;
    }

    setIsSaving(true);

    const saveStartTime = performance.now();
    console.log(`[IoTGatewayForm] Starting save operation for gateway ${gatewayId}`);

    try {
      if (gatewayId === 'new') {
        // Create new gateway - ensure all required fields are present
        const gatewayData = {
          name: currentGateway.formData.name || 'New Gateway',
          type: currentGateway.formData.type || 'home_assistant',
          description: currentGateway.formData.description || '',
          api_url: currentGateway.formData.api_url || '',
          api_key: currentGateway.formData.api_key || '',
        };

        await createGatewayWithEntities(token, gatewayData);
        router.back();
      } else if (currentGateway) {
        // Update existing gateway
        const updateStart = performance.now();
        const success = await updateGateway(token, currentGateway.id.toString(), currentGateway.formData);
        const updateEnd = performance.now();

        console.log(`[IoTGatewayForm] Gateway update completed in ${updateEnd - updateStart}ms`);

        if (success) {
          // Entity sync is handled by WebSocket real-time updates for existing gateways
          // Only new gateways or those with credential changes need explicit sync
          console.log(`[IoTGatewayForm] Skipping entity sync for existing gateway`);
          router.back();
        }
      }
    } catch (error) {
      console.error('Failed to save gateway:', error);
    } finally {
      const saveEndTime = performance.now();
      console.log(
        `[IoTGatewayForm] Complete save operation finished in ${saveEndTime - saveStartTime}ms`
      );
      setIsSaving(false);
    }
  }, [
    currentGateway,
    gatewayId,
    token,
    createGateway,
    createGatewayWithEntities,
    updateGateway,
    router,
  ]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  // Delete gateway handler
  const handleDeleteGateway = useCallback(async () => {
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!currentGateway || currentGateway.id === NEW_GATEWAY_ID) {
      return;       
    }

    setIsDeleting(true);

    try {
      const success = await deleteGatewayAction(token, currentGateway.id.toString());

      if (success) {
        router.back();
      }
    } catch (error) {
      console.error('Failed to delete gateway:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [currentGateway, token, deleteGatewayAction, router]);

  return (
    <VStack className="flex-1 bg-background-50">
      <ScrollView className="flex-1">
        <VStack className="px-2 pt-4 pb-3" space="md">
          {/* Accordion for all sections */}
          <Accordion type="multiple" variant="unfilled" className="w-full gap-4">
            {/* Basics Section */}
            <AccordionItem value="basics" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={FileText} size="xl" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Basics</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-900"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <BasicsSection />
              </AccordionContent>
            </AccordionItem>

            {/* Control Panel Section  */}
            <AccordionItem value="control-panel" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={ServerCog} size="xl" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Control Panel</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-900"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <ControlPanelSection gatewayId={gatewayId} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </VStack>
      </ScrollView>

      {/* Bottom Action Buttons - Hidden when keyboard is visible */}
      {!keyboardVisible && (
        <HStack className="bg-background-50 p-4" space="md">
          <Button
            variant="outline"
            className="h-12 flex-1 border border-outline-300"
            onPress={handleCancel}>
            <ButtonText>Cancel</ButtonText>
          </Button>

          {/* Delete Button - Only show for existing gateways */}
          {gatewayId && gatewayId !== 'new' && (
            <Button
              variant="solid"
              action="negative"
              onPress={() => setShowDeleteModal(true)}
              isDisabled={isDeleting}
              className="h-12 flex-1">
              <ButtonIcon as={Trash2} className="text-white" />
              <ButtonText className="text-lg text-white">Delete</ButtonText>
            </Button>
          )}

          {/* Save Button */}
          <Button
            variant="solid"
            action="positive"
            onPress={handleSaveGateway}
            isDisabled={isSaving}
            className="h-12 flex-1">
            <ButtonIcon as={Save} className="text-white" />
            <ButtonText className="text-lg text-white">
              {isSaving ? 'Saving...' : saveButtonText}
            </ButtonText>
          </Button>
        </HStack>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteGateway}
        title="Delete IoT Gateway"
        message="Are you sure you want to delete this IoT Gateway? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </VStack>
  );
}
