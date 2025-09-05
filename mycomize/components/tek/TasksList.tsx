import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import {
  Plus,
  Edit2,
  Trash2,
  CheckSquare,
  Copy,
  CalendarPlus,
  CheckCircle,
  Clock,
  Repeat,
} from 'lucide-react-native';
import { Task, TaskContext, generateId } from '~/lib/types/tekTypes';
import { TaskModal } from '~/components/modals/TaskModal';
import { DeleteConfirmationModal } from '~/components/modals/DeleteConfirmationModal';
import { useGrowStore } from '~/lib/stores/growStore';
import { useTeksStore } from '~/lib/stores/teksStore';
import { InfoBadge } from '~/components/ui/info-badge';
interface TasksListProps {
  stageKey: string; // The stage key for tasks (e.g., 'inoculation', 'spawn_colonization', etc.)
  context: TaskContext; // 'grow' or 'tek' - determines which store to use
  readOnly?: boolean; // Whether the component should be read-only (hides add/edit/delete buttons)
}

export const TasksList: React.FC<TasksListProps> = ({
  stageKey,
  context,
  readOnly = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const { showSuccess } = useUnifiedToast();

  // Store hooks
  const growStore = useGrowStore();
  const teksStore = useTeksStore();

  // Get tasks for the current stage using store selectors
  const tasks: Task[] = context === 'grow' 
    ? growStore.getTasksForStage(stageKey)
    : teksStore.getTasksForStage(stageKey);

  // Get stage start date for grow context
  const stageStartDate: string | undefined = context === 'grow' 
    ? growStore.getStageStartDate(stageKey)
    : undefined;

  const handleAddTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleCopyTask = (task: Task) => {
    const newTask: Task = {
      ...task,
      id: generateId(),
      action: `${task.action} (Copy)`,
      status: 'pending', // Reset status for copied task
    };
    
    // Use store function to add the copied task
    if (context === 'grow') {
      growStore.addTaskToStage(stageKey, newTask);
    } else {
      teksStore.addTaskToStage(stageKey, newTask);
    }
    
    showSuccess('Task copied successfully');
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      // Use store function to delete the task
      if (context === 'grow') {
        growStore.deleteTaskFromStage(stageKey, taskToDelete.id);
      } else {
        teksStore.deleteTaskFromStage(stageKey, taskToDelete.id);
      }
      
      setTaskToDelete(null);
      showSuccess('Task deleted successfully');
    }
  };

  const getDateTimeDisplay = (task: Task) => {
    const parts = [];
    
    if (task.start_date) {
      const date = new Date(task.start_date + 'T00:00:00');
      parts.push(`Start: ${date.toLocaleDateString()}`);
    }
    
    if (task.start_time) {
      parts.push(`Time: ${task.start_time}`);
    }
    
    if (task.end_date) {
      const date = new Date(task.end_date + 'T00:00:00');
      parts.push(`End: ${date.toLocaleDateString()}`);
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const needsDate = (task: Task) => {
    // Only show "Needs Date" in grow context when no date fields are set
    if (context !== 'grow') return false;
    return !task.start_date && !task.start_time && !task.end_date;
  };

  return (
    <VStack space="sm">
      {/* Header */}
      <HStack className="mb-2 items-center justify-between">
        <Text className="font-medium text-typography-700">Tasks</Text>
        {!readOnly && (
          <Button variant="outline" size="sm" onPress={handleAddTask}>
            <ButtonIcon as={Plus} size="sm" />
            <ButtonText>Add</ButtonText>
          </Button>
        )}
      </HStack>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <VStack
          className="items-center rounded-lg border border-dashed border-typography-300 p-6"
          space="sm">
          <Icon as={CheckSquare} className="text-typography-400" size="xl" />
          <Text className="text-center text-typography-500">No tasks added yet</Text>
        </VStack>
      ) : (
        <VStack space="md">
          {tasks.map((task) => {
            const dateTimeDisplay = getDateTimeDisplay(task);
            
            return (
              <VStack
                key={task.id}
                className="rounded-lg border border-background-200 bg-background-0 p-3"
                space="sm">
                {/* Main content */}
                <HStack className="items-start justify-between">
                  <VStack className="flex-1" space="xs">
                    <Text className="font-medium text-typography-900">{task.action}</Text>
                    
                    {/* Frequency row */}
                    <HStack className="items-center" space="xs">
                      <Icon as={Repeat} className="text-typography-500" size="sm" />
                      <Text className="text-sm text-typography-600">{task.frequency}</Text>
                    </HStack>

                    {/* Date/Time info - Only show for grow context */}
                    {context === 'grow' && dateTimeDisplay && (
                      <HStack className="items-center" space="xs">
                        <Icon as={Clock} className="text-typography-500" size="sm" />
                        <Text className="text-sm text-typography-600">{dateTimeDisplay}</Text>
                      </HStack>
                    )}
                  </VStack>
                  
                  {/* Status badge or Needs Date indicator */}
                  <VStack className="items-end">
                    {needsDate(task) ? (
                      <InfoBadge icon={CalendarPlus} text="Needs Date" variant='warning' />
                    ) : (
                      <></>
                    )}
                  </VStack>
                </HStack>

                {/* Action buttons at bottom - Hide in read-only mode */}
                {!readOnly && (
                  <HStack className="items-center justify-between px-8 pt-3" space="sm">
                    <Pressable onPress={() => handleCopyTask(task)} className="rounded px-2">
                      <Icon as={Copy} className="text-typography-500" size="sm" />
                    </Pressable>
                    <Pressable onPress={() => handleEditTask(task)} className="rounded px-2">
                      <Icon as={Edit2} className="text-typography-500" size="sm" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteTask(task)} className="rounded px-2">
                      <Icon as={Trash2} className="text-typography-500" size="sm" />
                    </Pressable>
                  </HStack>
                )}
              </VStack>
            );
          })}
        </VStack>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={editingTask}
        context={context}
        stageKey={stageKey}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        itemName={taskToDelete?.action}
      />
    </VStack>
  );
};
