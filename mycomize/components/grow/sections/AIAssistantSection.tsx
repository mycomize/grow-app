import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Calendar, Agenda, DateData } from 'react-native-calendars';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getBackendUrl } from '~/lib/api/backendUrl';
import { useAuthToken } from '~/lib/stores/authEncryptionStore';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, Thermometer, CheckCircle, CircleX } from 'lucide-react-native';
import { Spinner } from '~/components/ui/spinner';
import { useToast, Toast, ToastTitle, ToastDescription } from '~/components/ui/toast';
import { Icon } from '~/components/ui/icon';

interface MilestoneItem {
  name: string;
  description: string;
  type: 'spawn_to_bulk' | 'fruiting' | 'harvest';
  height?: number;
  day?: string;
}

interface OptimalConditions {
  optimal_spawn_temp_low: number;
  optimal_spawn_temp_high: number;
  optimal_bulk_temp_low: number;
  optimal_bulk_temp_high: number;
  optimal_bulk_relative_humidity_low: number;
  optimal_bulk_relative_humidity_high: number;
  optimal_bulk_co2_low: number;
  optimal_bulk_co2_high: number;
  optimal_fruiting_temp_low: number;
  optimal_fruiting_temp_high: number;
  optimal_fruiting_relative_humidity_low: number;
  optimal_fruiting_relative_humidity_high: number;
  optimal_fruiting_co2_low: number;
  optimal_fruiting_co2_high: number;
  optimal_fruiting_light_low: number;
  optimal_fruiting_light_high: number;
}

interface AIAssistantSectionProps {
  growData?: any;
  updateField?: (field: any, value: any) => void;
}

