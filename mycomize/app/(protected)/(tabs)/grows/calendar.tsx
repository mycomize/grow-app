import { useMemo, useState, useCallback } from 'react';
import { View } from '~/components/ui/view';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { VStack } from '~/components/ui/vstack';
import { ScrollView } from '~/components/ui/scroll-view';
import { Icon } from '~/components/ui/icon';
import { Calendar, DateData } from 'react-native-calendars';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { useShallow } from 'zustand/react/shallow';
import { useGrowStore } from '~/lib/stores/growStore';
import { useCalendarStore } from '~/lib/stores/calendarStore';
import { generateMarkedDates, getStageDisplayName } from '~/lib/utils/calendarUtils';
import { CalendarTaskList } from '~/components/calendar/CalendarTaskList';
import { useAuthEncryption } from '~/lib/stores/authEncryptionStore';
import { CalendarTask } from '~/lib/types/calendarTypes';

export default function GrowCalendarScreen() {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Get authentication token
  const { token } = useAuthEncryption();

  // Get grows from store
  const { grows } = useGrowStore(
    useShallow((state) => ({
      grows: state.grows,
    }))
  );

  // Get calendar store data and functions
  const { calendarTasks, toggleCalendarTaskCompletion } = useCalendarStore(
    useShallow((state) => ({
      calendarTasks: state.calendarTasks,
      toggleCalendarTaskCompletion: state.toggleCalendarTaskCompletion,
    }))
  );

  // Handle calendar task completion toggle
  const handleTaskToggle = useCallback(async (taskId: string, growId: number, stageKey: string) => {
    if (!token) return;
    
    try {
      await toggleCalendarTaskCompletion(token, taskId);
    } catch (error) {
      console.error('Error toggling calendar task completion:', error);
    }
  }, [toggleCalendarTaskCompletion, token]);

  // Enrich calendar tasks with display information
  const calendarTasksForDisplay = useMemo((): CalendarTask[] => {
    return calendarTasks.map((task: CalendarTask): CalendarTask => {
      const grow = grows.find(g => g.id === task.grow_id);
      return {
        ...task,
        // Populate display fields if not already present
        growName: task.growName || grow?.name || `Grow ${task.grow_id}`,
        stageName: task.stageName || getStageDisplayName(task.stage_key),
        frequency: task.frequency || 'once' // Calendar tasks are individual instances
      };
    });
  }, [calendarTasks, grows]);

  // Generate marked dates for calendar (pending tasks only)
  const markedDates = useMemo(() => {
    const marks = generateMarkedDates(calendarTasksForDisplay);
    
    // Add selection marking for current selected date
    const result: any = { ...marks };
    if (result[selectedDate]) {
      result[selectedDate] = {
        ...result[selectedDate],
        selected: true,
        selectedColor: '#007AFF',
      };
    } else {
      result[selectedDate] = {
        selected: true,
        selectedColor: '#007AFF',
      };
    }
    
    return result;
  }, [calendarTasksForDisplay, selectedDate]);

  // Handle calendar date selection
  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  // Calendar theme based on current theme
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

  return (
    <ScrollView className="flex-1 bg-background-0">
      <VStack space="lg" className="p-6">
        <View className="flex-row items-center gap-2">
          <Icon as={CalendarDays} size="xl" className="text-typography-400" />
          <Heading size="xl" className="text-typography-900">
            Calendar
          </Heading>
        </View>

        <Text className="text-base text-typography-600">
          Track tasks across all your grows
        </Text>

        {/* Calendar */}
        <View className="my-2">
          <Calendar
            theme={calendarTheme}
            style={calendarStyle}
            showSixWeeks={true}
            enableSwipeMonths={true}
            current={new Date().toISOString().split('T')[0]}
            markedDates={markedDates}
            markingType="multi-dot"
            onDayPress={handleDayPress}
          />
        </View>

        {/* Task List */}
        <CalendarTaskList
          tasks={calendarTasksForDisplay}
          selectedDate={selectedDate}
          onToggleCompletion={handleTaskToggle}
        />
      </VStack>
    </ScrollView>
  );
}
