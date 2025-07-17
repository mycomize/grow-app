import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { useToast, Toast } from '~/components/ui/toast';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { InfoBadge } from '~/components/ui/info-badge';
import {
  Plus,
  Edit2,
  Trash2,
  CheckSquare,
  Calendar,
  Copy,
  CalendarPlus,
  CalendarX,
  CheckCircle,
  Clock,
  AlertTriangle,
  Repeat,
} from 'lucide-react-native';
import { Task } from '~/lib/tekTypes';
import { TaskModal } from '~/components/modals/TaskModal';
import { DeleteConfirmationModal } from '~/components/modals/DeleteConfirmationModal';
import { useCalendar } from '~/lib/CalendarContext';

interface TasksListProps {
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  grow?: any; // Grow data for calendar integration
  stageName?: string; // Stage name for calendar integration
  stageStartDate?: string; // Stage start date for calendar integration
}

export const TasksList: React.FC<TasksListProps> = ({
  tasks,
  onUpdateTasks,
  grow,
  stageName,
  stageStartDate,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const { addTaskToCalendar, removeTaskFromCalendar, isTaskInCalendar } = useCalendar();
  const toast = useToast();
  const { theme } = useTheme();

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
      // Remove task from the tasks list
      const updatedTasks = tasks.filter((t) => t.id !== taskToDelete.id);
      onUpdateTasks(updatedTasks);

      // Also remove the task from calendar if it exists there
      if (grow && isTaskInCalendar(taskToDelete.id, grow.id)) {
        removeTaskFromCalendar(taskToDelete.id);
        showToast(`Task "${taskToDelete.action}" removed from calendar`);
      }

      setTaskToDelete(null);
    }
  };

  // Toast function for success messages
  const showToast = (message: string) => {
    const toastId = Math.random().toString();
    const bgColor = 'bg-background-0';
    const textColor = theme === 'dark' ? 'text-green-600' : 'text-green-700';
    const descColor = 'text-typography-300';

    toast.show({
      id: `success-toast-${toastId}`,
      placement: 'top',
      duration: 3000,
      render: () => (
        <Toast variant="outline" className={`mx-auto mt-36 w-full p-4 ${bgColor}`}>
          <VStack space="xs" className="w-full">
            <HStack className="flex-row gap-2">
              <Icon as={CheckCircle} className={`mt-0.5 ${textColor}`} />
              <Text className={`font-semibold ${textColor}`}>Success</Text>
            </HStack>
            <Text className={descColor}>{message}</Text>
          </VStack>
        </Toast>
      ),
    });
  };

  const handleToggleCalendar = (task: Task) => {
    // Only allow calendar operations if we have the necessary data
    if (!grow || !stageName || !stageStartDate) {
      console.warn('Cannot add task to calendar: missing grow, stage name, or stage start date');
      return;
    }

    const taskInCalendar = isTaskInCalendar(task.id, grow.id);

    if (taskInCalendar) {
      removeTaskFromCalendar(task.id);
      showToast(`Task "${task.action}" removed from calendar`);
    } else {
      addTaskToCalendar(task, grow, stageName, stageStartDate);
      showToast(`Task "${task.action}" added to calendar`);
    }
  };

  // Get calendar task status for a given task
  const getTaskCalendarStatus = (task: Task) => {
    if (!grow || !canUseCalendar) return null;

    const { calendarState } = useCalendar();
    const calendarTasks = calendarState.tasks.filter(
      (calendarTask) => calendarTask.taskId === task.id && calendarTask.growId === grow.id
    );

    if (calendarTasks.length === 0) return null;

    // Check if all calendar tasks are completed
    const completedTasks = calendarTasks.filter((task) => task.completed);
    const allCompleted = completedTasks.length === calendarTasks.length;

    if (allCompleted) {
      return {
        status: 'complete',
        icon: CheckCircle,
        text: 'Complete',
        variant: 'success' as const,
      };
    }

    // Find the next upcoming or overdue task
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const incompleteTasks = calendarTasks.filter((task) => !task.completed);
    const nextTask = incompleteTasks.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];

    if (!nextTask) return null;

    const taskDate = new Date(nextTask.date);
    const diffTime = taskDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        status: 'overdue',
        icon: AlertTriangle,
        text: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        variant: 'error' as const,
      };
    } else if (diffDays === 0) {
      return { status: 'today', icon: Clock, text: 'Due today', variant: 'warning' as const };
    } else {
      return {
        status: 'upcoming',
        icon: Clock,
        text: `${diffDays} day${diffDays !== 1 ? 's' : ''}`,
        variant: 'default' as const,
      };
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

  // Check if calendar functionality is available
  const canUseCalendar = grow && stageName && stageStartDate;

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
          {tasks.map((task) => {
            const calendarStatus = getTaskCalendarStatus(task);
            return (
              <VStack
                key={task.id}
                className="rounded-lg border border-background-200 bg-background-0 p-3"
                space="sm">
                {/* Main content */}
                <HStack className="items-start justify-between">
                  <Text className="flex-1 font-medium text-typography-900">{task.action}</Text>
                  {calendarStatus && (
                    <InfoBadge
                      icon={calendarStatus.icon}
                      text={calendarStatus.text}
                      variant={calendarStatus.variant}
                      size="sm"
                    />
                  )}
                </HStack>

                {/* Frequency row */}
                <HStack className="items-center" space="xs">
                  <Icon as={Repeat} className="text-typography-500" size="sm" />
                  <Text className="text-sm text-typography-600">{task.frequency}</Text>
                </HStack>

                {/* Action buttons at bottom */}
                <HStack className="items-center justify-between px-8 pt-3" space="sm">
                  {canUseCalendar && (
                    <Pressable onPress={() => handleToggleCalendar(task)} className="rounded px-2">
                      <Icon
                        as={isTaskInCalendar(task.id, grow.id) ? CalendarX : CalendarPlus}
                        className={
                          isTaskInCalendar(task.id, grow.id)
                            ? 'text-primary-600'
                            : 'text-typography-500'
                        }
                        size="sm"
                      />
                    </Pressable>
                  )}
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
              </VStack>
            );
          })}
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
