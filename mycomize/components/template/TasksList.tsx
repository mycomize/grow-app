import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Plus, Edit2, Trash2, CheckSquare, Calendar, Copy } from 'lucide-react-native';
import { Task } from '~/lib/templateTypes';
import { TaskModal } from './modals/TaskModal';
import { DeleteConfirmationModal } from './modals/DeleteConfirmationModal';

interface TasksListProps {
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
}

export const TasksList: React.FC<TasksListProps> = ({ tasks, onUpdateTasks }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

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

  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      // Update existing task
      const updatedTasks = tasks.map((t) => (t.id === task.id ? task : t));
      onUpdateTasks(updatedTasks);
    } else {
      // Add new task
      onUpdateTasks([...tasks, task]);
    }
  };

  const handleCopyTask = (task: Task) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(), // Generate a new ID
      action: `${task.action}`,
    };
    onUpdateTasks([...tasks, newTask]);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      const updatedTasks = tasks.filter((t) => t.id !== taskToDelete.id);
      onUpdateTasks(updatedTasks);
      setTaskToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <VStack space="sm">
      {/* Header */}
      <HStack className="mb-2 items-center justify-between">
        <Text className="font-medium text-typography-700">Tasks</Text>
        <Button variant="outline" size="sm" onPress={handleAddTask}>
          <ButtonIcon as={Plus} size="sm" />
          <ButtonText>Add</ButtonText>
        </Button>
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
              <HStack className="items-start justify-between">
                <VStack className="flex-1" space="xs">
                  <Text className="font-medium text-typography-900">{task.action}</Text>
                  <Text className="text-sm text-typography-600">Frequency: {task.frequency}</Text>
                  <HStack className="items-center" space="xs">
                    <Text className="text-sm text-typography-600">
                      Day {task.days_after_stage_start} of stage
                    </Text>
                  </HStack>
                </VStack>
                <HStack space="lg">
                  <Pressable onPress={() => handleCopyTask(task)} className="rounded p-2">
                    <Icon as={Copy} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable onPress={() => handleEditTask(task)} className="rounded p-2">
                    <Icon as={Edit2} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteTask(task)} className="rounded p-2">
                    <Icon as={Trash2} className="text-typography-500" size="sm" />
                  </Pressable>
                </HStack>
              </HStack>
            </VStack>
          ))}
        </VStack>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
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
