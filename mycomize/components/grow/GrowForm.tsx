import { useState, useEffect, useContext } from 'react';
import { Keyboard } from 'react-native';
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
import {
  Save,
  ChevronDown,
  ChevronRight,
  FileText,
  CircuitBoard,
  Trash2,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MushroomIcon from '~/components/icons/MushroomIcon';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';
import { useUnifiedToast } from '~/components/ui/unified-toast';

import { AuthContext } from '~/lib/api/AuthContext';
import {
  useCurrentGrowFormData,
  useCurrentGrowFlushes,
  useUpdateCurrentGrowField,
  useUpdateFlush,
  useParseDateUtility,
  useFormatDateForAPI,
  useGrowStore,
} from '~/lib/stores';

// Import modular sections
import { BasicsSection } from '~/components/grow/sections/BasicsSection';
import { StagesSection } from '~/components/grow/sections/StagesSection';

interface GrowFormProps {
  growId?: string;
  saveButtonText?: string;
}

export function GrowForm({ growId, saveButtonText = 'Save' }: GrowFormProps) {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  // Store hooks
  const formData = useCurrentGrowFormData();
  const flushes = useCurrentGrowFlushes();
  const updateField = useUpdateCurrentGrowField();
  const updateFlush = useUpdateFlush();
  const parseDate = useParseDateUtility();
  const formatDateForAPI = useFormatDateForAPI();

  // Store actions
  const createGrow = useGrowStore((state) => state.createGrow);
  const updateGrow = useGrowStore((state) => state.updateGrow);
  const deleteGrow = useGrowStore((state) => state.deleteGrow);

  // Local UI state
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);

  // Keyboard visibility tracking
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Date handling
  const handleDateChange = (field: string, date?: Date, event?: any) => {
    // If user cancelled, don't change anything
    if (event && event.type === 'dismissed') {
      setActiveDatePicker(null);
      return;
    }

    setActiveDatePicker(null);
    if (date) {
      const formattedDate = formatDateForAPI(date);
      
      // Handle flush dates differently from regular grow data fields
      if (field.startsWith('flush_')) {
        const flushId = field.replace('flush_', '');
        updateFlush(flushId, { harvest_date: formattedDate });
      } else {
        // Update regular grow field
        updateField(field as any, formattedDate);
      }
    }
  };

  // Calculate total cost from stages data
  const calculateTotalCost = () => {
    if (!formData?.stages) return formData?.total_cost || 0;

    let totalCost = 0;
    Object.values(formData.stages).forEach((stage: any) => {
      if (stage?.items) {
        stage.items.forEach((item: any) => {
          totalCost += parseFloat(item.cost || '0') || 0;
        });
      }
    });

    return totalCost || formData?.total_cost || 0;
  };

  // Save grow
  const handleSaveGrow = async () => {
    if (!formData || !token) return;

    // Basic validation
    if (!formData.name?.trim()) {
      showError('Grow name is required');
      return;
    }

    if (!formData.species?.trim()) {
      showError('Species is required');
      return;
    }

    setIsSaving(true);

    try {
      const isEdit = growId && growId !== 'new';

      if (isEdit) {
        // Prepare data for API update (BulkGrowUpdateWithFlushes)
        const updateData = {
          ...formData,
          total_cost: calculateTotalCost(),
          flushes: flushes,
        };

        const success = await updateGrow(token, growId, updateData);
        if (success) {
          showSuccess('Grow updated successfully!');
        } else {
          showError('Failed to update grow');
          return;
        }
      } else {
        // Prepare data for API create (BulkGrowCreateWithFlushes)
        // After validation, we know name and species are defined
        const createData = {
          ...formData,
          name: formData.name!, // Non-null assertion after validation
          species: formData.species!, // Non-null assertion after validation
          total_cost: calculateTotalCost(),
          flushes: flushes,
        };

        const newGrow = await createGrow(token, createData);
        if (newGrow) {
          showSuccess('Grow saved successfully!');
        } else {
          showError('Failed to save grow');
          return;
        }
      }

      router.replace('/grows');
    } catch (error) {
      showError('Failed to save grow');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete grow
  const handleDeleteGrow = async () => {
    if (!growId || growId === 'new' || !token) return;

    setIsDeleting(true);

    try {
      const success = await deleteGrow(token, growId);
      if (success) {
        showSuccess('Grow deleted successfully!');
        setShowDeleteModal(false);
        router.replace('/grows');
      } else {
        showError('Failed to delete grow');
      }
    } catch (error) {
      showError('Failed to delete grow');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Don't render if no form data
  if (!formData) {
    return null;
  }

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

            {/* Stages Section */}
            <AccordionItem value="stages" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <MushroomIcon height={20} width={20} color="#828282" strokeWidth={2} />
                        <Text className="text-lg font-semibold">Stages</Text>
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
                <StagesSection
                  activeDatePicker={activeDatePicker}
                  setActiveDatePicker={setActiveDatePicker}
                  handleDateChange={handleDateChange}
                  parseDate={parseDate}
                />
              </AccordionContent>
            </AccordionItem>

            {/* IoT Gateway Section */}
            <AccordionItem value="iot-gateway" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={CircuitBoard} size="xl" className="text-typography-400" />
                        <Text className="text-lg font-semibold">IoT Gateway</Text>
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
              {/* IoT Gateway Section - TODO */}
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
            onPress={() => router.back()}>
            <ButtonText>Cancel</ButtonText>
          </Button>

          {/* Delete Button - Only show for existing grows */}
          {growId && growId !== 'new' && (
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
            onPress={handleSaveGrow}
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
        onConfirm={handleDeleteGrow}
        title="Delete Grow"
        message="Are you sure you want to delete this grow? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </VStack>
  );
}
