import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetIcon,
} from '~/components/ui/actionsheet';
import {
  Plus,
  Edit2,
  Trash2,
  CheckSquare,
  Repeat,
  EllipsisVertical,
  SquarePen,
} from 'lucide-react-native';
import { Task, TaskContext } from '~/lib/types/tekTypes';
import { TaskModal } from '~/components/modals/TaskModal';
import { DeleteConfirmationModal } from '~/components/modals/DeleteConfirmationModal';
import { useGrowStore } from '~/lib/stores/growStore';
import { useTeksStore } from '~/lib/stores/teksStore';
import { useAuthEncryption } from '~/lib/stores/authEncryptionStore';
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
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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

  // Action sheet handlers
  const handleActionSheetEdit = () => {
    if (selectedTask) {
      setIsActionSheetOpen(false);
      setEditingTask(selectedTask);
      setIsModalOpen(true);
    }
  };

  const handleActionSheetDelete = () => {
    if (selectedTask) {
      setIsActionSheetOpen(false);
      setTaskToDelete(selectedTask);
      setIsDeleteModalOpen(true);
    }
  };

  // Authentication hook
  const { token } = useAuthEncryption();

  const handleConfirmDelete = async () => {
    if (taskToDelete) {
      try {
        if (context === 'grow') {
          // Get current grow ID from the store
          const currentGrow = growStore.currentGrow;
          if (currentGrow && currentGrow.id && token) {
            // Use API-enabled deletion method for grows
            await growStore.deleteTaskFromGrow(taskToDelete.id, currentGrow.id, stageKey, token);
            showSuccess('Task deleted successfully');
          } else {
            // Fallback to local deletion if no grow ID or token
            growStore.deleteTaskFromStage(stageKey, taskToDelete.id);
            showSuccess('Task deleted successfully');
          }
        } else {
          // For teks, use local deletion only
          teksStore.deleteTaskFromStage(stageKey, taskToDelete.id);
          showSuccess('Task deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        // Error already handled by the store with automatic login redirect if needed
      }
      
      setTaskToDelete(null);
      setIsDeleteModalOpen(false);
    }
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
          {tasks.map((task) => (
            <VStack
              key={task.id}
              className="rounded-lg border border-background-200 bg-background-0 p-3"
              space="sm">
              {/* Main content with ellipsis menu */}
              <HStack className="items-start justify-between">
                <VStack className="flex-1" space="xs">
                  <Text className="font-medium text-typography-900">{task.action}</Text>
                  {/* Show frequency for all task templates */}
                  <HStack className="items-center" space="xs">
                    <Icon as={Repeat} className="text-typography-500" size="sm" />
                    <Text className="text-sm text-typography-600">{task.frequency}</Text>
                  </HStack>
                </VStack>
                
                {/* Ellipsis menu - Hide in read-only mode */}
                {!readOnly && (
                  <HStack>
                    <Pressable 
                      onPress={() => {
                        setSelectedTask(task);
                        setIsActionSheetOpen(true);
                      }} 
                      className="rounded p-2"
                    >
                      <Icon as={EllipsisVertical} className="text-typography-500" size="md" />
                    </Pressable>
                  </HStack>
                )}
              </HStack>
            </VStack>
          ))}
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

      {/* Action Sheet */}
      <Actionsheet isOpen={isActionSheetOpen} onClose={() => setIsActionSheetOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          
          <ActionsheetItem onPress={handleActionSheetEdit}>
            <ActionsheetIcon size="lg" as={SquarePen} />
            <ActionsheetItemText className="text-typography-600 text-lg">Edit Task</ActionsheetItemText>
          </ActionsheetItem>
          
          <ActionsheetItem onPress={handleActionSheetDelete}>
            <ActionsheetIcon size="lg" as={Trash2} />
            <ActionsheetItemText className="text-typography-600 text-lg text-red-600">Delete Task</ActionsheetItemText>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>
    </VStack>
  );
};
