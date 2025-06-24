import React, { useState, useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { useToast, Toast } from '~/components/ui/toast';
import { Keyboard } from 'react-native';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '~/components/ui/modal';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion';
import {
  Save,
  AlertCircle,
  CheckCircle,
  FileText,
  ChevronRight,
  ChevronDown,
  Bot,
  Trash2,
  X,
} from 'lucide-react-native';
import MushroomIcon from '~/components/icons/MushroomIcon';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';

// Import modular sections
import { BasicsSection } from '~/components/grow/sections/BasicsSection';
import { IoTGatewaySection } from '~/components/grow/sections/IoTGatewaySection';
import { StagesSection } from '~/components/grow/sections/StagesSection';

interface GrowData {
  id?: number;
  name?: string;
  species?: string;
  variant?: string;
  space?: string;
  inoculation_date?: string;
  spawn_colonization_date?: string;
  bulk_colonization_date?: string;
  current_stage?: string;
  tek?: string;
  stage?: string;
  status?: string;
  notes?: string;
  cost?: number;

  // Harvest fields
  harvest_date?: string;
  harvest_dry_weight_grams?: number;
  harvest_wet_weight_grams?: number;

  // Syringe fields
  syringe_vendor?: string;
  syringe_volume_ml?: string;
  syringe_cost?: string;
  syringe_created_at?: string;
  syringe_expiration_date?: string;
  syringe_status?: string;

  // Spawn fields
  spawn_type?: string;
  spawn_weight_lbs?: string;
  spawn_cost?: string;
  spawn_vendor?: string;
  spawn_status?: string;

  // Bulk substrate fields
  bulk_type?: string;
  bulk_weight_lbs?: string;
  bulk_cost?: string;
  bulk_vendor?: string;
  bulk_created_at?: string;
  bulk_expiration_date?: string;
  bulk_status?: string;

  // Fruiting fields
  fruiting_start_date?: string;
  fruiting_pin_date?: string;
  fruiting_mist_frequency?: string;
  fruiting_fan_frequency?: string;
  fruiting_status?: string;
}

interface HarvestFlush {
  id: string;
  harvestDate: Date | null;
  wetWeightG: string;
  dryWeightG: string;
  potency: string;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultHarvestFlush: HarvestFlush = {
  id: generateId(),
  harvestDate: null,
  wetWeightG: '',
  dryWeightG: '',
  potency: '',
};

export default function GrowEditScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const { theme } = useTheme();

  const [growData, setGrowData] = useState<GrowData>({
    tek: 'Monotub',
    stage: 'spawn_colonization',
    current_stage: undefined,
    status: 'growing',
    cost: 0,
  });
  const [flushes, setFlushes] = useState<HarvestFlush[]>([defaultHarvestFlush]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Date picker states
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

  // Utility functions for date handling
  const parseDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    return new Date(dateString);
  };

  const formatDateForAPI = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  };

  // Load grow data if editing existing grow
  useEffect(() => {
    if (!id || id === 'new') return;

    const fetchGrow = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${getBackendUrl()}/grows/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/login');
            return;
          }
          throw new Error('Failed to load grow');
        }

        const data = await response.json();

        // Convert numeric fields to strings for form inputs
        const convertedData = {
          ...data,
          // Syringe fields
          syringe_volume_ml: data.syringe_volume_ml?.toString() || '',
          syringe_cost: data.syringe_cost?.toString() || '',

          // Spawn fields
          spawn_weight_lbs: data.spawn_weight_lbs?.toString() || '',
          spawn_cost: data.spawn_cost?.toString() || '',

          // Bulk fields
          bulk_weight_lbs: data.bulk_weight_lbs?.toString() || '',
          bulk_cost: data.bulk_cost?.toString() || '',
        };

        setGrowData(convertedData);

        // Set up flushes based on harvest data
        if (data.harvest_dry_weight_grams > 0 || data.harvest_wet_weight_grams > 0) {
          setFlushes([
            {
              id: generateId(),
              harvestDate: parseDate(data.harvest_date),
              wetWeightG: data.harvest_wet_weight_grams || 0,
              dryWeightG: data.harvest_dry_weight_grams || 0,
              potency: '',
            },
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grow');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrow();
  }, [id, token, router]);

  // Update grow data field
  const updateField = (field: keyof GrowData, value: any) => {
    setGrowData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle IoT Gateway linking - no local state changes needed since backend handles the relationship
  const handleGatewayLinked = (gatewayId: number) => {
    // Relationship is handled by the backend IoT gateway linking endpoint
  };

  const handleGatewayUnlinked = () => {
    // Relationship is handled by the backend IoT gateway unlinking endpoint
  };

  // Handle date changes
  const handleDateChange = (field: string, date?: Date, event?: any) => {
    // If user cancelled, don't change anything
    if (event && event.type === 'dismissed') {
      setActiveDatePicker(null);
      return;
    }

    setActiveDatePicker(null);
    if (date) {
      // Handle flush dates differently from regular grow data fields
      if (field.startsWith('flush_')) {
        const flushId = field.replace('flush_', '');
        updateFlush(flushId, { harvestDate: date });
      } else {
        // Format the date as YYYY-MM-DD string for the API
        const formattedDate = formatDateForAPI(date);
        updateField(field as keyof GrowData, formattedDate);
      }
    }
  };

  // Flush management
  const addFlush = () => {
    setFlushes((prev) => [...prev, { ...defaultHarvestFlush, id: generateId() }]);
  };

  const updateFlush = (id: string, data: Partial<HarvestFlush>) => {
    setFlushes((prev) => prev.map((flush) => (flush.id === id ? { ...flush, ...data } : flush)));
  };

  const removeFlush = (id: string) => {
    setFlushes((prev) => prev.filter((flush) => flush.id !== id));
  };

  // Calculate total cost
  const calculateTotalCost = () => {
    return (
      (parseFloat(growData.syringe_cost || '0') || 0) +
      (parseFloat(growData.spawn_cost || '0') || 0) +
      (parseFloat(growData.bulk_cost || '0') || 0)
    );
  };

  // Delete grow
  const deleteGrow = async () => {
    if (!id || id === 'new') return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${getBackendUrl()}/grows/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error('Failed to delete grow');
      }

      setSuccess('Grow deleted successfully!');
      setShowDeleteModal(false);

      // Navigate back to grows list after a brief delay
      setTimeout(() => {
        router.replace('/grows');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete grow');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save grow
  const saveGrow = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Calculate total harvest weights from flushes
      const totalWetWeight = flushes.reduce(
        (sum, flush) => sum + (parseFloat(flush.wetWeightG) || 0),
        0
      );
      const totalDryWeight = flushes.reduce(
        (sum, flush) => sum + (parseFloat(flush.dryWeightG) || 0),
        0
      );
      const firstHarvestDate = flushes.find((f) => f.harvestDate)?.harvestDate;

      // Prepare data for API - convert string fields back to numbers
      const apiData = {
        ...growData,
        cost: calculateTotalCost(),
        harvest_dry_weight_grams: totalDryWeight,
        harvest_wet_weight_grams: totalWetWeight,
        harvest_date: formatDateForAPI(firstHarvestDate || null),

        // Convert string fields back to numbers for API
        syringe_volume_ml: growData.syringe_volume_ml
          ? parseFloat(growData.syringe_volume_ml)
          : undefined,
        syringe_cost: growData.syringe_cost ? parseFloat(growData.syringe_cost) : undefined,
        spawn_weight_lbs: growData.spawn_weight_lbs
          ? parseFloat(growData.spawn_weight_lbs)
          : undefined,
        spawn_cost: growData.spawn_cost ? parseFloat(growData.spawn_cost) : undefined,
        bulk_weight_lbs: growData.bulk_weight_lbs
          ? parseFloat(growData.bulk_weight_lbs)
          : undefined,
        bulk_cost: growData.bulk_cost ? parseFloat(growData.bulk_cost) : undefined,
      };

      // Remove undefined values
      Object.keys(apiData).forEach((key) => {
        if (apiData[key as keyof typeof apiData] === undefined) {
          delete apiData[key as keyof typeof apiData];
        }
      });

      let response;

      if (id && id !== 'new') {
        // Update existing grow
        response = await fetch(`${getBackendUrl()}/grows/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(apiData),
        });
      } else {
        // Create new grow
        response = await fetch(`${getBackendUrl()}/grows/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(apiData),
        });
      }

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save grow');
      }

      setSuccess('Grow saved successfully!');

      // Navigate back to grows list after a brief delay
      setTimeout(() => {
        router.replace('/grows');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grow');
    } finally {
      setIsSaving(false);
    }
  };

  // Toast functions
  const showToast = (message: string, type: 'error' | 'success') => {
    const toastId = Math.random().toString();

    const bgColor = 'bg-background-0';

    const textColor =
      type === 'error'
        ? theme === 'dark'
          ? 'text-error-600'
          : 'text-error-700'
        : theme === 'dark'
          ? 'text-green-600'
          : 'text-green-700';

    const descColor = 'text-typography-300';

    toast.show({
      id: `${type}-toast-${toastId}`,
      placement: 'top',
      duration: 3000,
      render: () => (
        <Toast variant="outline" className={`mx-auto mt-28 w-full p-4 ${bgColor}`}>
          <VStack space="xs" className="w-full">
            <HStack className="flex-row gap-2">
              <Icon
                as={type === 'error' ? AlertCircle : CheckCircle}
                className={`mt-0.5 ${textColor}`}
              />
              <Text className={`font-semibold ${textColor}`}>
                {type === 'error' ? 'Error' : 'Success'}
              </Text>
            </HStack>
            <Text className={descColor}>{message}</Text>
          </VStack>
        </Toast>
      ),
    });
  };

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      setError(null);
    }
  }, [error, theme]);

  useEffect(() => {
    if (success) {
      showToast(success, 'success');
      setSuccess(null);
    }
  }, [success, theme]);

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
      </VStack>
    );
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
                <BasicsSection growData={growData} updateField={updateField} />
              </AccordionContent>
            </AccordionItem>

            {/* IoT Gateway Section */}
            <AccordionItem value="iot-gateway" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={Bot} size="xl" className="text-typography-400" />
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
                <IoTGatewaySection
                  growId={typeof id === 'string' ? parseInt(id) : undefined}
                  onGatewayLinked={handleGatewayLinked}
                  onGatewayUnlinked={handleGatewayUnlinked}
                />
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
                  growData={growData}
                  updateField={updateField}
                  flushCount={flushes.length}
                  flushes={flushes}
                  addFlush={addFlush}
                  updateFlush={updateFlush}
                  removeFlush={removeFlush}
                  activeDatePicker={activeDatePicker}
                  setActiveDatePicker={setActiveDatePicker}
                  handleDateChange={handleDateChange}
                  parseDate={parseDate}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </VStack>
      </ScrollView>

      {/* Bottom Action Buttons - Hidden when keyboard is visible */}
      {!keyboardVisible && (
        <HStack className="bg-background-50 p-4" space="md">
          {/* Delete Button - Only show for existing grows */}
          {id && id !== 'new' && (
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
            onPress={saveGrow}
            isDisabled={isSaving}
            className="h-12 flex-1">
            <ButtonIcon as={Save} className="text-white" />
            <ButtonText className="text-lg text-white">
              {isSaving ? 'Saving...' : 'Save'}
            </ButtonText>
          </Button>
        </HStack>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Delete Grow</Heading>
            <ModalCloseButton>
              <Icon as={X} className="text-typography-500" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete this grow? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <HStack space="md">
              <Button
                variant="outline"
                action="secondary"
                onPress={() => setShowDeleteModal(false)}
                isDisabled={isDeleting}>
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="negative"
                onPress={deleteGrow}
                isDisabled={isDeleting}>
                <ButtonText className="text-white">
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
