import React, { useState, useMemo, useEffect } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Divider } from '~/components/ui/divider';
import { ChevronDown, ChevronRight, CheckSquare, } from 'lucide-react-native';
import { formatDateForDisplay, groupTasksByDate, getTaskEffectiveStatus } from '~/lib/utils/calendarUtils';
import { CalendarTask } from '~/lib/types/calendarTypes';
import { TaskListItem } from './TaskListItem';
import { InfoBadge } from '../ui/info-badge';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

interface CalendarTaskListProps {
  tasks: CalendarTask[];
  selectedDate?: string;
  onToggleCompletion: (taskId: string, growId: number, stageKey: string) => void;
}

export const CalendarTaskList: React.FC<CalendarTaskListProps> = ({
  tasks,
  selectedDate,
  onToggleCompletion,
}) => {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Group tasks by date - memoized to prevent infinite re-renders
  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const dateKeys = useMemo(() => Object.keys(tasksByDate).sort(), [tasksByDate]);

  // Auto-expand today and selected date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    setExpandedDates(prev => {
      const newExpanded = { ...prev };
      
      // Always expand today
      if (tasksByDate[today] && newExpanded[today] === undefined) {
        newExpanded[today] = true;
      }
      
      // Also expand selected date if different from today
      if (selectedDate && selectedDate !== today && tasksByDate[selectedDate] && newExpanded[selectedDate] === undefined) {
        newExpanded[selectedDate] = true;
      }
      
      return newExpanded;
    });
  }, [selectedDate, tasksByDate]);

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  if (dateKeys.length === 0) {
    return (
      <>
      <HStack className="items-center justify-between mb-2">
        <HStack className="items-center" space="sm">
          <FontAwesome5 name="tasks" size={16} color="#8c8c8c"  />
          <Text className="text-lg font-semibold text-typography-900">Task Schedule</Text>
        </HStack>
      </HStack>
      <VStack
        className="items-center rounded-lg border border-dashed border-typography-300 p-6"
        space="sm"
      >
        <Icon as={CheckSquare} className="text-typography-400" size="xl" />
        <Text className="text-center text-typography-500">No tasks scheduled</Text>
        <Text className="text-center text-sm text-typography-400">
          Add tasks to the calendar from your grows' stages to see them here.
        </Text>
      </VStack>
      </>
    );
  }

  return (
    <VStack space="md">
      {/* Header */}
      <HStack className="items-center justify-between">
        <HStack className="items-center" space="sm">
          <FontAwesome5 name="tasks" size={16} color="#8c8c8c"  />
          <Text className="text-lg font-semibold text-typography-900">Task Schedule</Text>
        </HStack>
      </HStack>

      {/* Task Groups by Date */}
      <VStack space="md">
        {dateKeys.map((date) => {
          const dateTasks = tasksByDate[date];
          const isExpanded = expandedDates[date];
          
          // Calculate counts based on effective status
          const tasksByEffectiveStatus = dateTasks.reduce((acc, task) => {
            const effectiveStatus = getTaskEffectiveStatus(task);
            acc[effectiveStatus] = (acc[effectiveStatus] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const upcomingCount = tasksByEffectiveStatus.upcoming || 0;
          const completedCount = tasksByEffectiveStatus.completed || 0;
          const overdueCount = tasksByEffectiveStatus.overdue || 0;
          const isToday = date === new Date().toISOString().split('T')[0];

          return (
            <VStack key={date} space="sm" className="ml-1">
              {/* Date Header */}
              <Button
                variant="link"
                size="sm"
                onPress={() => toggleDateExpansion(date)}
                className="justify-between"
              >
                <HStack className="items-center flex-1" space="sm">
                  <Text className={`flex-1 font-medium ${isToday ? 'text-primary-600' : 'text-typography-700'}`}>
                    {formatDateForDisplay(date)}
                  </Text>
                  {overdueCount > 0 && (
                    <InfoBadge text={`${overdueCount} overdue`} variant="error" size="sm"/> 
                  )}
                  {upcomingCount > 0 && (
                    <InfoBadge text={`${upcomingCount} upcoming`} variant="warning" size="sm"/> 
                  )}
                  {completedCount > 0 && (
                    <InfoBadge text={`${completedCount} completed`} variant="success" size="sm"/> 
                  )}
                </HStack>
                <ButtonIcon as={isExpanded ? ChevronDown : ChevronRight } size="sm" />
              </Button>

              {/* Task List */}
              {isExpanded && (
                <VStack space="sm" className="">
                  {dateTasks.map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      onToggleCompletion={onToggleCompletion}
                    />
                  ))}
                </VStack>
              )}
            </VStack>
          );
        })}
      </VStack>
    </VStack>
  );
};
