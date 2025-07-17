import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View } from '~/components/ui/view';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { ScrollView } from '~/components/ui/scroll-view';
import { Badge } from '~/components/ui/badge';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Checkbox } from '~/components/ui/checkbox';
import { CheckboxIndicator, CheckboxIcon } from '~/components/ui/checkbox';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import {
  Calendar as CalendarIcon,
  CalendarX2,
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Edit2,
  Filter,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { useCalendar } from '~/lib/CalendarContext';
import { CalendarTask, getTaskStatus, getDaysUntilDue } from '~/lib/calendarTypes';
import { TaskFilterModal } from '~/components/modals/TaskFilterModal';
import { DeleteConfirmationModal } from '~/components/modals/DeleteConfirmationModal';
import {
  getUserPreferences,
  updateTaskFilterPreferences,
  getGrowNames,
  addGrowName,
} from '~/lib/userPreferences';

export default function CalendarScreen() {
  const { theme } = useTheme();
  const {
    calendarState,
    getTasksForDate,
    getEventsForDate,
    getAllTasksSorted,
    toggleTaskCompletion,
    updateTaskDate,
    deleteCalendarTask,
  } = useCalendar();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingTaskDate, setEditingTaskDate] = useState<Date>(new Date());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overdue: true,
    today: true,
    upcoming: true,
    completed: false,
  });

  // Filter state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterGrowName, setFilterGrowName] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [tempFilterGrowName, setTempFilterGrowName] = useState('');
  const [tempFilterStage, setTempFilterStage] = useState('');
  const [availableGrowNames, setAvailableGrowNames] = useState<string[]>([]);

  // Delete state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<CalendarTask | null>(null);

  const iconColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get all tasks
  const allTasks = getAllTasksSorted();

  // Load preferences and grow names on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getUserPreferences();
        setFilterGrowName(preferences.taskFilters.growName);
        setFilterStage(preferences.taskFilters.stage);
        setTempFilterGrowName(preferences.taskFilters.growName);
        setTempFilterStage(preferences.taskFilters.stage);

        const growNames = await getGrowNames();
        setAvailableGrowNames(growNames);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Update grow names when tasks change
  useEffect(() => {
    const updateGrowNames = async () => {
      const uniqueGrowNames = [...new Set(allTasks.map((task) => task.growName))];

      // Add any new grow names to storage
      for (const growName of uniqueGrowNames) {
        await addGrowName(growName);
      }

      // Refresh the list
      const updatedGrowNames = await getGrowNames();
      setAvailableGrowNames(updatedGrowNames);
    };

    if (allTasks.length > 0) {
      updateGrowNames();
    }
  }, [allTasks]);

  // Filter handlers
  const handleOpenFilter = () => {
    setTempFilterGrowName(filterGrowName);
    setTempFilterStage(filterStage);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = async () => {
    setFilterGrowName(tempFilterGrowName);
    setFilterStage(tempFilterStage);
    setIsFilterModalOpen(false);

    // Save to preferences
    try {
      await updateTaskFilterPreferences({
        growName: tempFilterGrowName,
        stage: tempFilterStage,
      });
    } catch (error) {
      console.error('Error saving filter preferences:', error);
    }
  };

  const handleClearFilters = async () => {
    setTempFilterGrowName('');
    setTempFilterStage('');
    setFilterGrowName('');
    setFilterStage('');
    setIsFilterModalOpen(false);

    // Save to preferences
    try {
      await updateTaskFilterPreferences({
        growName: '',
        stage: '',
      });
    } catch (error) {
      console.error('Error clearing filter preferences:', error);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = filterGrowName !== '' || filterStage !== '';

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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

  // Create marked dates for calendar
  const markedDates = useMemo(() => {
    const marked: any = {};

    // Mark dates that have tasks
    allTasks.forEach((task) => {
      if (!marked[task.date]) {
        marked[task.date] = { marked: true, dotColor: '#007AFF' };
      }
    });

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#007AFF',
      };
    }

    return marked;
  }, [allTasks, selectedDate]);

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const getTaskTypeColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#16a34a';
      case 'today':
        return '#2563eb';
      case 'overdue':
        return '#dc2626';
      case 'upcoming':
        return iconColor;
      default:
        return iconColor;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'today':
        return Clock;
      case 'overdue':
        return AlertCircle;
      case 'upcoming':
        return Clock;
      default:
        return CheckSquare;
    }
  };

  // Filter tasks based on search query and filters
  const filteredTasks = useMemo(() => {
    let tasks = allTasks;

    // Apply filter criteria first
    if (filterGrowName) {
      tasks = tasks.filter((task) => task.growName === filterGrowName);
    }
    if (filterStage) {
      tasks = tasks.filter((task) => task.stageName === filterStage);
    }

    // Then apply search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      tasks = tasks.filter((task) => {
        return (
          task.action.toLowerCase().includes(searchLower) ||
          task.growName.toLowerCase().includes(searchLower) ||
          task.stageName.toLowerCase().includes(searchLower)
        );
      });
    }

    return tasks;
  }, [allTasks, searchQuery, filterGrowName, filterStage]);

  // Handle date picker functionality
  const handleEditTask = (task: CalendarTask) => {
    setEditingTaskId(task.id);
    setEditingTaskDate(new Date(task.date + 'T00:00:00'));
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || editingTaskDate;
    setShowDatePicker(Platform.OS === 'ios');
    setEditingTaskDate(currentDate);

    if (editingTaskId && selectedDate) {
      const newDateString = selectedDate.toISOString().split('T')[0];
      updateTaskDate(editingTaskId, newDateString);
      setEditingTaskId(null);
    }
  };

  // Handle delete functionality
  const handleDeleteTask = (task: CalendarTask) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteCalendarTask(taskToDelete.id);
      setTaskToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const groups = {
      overdue: [] as CalendarTask[],
      today: [] as CalendarTask[],
      upcoming: [] as CalendarTask[],
      completed: [] as CalendarTask[],
    };

    filteredTasks.forEach((task) => {
      const status = getTaskStatus(task);
      if (status in groups) {
        groups[status].push(task);
      }
    });

    return groups;
  }, [filteredTasks]);

  const renderTask = (task: CalendarTask) => {
    const status = getTaskStatus(task);
    const statusColor = getStatusColor(status);
    const StatusIcon = getStatusIcon(status);
    const daysUntil = getDaysUntilDue(task.date);

    let dateDisplay = task.date;
    if (daysUntil === 0) {
      dateDisplay = 'Today';
    } else if (daysUntil === 1) {
      dateDisplay = 'Tomorrow';
    } else if (daysUntil === -1) {
      dateDisplay = 'Yesterday';
    } else if (daysUntil < 0) {
      dateDisplay = `${Math.abs(daysUntil)} days ago`;
    } else if (daysUntil > 1) {
      dateDisplay = `${daysUntil} days`;
    }

    return (
      <Card
        key={task.id}
        className={`p-4 ${
          status === 'overdue' ? 'border-l-2 border-l-red-500' : ''
        } ${task.completed ? 'opacity-60' : ''}`}>
        <VStack space="sm">
          <HStack className="items-center justify-between">
            <HStack space="sm" className="flex-1 items-center">
              <Pressable onPress={() => toggleTaskCompletion(task.id)}>
                <Icon
                  as={task.completed ? CheckCircle : Circle}
                  size="md"
                  className={task.completed ? 'text-green-600' : 'text-typography-400'}
                />
              </Pressable>
              <VStack className="flex-1">
                <Text
                  className={`font-semibold ${task.completed ? 'text-typography-500 line-through' : 'text-typography-900'}`}>
                  {task.action}
                </Text>
                <Text className="text-sm text-typography-600">
                  {task.growName} - {task.stageName}
                </Text>
              </VStack>
            </HStack>
            {dateDisplay !== 'Today' && status !== 'completed' && (
              <VStack space="xs" className="">
                <HStack space="lg">
                  <Pressable onPress={() => handleEditTask(task)} className="rounded p-1">
                    <Icon as={Edit2} size="sm" className="text-typography-500" />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteTask(task)} className="rounded p-1">
                    <Icon as={Trash2} size="sm" className="text-typography-500" />
                  </Pressable>
                </HStack>
                <HStack space="xs" className="items-center">
                  <StatusIcon size={14} color={statusColor} />
                  <Text className="text-sm" style={{ color: statusColor }}>
                    {dateDisplay}
                  </Text>
                </HStack>
              </VStack>
            )}
            {dateDisplay === 'Today' && (
              <HStack space="lg">
                <Pressable onPress={() => handleEditTask(task)} className="rounded p-1">
                  <Icon as={Edit2} size="sm" className="text-typography-500" />
                </Pressable>
                <Pressable onPress={() => handleDeleteTask(task)} className="rounded p-1">
                  <Icon as={Trash2} size="sm" className="text-typography-500" />
                </Pressable>
              </HStack>
            )}
          </HStack>
        </VStack>
      </Card>
    );
  };

  return (
    <ScrollView className="flex-1 bg-background-0">
      <VStack space="lg" className="p-6">
        <View className="flex-row items-center gap-2">
          <Icon as={CalendarIcon} size="xl" className="text-typography-400" />
          <Heading size="xl" className="text-typography-900">
            Calendar
          </Heading>
        </View>

        <Text className="text-base text-typography-600">
          Track your tasks and milestones across all your grows.
        </Text>

        {/* Calendar */}
        <Card className="p-4">
          <Calendar
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={calendarTheme}
            style={calendarStyle}
            showSixWeeks={true}
            enableSwipeMonths={true}
            current={new Date().toISOString().split('T')[0]}
          />
        </Card>

        {/* Search Bar with Filter */}
        <HStack space="sm" className="mb-3 mt-1">
          <Input className="flex-1">
            <InputIcon as={Search} className="ml-3" />
            <InputField
              placeholder="Search tasks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery && (
              <Pressable onPress={() => setSearchQuery('')} className="pr-3">
                <Icon as={X} size="sm" className="text-typography-500" />
              </Pressable>
            )}
          </Input>
          <Pressable onPress={handleOpenFilter} className="rounded-lg p-3">
            <Icon
              as={Filter}
              size="lg"
              className={hasActiveFilters ? 'text-blue-400' : 'text-typography-500'}
            />
          </Pressable>
        </HStack>

        {/* Selected Date Tasks - Only show if not today */}
        {selectedDate && selectedDate !== getTodayString() && (
          <VStack space="md">
            <Text className="text-lg font-semibold text-typography-600">
              Tasks for {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
            </Text>
            {getTasksForDate(selectedDate).filter((task) => !task.completed).length === 0 ? (
              <VStack
                className="items-center rounded-lg border border-dashed border-typography-300 p-6"
                space="sm">
                <Icon as={CheckSquare} className="text-typography-400" size="xl" />
                <Text className="text-center text-typography-500">No tasks for this date</Text>
              </VStack>
            ) : (
              <VStack space="md">
                {getTasksForDate(selectedDate)
                  .filter((task) => !task.completed)
                  .map(renderTask)}
              </VStack>
            )}
          </VStack>
        )}

        {/* Overdue Tasks */}
        {tasksByStatus.overdue.length > 0 && (
          <VStack space="md">
            <Pressable onPress={() => toggleSection('overdue')}>
              <HStack className="items-center justify-between">
                <Text className="text-md font-semibold text-red-500">
                  Overdue ({tasksByStatus.overdue.length})
                </Text>
                <Icon
                  as={expandedSections.overdue ? ChevronDown : ChevronRight}
                  size="sm"
                  className="text-typography-600"
                />
              </HStack>
            </Pressable>
            {expandedSections.overdue && (
              <VStack space="md">{tasksByStatus.overdue.map(renderTask)}</VStack>
            )}
          </VStack>
        )}

        {/* Today's Tasks */}
        {tasksByStatus.today.length > 0 && (
          <VStack space="md">
            <Pressable onPress={() => toggleSection('today')}>
              <HStack className="items-center justify-between">
                <Text className="text-md font-semibold text-typography-600">
                  Today ({tasksByStatus.today.length})
                </Text>
                <Icon
                  as={expandedSections.today ? ChevronDown : ChevronRight}
                  size="sm"
                  className="text-typography-600"
                />
              </HStack>
            </Pressable>
            {expandedSections.today && (
              <VStack space="md">{tasksByStatus.today.map(renderTask)}</VStack>
            )}
          </VStack>
        )}

        {/* Upcoming Tasks */}
        {tasksByStatus.upcoming.length > 0 && (
          <VStack space="md">
            <Pressable onPress={() => toggleSection('upcoming')}>
              <HStack className="items-center justify-between">
                <Text className="text-md font-semibold text-typography-600">
                  Upcoming ({tasksByStatus.upcoming.length})
                </Text>
                <Icon
                  as={expandedSections.upcoming ? ChevronDown : ChevronRight}
                  size="sm"
                  className="text-typography-600"
                />
              </HStack>
            </Pressable>
            {expandedSections.upcoming && (
              <VStack space="md">{tasksByStatus.upcoming.map(renderTask)}</VStack>
            )}
          </VStack>
        )}

        {/* Completed Tasks */}
        {tasksByStatus.completed.length > 0 && (
          <VStack space="md">
            <Pressable onPress={() => toggleSection('completed')}>
              <HStack className="items-center justify-between">
                <Text className="text-md font-semibold text-typography-600">
                  Completed ({tasksByStatus.completed.length})
                </Text>
                <Icon
                  as={expandedSections.completed ? ChevronDown : ChevronRight}
                  size="sm"
                  className="text-typography-600"
                />
              </HStack>
            </Pressable>
            {expandedSections.completed && (
              <VStack space="md">{tasksByStatus.completed.map(renderTask)}</VStack>
            )}
          </VStack>
        )}

        {/* Empty State - No tasks at all */}
        {allTasks.length === 0 && (
          <VStack
            className="items-center rounded-lg border border-dashed border-typography-300 p-6"
            space="sm">
            <Icon as={CalendarX2} className="text-typography-400" size="xl" />
            <Text className="text-center text-typography-500">No tasks scheduled</Text>
            <Text className="text-center text-sm text-typography-400">
              Tasks will appear here when you add them from your grow stages
            </Text>
          </VStack>
        )}

        {/* Empty State - Tasks exist but filtered out */}
        {allTasks.length > 0 && filteredTasks.length === 0 && (
          <VStack
            className="items-center rounded-lg border border-dashed border-typography-300 p-6"
            space="sm">
            <Icon as={CalendarX2} className="text-typography-400" size="xl" />
            <Text className="text-center text-typography-500">No tasks match your filters</Text>
            <Text className="text-center text-sm text-typography-400">
              Try adjusting your search or filter criteria
            </Text>
          </VStack>
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={editingTaskDate}
            mode="date"
            is24Hour={true}
            onChange={handleDateChange}
          />
        )}

        {/* Task Filter Modal */}
        <TaskFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          availableGrowNames={availableGrowNames}
          filterGrowName={filterGrowName}
          filterStage={filterStage}
          tempFilterGrowName={tempFilterGrowName}
          tempFilterStage={tempFilterStage}
          setTempFilterGrowName={setTempFilterGrowName}
          setTempFilterStage={setTempFilterStage}
          onApplyFilters={handleApplyFilters}
          onClearAll={handleClearFilters}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Task"
          message="Are you sure you want to delete this calendar task? This action cannot be undone."
          itemName={taskToDelete?.action}
        />
      </VStack>
    </ScrollView>
  );
}
