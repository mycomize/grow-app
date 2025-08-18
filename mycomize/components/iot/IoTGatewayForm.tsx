import { useState, useEffect, useContext, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';

import {
  useGatewayStore,
  useGatewayById,
  useCurrentGatewayFormData,
  useInitializeCurrentGateway,
  useClearCurrentGateway,
} from '~/lib/stores/iot/gatewayStore';
import { useEntityStore } from '~/lib/stores/iot/entityStore';
import { AuthContext } from '~/lib/AuthContext';

// Import modular sections
import { BasicsSection } from '~/components/iot/sections/BasicsSection';
import { ControlPanelSection } from '~/components/iot/sections/ControlPanelSection';

interface IoTGatewayFormProps {
  gatewayId: string;
  saveButtonText?: string;
}

export function IoTGatewayForm({ gatewayId, saveButtonText = 'Save' }: IoTGatewayFormProps) {
  const { token } = useContext(AuthContext);
  const router = useRouter();

  // Zustand store hooks
  const gateway = useGatewayById(gatewayId === 'new' ? '' : gatewayId);
  const currentGatewayFormData = useCurrentGatewayFormData();
  const initializeCurrentGateway = useInitializeCurrentGateway();
  const clearCurrentGateway = useClearCurrentGateway();
  const {
    createGateway,
    updateGateway,
    deleteGateway: deleteGatewayAction,
    markGatewayModified,
  } = useGatewayStore();

  const {
    fetchHaEntities,
    fetchIotEntities,
    fetchGrows,
    syncIotEntities,
    computeAndSetEntityLists,
  } = useEntityStore();

  // Local UI state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Initialize current gateway when component mounts
  useEffect(() => {
    initializeCurrentGateway(gatewayId);

    // Cleanup when component unmounts or gatewayId changes
    return () => {
      // Don't clear on unmount, only on navigation away (handled separately)
    };
  }, [gatewayId, initializeCurrentGateway]);

  // Fetch entities and grows when gateway is available
  useEffect(() => {
    const initializeGatewayData = async () => {
      if (gateway && token) {
        // Fetch both HA and IoT entities, then compute entity lists once
        const promises = [];

        // Fetch HA entities if credentials available
        if (gateway.api_url && gateway.api_key) {
          promises.push(fetchHaEntities(gateway));
        }

        // Fetch IoT entities from database
        promises.push(fetchIotEntities(token, gateway.id.toString()));

        // Wait for both to complete
        await Promise.all(promises);

        // Now compute entity lists once after both are loaded
        computeAndSetEntityLists(false);
      }

      // Always fetch grows for linking
      if (token) {
        fetchGrows(token);
      }
    };

    initializeGatewayData();
  }, [gateway, token, fetchHaEntities, fetchIotEntities, fetchGrows, computeAndSetEntityLists]);

  // Save gateway handler
  const handleSaveGateway = useCallback(async () => {
    if (!token || !currentGatewayFormData) return;

    setIsSaving(true);
    try {
      if (gatewayId === 'new') {
        // Create new gateway - ensure all required fields are present
        const gatewayData = {
          name: currentGatewayFormData.name || 'New Gateway',
          type: currentGatewayFormData.type || 'home_assistant',
          description: currentGatewayFormData.description || '',
          api_url: currentGatewayFormData.api_url || '',
          api_key: currentGatewayFormData.api_key || '',
        };
        const success = await createGateway(token, gatewayData);
        if (success) {
          clearCurrentGateway();
          router.back();
        }
      } else if (gateway) {
        // Update existing gateway
        const success = await updateGateway(token, gateway.id.toString(), currentGatewayFormData);
        if (success) {
          // Sync entities after successful gateway save
          const updatedGateway = { ...gateway, ...currentGatewayFormData };
          await syncIotEntities(token, updatedGateway);
          clearCurrentGateway();
          router.back();
        }
      }
    } catch (error) {
      console.error('Failed to save gateway:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    gateway,
    gatewayId,
    token,
    currentGatewayFormData,
    createGateway,
    updateGateway,
    syncIotEntities,
    clearCurrentGateway,
    router,
  ]);

  // Delete gateway handler
  const handleDeleteGateway = useCallback(async () => {
    if (!gateway || !token) return;

    setIsDeleting(true);
    try {
      const success = await deleteGatewayAction(token, gateway.id.toString());
      if (success) {
        clearCurrentGateway();
        router.back();
      }
    } catch (error) {
      console.error('Failed to delete gateway:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [gateway, token, deleteGatewayAction, clearCurrentGateway, router]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    // Mark as cancelled so index knows not to refetch
    markGatewayModified(null, 'cancel');
    clearCurrentGateway();
    router.replace('/iot');
  }, [markGatewayModified, clearCurrentGateway, router]);

  return (
    <VStack className="flex-1 bg-background-50">
      <ScrollView className="flex-1">
        <VStack className="p-4" space="md">
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
