import React, { useState, useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { useToast, Toast } from '~/components/ui/toast';
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
  Syringe,
  Wheat,
  Package,
  ShoppingBasket,
  ChevronRight,
  ChevronDown,
} from 'lucide-react-native';
import MushroomIcon from '~/components/icons/MushroomIcon';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';

// Import modular sections
import { BasicsSection } from '~/components/grow/sections/BasicsSection';
import { SyringeSection } from '~/components/grow/sections/SyringeSection';
import { SpawnSection } from '~/components/grow/sections/SpawnSection';
import { BulkSection } from '~/components/grow/sections/BulkSection';
import { FruitingSection } from '~/components/grow/sections/FruitingSection';
import { HarvestSection } from '~/components/grow/sections/HarvestSection';

interface GrowData {
  id?: number;
  name?: string;
  species?: string;
  variant?: string;
  inoculation_date?: string;
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

  // Spawn fields
  spawn_type?: string;
  spawn_weight_lbs?: string;
  spawn_cost?: string;
  spawn_vendor?: string;

  // Bulk substrate fields
  bulk_type?: string;
  bulk_weight_lbs?: string;
  bulk_cost?: string;
  bulk_vendor?: string;
  bulk_created_at?: string;
  bulk_expiration_date?: string;

  // Fruiting fields
  fruiting_start_date?: string;
  fruiting_pin_date?: string;
  fruiting_mist_frequency?: string;
  fruiting_fan_frequency?: string;
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
    status: 'growing',
    cost: 0,
  });
  const [flushes, setFlushes] = useState<HarvestFlush[]>([defaultHarvestFlush]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Date picker states
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);

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
        setGrowData(data);

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

  // Handle date changes
  const handleDateChange = (field: string, date?: Date) => {
    setActiveDatePicker(null);
    if (date) {
      if (field.startsWith('flush_')) {
        const [, flushId] = field.split('_');
        updateFlush(flushId, { harvestDate: date });
      } else {
        updateField(field as keyof GrowData, formatDateForAPI(date));
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

      // Prepare data for API
      const apiData = {
        ...growData,
        cost: calculateTotalCost(),
        harvest_dry_weight_grams: totalDryWeight,
        harvest_wet_weight_grams: totalWetWeight,
        harvest_date: formatDateForAPI(firstHarvestDate || null),
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
        response = await fetch(`${getBackendUrl()}/grows`, {
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
                        <Icon as={FileText} size="lg" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Basics</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-400"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <BasicsSection growData={growData} updateField={updateField} />
              </AccordionContent>
            </AccordionItem>

            {/* Syringe Section */}
            <AccordionItem value="syringe" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={Syringe} size="lg" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Syringe</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-400"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <SyringeSection
                  growData={growData}
                  updateField={updateField}
                  activeDatePicker={activeDatePicker}
                  setActiveDatePicker={setActiveDatePicker}
                  handleDateChange={handleDateChange}
                  parseDate={parseDate}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Spawn Section */}
            <AccordionItem value="spawn" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={Wheat} size="lg" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Spawn</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-400"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <SpawnSection
                  growData={growData}
                  updateField={updateField}
                  activeDatePicker={activeDatePicker}
                  setActiveDatePicker={setActiveDatePicker}
                  handleDateChange={handleDateChange}
                  parseDate={parseDate}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Bulk Substrate Section */}
            <AccordionItem value="bulk" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={Package} size="lg" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Bulk Substrate</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-400"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <BulkSection
                  growData={growData}
                  updateField={updateField}
                  activeDatePicker={activeDatePicker}
                  setActiveDatePicker={setActiveDatePicker}
                  handleDateChange={handleDateChange}
                  parseDate={parseDate}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Fruiting Section */}
            <AccordionItem value="fruiting" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <MushroomIcon height={20} width={20} color="#9ca3af" strokeWidth={2} />
                        <Text className="text-lg font-semibold">Fruiting</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-400"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <FruitingSection
                  growData={growData}
                  updateField={updateField}
                  activeDatePicker={activeDatePicker}
                  setActiveDatePicker={setActiveDatePicker}
                  handleDateChange={handleDateChange}
                  parseDate={parseDate}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Harvest Section */}
            <AccordionItem value="harvest" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={ShoppingBasket} size="lg" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Harvest</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-400"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <HarvestSection
                  flushes={flushes}
                  addFlush={addFlush}
                  updateFlush={updateFlush}
                  removeFlush={removeFlush}
                  activeDatePicker={activeDatePicker}
                  setActiveDatePicker={setActiveDatePicker}
                  handleDateChange={handleDateChange}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </VStack>
      </ScrollView>

      {/* Bottom Save Button */}
      <VStack className="bg-background-50 p-4">
        <Button
          variant="solid"
          action="positive"
          onPress={saveGrow}
          isDisabled={isSaving}
          className="h-12 w-full">
          <ButtonIcon as={Save} className="text-white" />
          <ButtonText className="text-lg text-white">
            {isSaving ? 'Saving...' : 'Save Grow'}
          </ButtonText>
        </Button>
      </VStack>
    </VStack>
  );
}
