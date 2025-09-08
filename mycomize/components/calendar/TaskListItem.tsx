import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Badge, BadgeText } from '~/components/ui/badge';
import { Circle, CheckCircle, Clock, Workflow } from 'lucide-react-native';
import { CalendarTask, formatTimeForDisplay, getTaskEffectiveStatus } from '~/lib/utils/calendarUtils';
import { CalendarTaskDateUpdateModal } from '../modals/CalendarTaskDateUpdateModal';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface TaskListItemProps {
  task: CalendarTask;
  onToggleCompletion: (taskId: string, growId: number, stageKey: string) => void;
}

export const TaskListItem: React.FC<TaskListItemProps> = ({
  task,
  onToggleCompletion,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const effectiveStatus = getTaskEffectiveStatus(task);
  const isPending = effectiveStatus === 'upcoming';
  const isOverdue = effectiveStatus === 'overdue';

  const handleToggleCompletion = () => {
    onToggleCompletion(task.id, task.growId, task.stageKey);
  };

  const handleTaskPress = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Pressable onPress={handleTaskPress}>
        <HStack className="items-center justify-between rounded-lg border border-background-200 bg-background-0 py-3 px-4" space="md">
          <VStack className="flex-1" space="xs">
            <Text 
             className={`flex-1 text-lg font-medium ${
               effectiveStatus === 'completed' 
                 ? 'text-typography-600 line-through' 
                 : isOverdue 
                   ? 'text-error-600' 
                   : 'text-typography-900'
             }`}
            >
             {task.action}
            </Text>

            {/* Time Display */}
            {task.time && (
             <HStack className="items-center" space="xs">
               <Icon as={Clock} className="text-typography-500" size="sm" />
               <Text className="text-sm text-typography-600">
                 {formatTimeForDisplay(task.time)}
               </Text>
                </HStack>
              )}
          </VStack>
          <VStack className="mr-1">
            <HStack className="items-center gap-2 justify-end">
              <MaterialCommunityIcons name="mushroom-outline" size={16} color="#8c8c8c"/> 
              <Text className="text-typography-500" numberOfLines={1} ellipsizeMode='tail'>{task.growName}</Text>
            </HStack>
            <HStack className="items-center gap-2 justify-end">
              <Icon as={Workflow} className="text-typography-500" size="sm" /> 
              <Text className="text-typography-500" numberOfLines={1} ellipsizeMode='tail'>{task.stageName}</Text>
            </HStack>
          </VStack>

          {/* Completion Toggle Icon */}
          <Pressable onPress={handleToggleCompletion} className="flex-shrink-0">
            <Icon 
              as={effectiveStatus === 'completed' ? CheckCircle : Circle} 
              className={
                effectiveStatus === 'completed' 
                  ? 'text-success-500' 
                  : isOverdue 
                    ? 'text-error-500' 
                    : 'text-typography-400'
              } 
              size="xl" 
            />
          </Pressable>
        </HStack>
      </Pressable>

      {/* Task Date Update Modal */}
      <CalendarTaskDateUpdateModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={task}
      />
    </>
  );
};
