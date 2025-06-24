import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button, ButtonText } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

interface AIAssistantSectionProps {
  growData?: any;
  updateField?: (field: any, value: any) => void;
}

export const AIAssistantSection: React.FC<AIAssistantSectionProps> = ({
  growData,
  updateField,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { theme } = useTheme();

  const handleGenerateSchedule = () => {
    setShowCalendar(true);
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    // For now, just show which date was selected
    console.log('Selected date:', day.dateString);
  };

  // Calendar theme based on current theme
  const calendarTheme = {
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
  };

  return (
    <VStack space="lg" className="bg-background-0 p-2">
      {/* Calendar Subsection */}
      <VStack space="sm">
        <Heading size="md" className="text-typography-900">
          Calendar
        </Heading>

        {!showCalendar ? (
          <VStack space="sm">
            <Text className="text-typography-700">
              Use AI to generate a schedule estimate for key milestones of your grow
            </Text>
            <Button
              variant="solid"
              action="primary"
              onPress={handleGenerateSchedule}
              className="w-full">
              <ButtonText>Generate Schedule</ButtonText>
            </Button>
          </VStack>
        ) : (
          <VStack space="md">
            <HStack className="items-center justify-between">
              {growData && growData.name && (
                <Text className="font-medium text-typography-900">
                  Grow Schedule: {growData.name}
                </Text>
              )}
              {!growData?.name && (
                <Text className="font-medium text-typography-700">Grow Schedule</Text>
              )}
              <Button variant="outline" size="sm" onPress={() => setShowCalendar(false)}>
                <ButtonText>Hide Calendar</ButtonText>
              </Button>
            </HStack>

            <Calendar
              onDayPress={handleDayPress}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate]: {
                        selected: true,
                        selectedColor: '#007AFF',
                      },
                    }
                  : {}
              }
              theme={calendarTheme}
              style={{
                borderRadius: 8,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            />

            {selectedDate && (
              <VStack space="sm" className="rounded-md bg-background-50 p-3">
                <Text className="font-medium text-typography-900">
                  Selected Date: {selectedDate}
                </Text>
                <Text className="text-typography-700">
                  Tap any day to select it. More scheduling features will be added soon!
                </Text>
              </VStack>
            )}
          </VStack>
        )}
      </VStack>

      {/* Future AI Features Placeholder */}
      <VStack space="md">
        <Heading size="md" className="text-typography-900">
          AI Features (Coming Soon)
        </Heading>
        <VStack space="sm">
          <Text className="text-typography-700">• Automated watering schedules</Text>
          <Text className="text-typography-700">• Growth stage predictions</Text>
          <Text className="text-typography-700">• Harvest timing optimization</Text>
          <Text className="text-typography-700">• Environmental monitoring alerts</Text>
        </VStack>
      </VStack>
    </VStack>
  );
};
