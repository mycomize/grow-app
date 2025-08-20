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
    createGatewayWithEntities,
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
    commitPendingLinks,
    clearPendingLinks,
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
      const startTime = performance.now();
      console.log(`[IoTGatewayForm] Starting gateway data initialization for gateway ${gatewayId}`);

      if (gateway && token) {
        const promises = [];

        // Fetch HA entities if credentials available
        if (gateway.api_url && gateway.api_key) {
          console.log(
            `[IoTGatewayForm] Adding HA entities fetch to promises (smart caching enabled)`
          );
          // Use forceRefresh=false to enable caching - entityStore will skip if unchanged
          promises.push(fetchHaEntities(gateway, false));
        }

        // Fetch IoT entities from database
        console.log(
          `[IoTGatewayForm] Adding IoT entities fetch to promises (smart caching enabled)`
        );
        // Use forceRefresh=false to enable caching - entityStore will skip if already fetched
        promises.push(fetchIotEntities(token, gateway.id.toString(), false));

        // Wait for both to complete (may complete instantly due to caching)
        const entityFetchStart = performance.now();
        await Promise.all(promises);
        const entityFetchEnd = performance.now();
        console.log(
          `[IoTGatewayForm] Entity fetching completed in ${entityFetchEnd - entityFetchStart}ms`
        );

        // Now compute entity lists once after both are loaded
        const computeStart = performance.now();
        computeAndSetEntityLists(false);
        const computeEnd = performance.now();
        console.log(
          `[IoTGatewayForm] Entity list computation completed in ${computeEnd - computeStart}ms`
        );
      }

      // Always fetch grows for linking
      if (token) {
        const growsFetchStart = performance.now();
        console.log(`[IoTGatewayForm] Fetching grows for linking`);
        await fetchGrows(token);
        const growsFetchEnd = performance.now();
        console.log(
          `[IoTGatewayForm] Grows fetch completed in ${growsFetchEnd - growsFetchStart}ms`
        );
      }

      const totalTime = performance.now() - startTime;
      console.log(
        `[IoTGatewayForm] Complete gateway data initialization finished in ${totalTime}ms`
      );
    };

    initializeGatewayData();
  }, [gateway, token, fetchHaEntities, fetchIotEntities, fetchGrows, computeAndSetEntityLists]);

  // Save gateway handler
  const handleSaveGateway = useCallback(async () => {
    if (!token || !currentGatewayFormData) return;

    const saveStartTime = performance.now();
    console.log(`[IoTGatewayForm] Starting save operation for gateway ${gatewayId}`);

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

        const createStart = performance.now();
        const createdGateway = await createGatewayWithEntities(token, gatewayData);
        const createEnd = performance.now();
        console.log(
          `[IoTGatewayForm] Optimized gateway creation completed in ${createEnd - createStart}ms`
        );

        if (createdGateway) {
          console.log(
            `[IoTGatewayForm] New gateway created with ID: ${createdGateway.id} using optimized single-call approach`
          );

          const cleanupStart = performance.now();
          clearCurrentGateway();
          const cleanupEnd = performance.now();
          console.log(
            `[IoTGatewayForm] Gateway cleanup completed in ${cleanupEnd - cleanupStart}ms`
          );

          const navigationStart = performance.now();
          router.back();
          const navigationEnd = performance.now();
          console.log(
            `[IoTGatewayForm] Navigation completed in ${navigationEnd - navigationStart}ms`
          );
        }
      } else if (gateway) {
        // Update existing gateway
        const updateStart = performance.now();
        const success = await updateGateway(token, gateway.id.toString(), currentGatewayFormData);
        const updateEnd = performance.now();
        console.log(`[IoTGatewayForm] Gateway update completed in ${updateEnd - updateStart}ms`);

        if (success) {
          // Entity sync is handled by WebSocket real-time updates for existing gateways
          // Only new gateways or those with credential changes need explicit sync
          console.log(`[IoTGatewayForm] Skipping entity sync for existing gateway`);

          // No need to call markGatewayModified - updateGateway already does this
          const cleanupStart = performance.now();
          clearCurrentGateway();
          const cleanupEnd = performance.now();
          console.log(
            `[IoTGatewayForm] Gateway cleanup completed in ${cleanupEnd - cleanupStart}ms`
          );

          const navigationStart = performance.now();
          router.back();
          const navigationEnd = performance.now();
          console.log(
            `[IoTGatewayForm] Navigation completed in ${navigationEnd - navigationStart}ms`
          );
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
    gateway,
    gatewayId,
    token,
    currentGatewayFormData,
    createGateway,
    updateGateway,
    syncIotEntities,
    commitPendingLinks,
    clearCurrentGateway,
    router,
  ]);
  // Cancel handler
  const handleCancel = useCallback(() => {
    // Clear any pending links for new gateways
    if (gatewayId === 'new') {
      console.log(`[IoTGatewayForm] Clearing pending links on cancel for new gateway`);
      clearPendingLinks();
    }

    // Mark as cancelled so index knows not to refetch
    markGatewayModified(null, 'cancel');
    clearCurrentGateway();
    router.replace('/iot');
  }, [gatewayId, clearPendingLinks, markGatewayModified, clearCurrentGateway, router]);

  // Delete gateway handler
  const handleDeleteGateway = useCallback(async () => {
    if (!gateway || !token) return;

    setIsDeleting(true);
    try {
      const success = await deleteGatewayAction(token, gateway.id.toString());
      if (success) {
        // No need to call markGatewayModified - deleteGateway already does this
        clearCurrentGateway();
        router.back();
      }
    } catch (error) {
      console.error('Failed to delete gateway:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [gateway, token, deleteGatewayAction, clearCurrentGateway, router]);

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