export const AIAssistantSection: React.FC<AIAssistantSectionProps> = ({ growData }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<{ [key: string]: any[] }>({});
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);
  const [optimalConditions, setOptimalConditions] = useState<OptimalConditions | null>(null);
  const [isLoadingConditions, setIsLoadingConditions] = useState(false);
  const [toastId, setToastId] = useState(0);
  const { theme } = useTheme();
  const token = useAuthToken();
  const toast = useToast();

  const showSuccessToast = (message: string) => {
    const newId = Math.random();
    setToastId(newId);

    toast.show({
      id: 'success-toast-' + newId,
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        return (
          <Toast variant="outline" className="mx-auto mt-36 w-full bg-background-0 p-4">
            <VStack space="xs" className="w-full">
              <HStack className="flex-row gap-2">
                <Icon as={CheckCircle} className="mt-0.5 stroke-green-600" />
                <ToastTitle className="font-semibold text-green-600">Success</ToastTitle>
              </HStack>
              <ToastDescription className="text-typography-200">{message}</ToastDescription>
            </VStack>
          </Toast>
        );
      },
    });
  };

  const showErrorToast = (message: string) => {
    const newId = Math.random();
    setToastId(newId);

    toast.show({
      id: 'error-toast-' + newId,
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        return (
          <Toast action="error" variant="outline" className="mx-auto mt-20 w-full p-4">
            <VStack space="xs" className="w-full">
              <HStack className="flex-row gap-2">
                <Icon as={CircleX} className="mt-0.5 stroke-error-500" />
                <ToastTitle className="font-semibold text-error-500">Error</ToastTitle>
              </HStack>
              <ToastDescription className="text-typography-200">{message}</ToastDescription>
            </VStack>
          </Toast>
        );
      },
    });
  };

  const fetchOptimalConditions = async () => {
    const router = useRouter();

    if (!growData?.id) {
      Alert.alert('Error', 'Grow ID is required to generate optimal conditions');
      return;
    }

    // Validate required fields
    const missingFields = [];
    if (!growData?.species) missingFields.push('Species');
    if (!growData?.variant) missingFields.push('Variant');
    if (!growData?.spawn_type) missingFields.push('Spawn Type');
    if (!growData?.bulk_type) missingFields.push('Bulk Type');

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information',
        `Please fill in the following fields in the Basics section before generating optimal conditions:\n\n• ${missingFields.join('\n• ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoadingConditions(true);
    try {
      const response = await fetch(`${getBackendUrl()}/grows/${growData.id}/optimal-conditions`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login'); // Redirect to login if unauthorized
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate optimal conditions');
      }

      const conditionsData = await response.json();
      console.log('Received optimal conditions:', conditionsData);
      setOptimalConditions(conditionsData);
      showSuccessToast('Optimal conditions generated successfully!');
    } catch (error) {
      console.error('Error fetching optimal conditions:', error);
      showErrorToast('Failed to generate optimal conditions. Please try again.');
    } finally {
      setIsLoadingConditions(false);
    }
  };

  const fetchMilestones = async () => {
    const router = useRouter();

    if (!growData?.id) {
      Alert.alert('Error', 'Grow ID is required to generate milestones');
      return;
    }

    // Validate required fields
    const missingFields = [];
    if (!growData?.species) missingFields.push('Species');
    if (!growData?.variant) missingFields.push('Variant');
    if (!growData?.spawn_type) missingFields.push('Spawn Type');
    if (!growData?.bulk_type) missingFields.push('Bulk Type');

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information',
        `Please fill in the following fields in the Basics section before generating milestones:\n\n• ${missingFields.join('\n• ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoadingMilestones(true);
    try {
      const response = await fetch(`${getBackendUrl()}/grows/${growData.id}/milestones`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login'); // Redirect to login if unauthorized
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate milestones');
      }

      const milestonesData = await response.json();
      console.log('Received milestones:', milestonesData);

      // Convert API response to agenda format
      const agendaItems: { [key: string]: MilestoneItem[] } = {};

      if (milestonesData.full_spawn_colonization) {
        agendaItems[milestonesData.full_spawn_colonization] = [
          {
            name: 'Transfer Spawn to Bulk',
            description: 'AI predicted date to transfer fully colonized spawn to bulk substrate',
            type: 'spawn_to_bulk',
          },
        ];
      }

      if (milestonesData.full_bulk_colonization) {
        agendaItems[milestonesData.full_bulk_colonization] = [
          {
            name: 'Introduce Fruiting Conditions',
            description:
              'AI predicted date to begin fruiting conditions after full bulk colonization',
            type: 'fruiting',
          },
        ];
      }

      if (milestonesData.first_harvest_date) {
        agendaItems[milestonesData.first_harvest_date] = [
          {
            name: 'Harvest First Flush',
            description: 'AI predicted date to harvest first flush of mushrooms',
            type: 'harvest',
          },
        ];
      }

      // Set milestones first, then show calendar in next tick to avoid render cascade
      setMilestones(agendaItems);
      setShowCalendar(true);
      showSuccessToast('Grow milestones generated successfully!');
    } catch (error) {
      console.error('Error fetching milestones:', error);
      showErrorToast('Failed to generate milestones. Please try again.');
    } finally {
      setIsLoadingMilestones(false);
    }
  };

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
    console.log('Selected date:', day.dateString);
  }, []);

  // Calendar theme based on current theme - memoized to prevent infinite re-renders
  const calendarTheme = useMemo(
    () => ({
      backgroundColor: theme === 'dark' ? '#333333' : '#ffffff',
      calendarBackground: theme === 'dark' ? '#333333' : '#ffffff',
      textSectionTitleColor: theme === 'dark' ? '#ffffff' : '#000000',
      selectedDayBackgroundColor: '#007AFF',
      selectedDayTextColor: '#ffffff',
      todayTextColor: '#007AFF',
      dayTextColor: theme === 'dark' ? '#ffffff' : '#000000',
      textDisabledColor: theme === 'dark' ? '#666666' : '#cccccc',
      dotColor: '#007AFF',
      selectedDotColor: '#ffffff',
      arrowColor: theme === 'dark' ? '#ffffff' : '#000000',
      monthTextColor: theme === 'dark' ? '#ffffff' : '#000000',
      indicatorColor: '#007AFF',
      textDayFontSize: 16,
      textMonthFontSize: 16,
      textDayHeaderFontSize: 13,
    }),
    [theme]
  );

  // Memoized style objects to prevent infinite re-renders
  const calendarStyle = useMemo(
    () => ({
      borderRadius: 8,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
    []
  );

  const markedDates = useMemo(
    () =>
      selectedDate
        ? {
            [selectedDate]: {
              selected: true,
              selectedColor: '#007AFF',
            },
          }
        : {},
    [selectedDate]
  );

  // Memoized marked dates for milestones calendar
  const milestoneMarkedDates = useMemo(() => {
    const marked: any = {};
    Object.keys(milestones).forEach((date) => {
      const isSelected = selectedDate === date;
      marked[date] = {
        selected: true,
        selectedColor: '#007AFF', // Same blue color for all milestone dates
        selectedTextColor: '#ffffff',
        marked: isSelected, // Add dot only for selected date
        dotColor: isSelected ? '#ffffff' : undefined, // White dot for selected
        customStyles: {
          container: {
            backgroundColor: '#007AFF',
            borderRadius: 8,
            elevation: 2,
          },
          text: {
            color: '#ffffff',
            fontWeight: 'bold',
          },
        },
      };
    });
    return marked;
  }, [milestones, selectedDate]);

  return (
    <VStack space="lg" className="bg-background-0 p-2">
      {/* Optimal Conditions Subsection */}
      <VStack space="sm">
        <Heading size="md" className="mt-1 text-typography-900">
          Optimal Growing Conditions
        </Heading>

        {!optimalConditions ? (
          <VStack space="sm">
            <Text className="text-typography-700">
              Use AI to generate optimal environmental conditions for your grow
            </Text>
            <HStack space="sm" className="mb-5">
              <Button
                variant="solid"
                action="primary"
                onPress={fetchOptimalConditions}
                className="mx-auto w-1/2"
                isDisabled={isLoadingConditions}>
                {isLoadingConditions ? (
                  <Spinner size="small" color="white" />
                ) : (
                  <>
                    <ButtonIcon as={Thermometer} className="mr-2" />
                    <ButtonText>Generate Conditions</ButtonText>
                  </>
                )}
              </Button>
            </HStack>
          </VStack>
        ) : (
          <VStack space="md">
            <Text className="mb-2 font-medium text-typography-700">AI Generated Conditions</Text>

            {/* Spawn Phase */}
            <View className="mb-3 rounded-lg bg-background-50 p-3">
              <Text className="mb-2 font-semibold text-typography-900">Spawn Colonization</Text>
              <VStack space="xs">
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-700">Temperature:</Text>
                  <Text className="text-sm font-medium text-typography-900">
                    {optimalConditions.optimal_spawn_temp_low}°F -{' '}
                    {optimalConditions.optimal_spawn_temp_high}°F
                  </Text>
                </HStack>
              </VStack>
            </View>

            {/* Bulk Phase */}
            <View className="mb-3 rounded-lg bg-background-50 p-3">
              <Text className="mb-2 font-semibold text-typography-900">Bulk Colonization</Text>
              <VStack space="xs">
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-700">Temperature:</Text>
                  <Text className="text-sm font-medium text-typography-900">
                    {optimalConditions.optimal_bulk_temp_low}°F -{' '}
                    {optimalConditions.optimal_bulk_temp_high}°F
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-700">Relative Humidity:</Text>
                  <Text className="text-sm font-medium text-typography-900">
                    {optimalConditions.optimal_bulk_relative_humidity_low}% -{' '}
                    {optimalConditions.optimal_bulk_relative_humidity_high}%
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-700">CO₂:</Text>
                  <Text className="text-sm font-medium text-typography-900">
                    {optimalConditions.optimal_bulk_co2_low} -{' '}
                    {optimalConditions.optimal_bulk_co2_high} PPM
                  </Text>
                </HStack>
              </VStack>
            </View>

            {/* Fruiting Phase */}
            <View className="mb-3 rounded-lg bg-background-50 p-3">
              <Text className="mb-2 font-semibold text-typography-900">Fruiting</Text>
              <VStack space="xs">
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-700">Temperature:</Text>
                  <Text className="text-sm font-medium text-typography-900">
                    {optimalConditions.optimal_fruiting_temp_low}°F -{' '}
                    {optimalConditions.optimal_fruiting_temp_high}°F
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-700">Relative Humidity:</Text>
                  <Text className="text-sm font-medium text-typography-900">
                    {optimalConditions.optimal_fruiting_relative_humidity_low}% -{' '}
                    {optimalConditions.optimal_fruiting_relative_humidity_high}%
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-700">CO₂:</Text>
                  <Text className="text-sm font-medium text-typography-900">
                    {optimalConditions.optimal_fruiting_co2_low} -{' '}
                    {optimalConditions.optimal_fruiting_co2_high} PPM
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-700">Light:</Text>
                  <Text className="text-sm font-medium text-typography-900">
                    {optimalConditions.optimal_fruiting_light_low} -{' '}
                    {optimalConditions.optimal_fruiting_light_high} lux
                  </Text>
                </HStack>
              </VStack>
            </View>

            <Button
              variant="outline"
              size="sm"
              onPress={() => setOptimalConditions(null)}
              className="mx-auto mt-3">
              <ButtonText>Generate New Conditions</ButtonText>
            </Button>
          </VStack>
        )}
      </VStack>

      {/* Calendar Subsection */}
      <VStack space="sm">
        <HStack className="mb-3">
          <Heading size="md" className="mt-1 text-typography-900">
            Grow Calendar
          </Heading>
          {showCalendar && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onPress={() => setShowCalendar(false)}>
              <ButtonText>Hide Calendar</ButtonText>
            </Button>
          )}
        </HStack>

        {!showCalendar ? (
          <VStack space="sm">
            <Text className="text-typography-700">
              Use AI to generate a schedule estimate for key milestones of your grow
            </Text>
            <HStack space="sm" className="mb-5">
              <Button
                variant="solid"
                action="primary"
                onPress={fetchMilestones}
                className="mx-auto w-1/2"
                isDisabled={isLoadingMilestones}>
                {isLoadingMilestones ? (
                  <Spinner size="small" color="white" />
                ) : (
                  <>
                    <ButtonIcon as={CalendarDays} className="mr-2" />
                    <ButtonText>Generate Milestones</ButtonText>
                  </>
                )}
              </Button>
            </HStack>
          </VStack>
        ) : (
          <VStack space="md">
            <VStack space="sm">
              {Object.keys(milestones).length > 0 ? (
                <>
                  <Calendar
                    key={`calendar-with-milestones-${Object.keys(milestones).length}`}
                    onDayPress={handleDayPress}
                    markedDates={milestoneMarkedDates}
                    theme={calendarTheme}
                    style={calendarStyle}
                    showSixWeeks={true}
                    enableSwipeMonths={true}
                    current={Object.keys(milestones)[0] || new Date().toISOString().split('T')[0]}
                  />

                  {/* Always show all milestones */}
                  <VStack space="sm" className="mt-4">
                    <Text className="mb-2 font-medium text-typography-900">Grow Milestones</Text>
                    {Object.entries(milestones).map(([date, items]) => (
                      <VStack key={date} space="xs" className="mb-3">
                        <Text
                          className={`font-medium ${selectedDate === date ? 'text-primary-600' : 'text-typography-800'}`}>
                          {new Date(date).toLocaleDateString()}
                        </Text>
                        {items.map((item, index) => (
                          <View
                            key={index}
                            className={`mb-2 ml-2 rounded-lg p-3 ${selectedDate === date ? 'border border-success-500 bg-background-50' : 'bg-background-50'}`}>
                            <HStack className="items-start justify-between">
                              <VStack className="flex-1" space="xs">
                                <Text className="font-semibold text-typography-900">
                                  {item.name}
                                </Text>
                                <Text className="text-sm text-typography-700">
                                  {item.description}
                                </Text>
                              </VStack>
                            </HStack>
                          </View>
                        ))}
                      </VStack>
                    ))}
                  </VStack>
                </>
              ) : (
                <></>
              )}
            </VStack>
          </VStack>
        )}
      </VStack>
    </VStack>
  );
};
