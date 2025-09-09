import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '~/components/ui/modal';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from '~/components/ui/checkbox';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, CalendarDays, Clock, Check, Trash2 } from 'lucide-react-native';
import { CalendarTask } from '~/lib/types/calendarTypes';
import { useCalendarStore } from '~/lib/stores/calendarStore';
import { useAuthEncryption } from '~/lib/stores/authEncryptionStore';
import { useNotificationStore } from '~/lib/stores/notificationStore';
import { useGrowStore } from '~/lib/stores/growStore';

// Simplified type since we now have a single CalendarTask interface
type TaskForModal = CalendarTask | null;

interface TaskDateUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskForModal;
}

export const CalendarTaskDateUpdateModal: React.FC<TaskDateUpdateModalProps> = ({
  isOpen,
  onClose,
  task,
}) => {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    notificationEnabled: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Store hooks
  const updateCalendarTask = useCalendarStore((state) => state.updateCalendarTask);
  const deleteCalendarTask = useCalendarStore((state) => state.deleteCalendarTask);
  const parseDate = useCalendarStore((state) => state.parseDate);
  const formatDateForAPI = useCalendarStore((state) => state.formatDateForAPI);
  const { token } = useAuthEncryption();
  const growStore = useGrowStore();
  const { 
    scheduleTaskNotification,
    cancelTaskNotification,
    rescheduleTaskNotification
  } = useNotificationStore();

  // Date utility functions
  const formatTimeForAPI = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const parseTime = (timeString?: string): Date | null => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Date/time picker handlers
  const handleDateChange = (field: string, date?: Date, event?: any) => {
    if (event?.type === 'dismissed') {
      setActiveDatePicker(null);
      return;
    }

    if (date && field === 'date') {
      const formattedDate = formatDateForAPI(date);
      if (formattedDate) {
        updateFormField('date', formattedDate);
      }
    }
    setActiveDatePicker(null);
  };

  const handleTimeChange = (field: string, date?: Date, event?: any) => {
    if (event?.type === 'dismissed') {
      setActiveTimePicker(null);
      return;
    }

    if (date && field === 'time') {
      const formattedTime = formatTimeForAPI(date);
      if (formattedTime) {
        updateFormField('time', formattedTime);
      }
    }
    setActiveTimePicker(null);
  };

  // Helper to get task ID as string
  const getTaskId = (task: TaskForModal): string | null => {
    if (!task) return null;
    return typeof task.id === 'string' ? task.id : task.id.toString();
  };

  // Helper to get date from task
  const getTaskDate = (task: TaskForModal): string => {
    if (!task) return '';
    return task.date || '';
  };

  // Helper to get time from task
  const getTaskTime = (task: TaskForModal): string => {
    if (!task) return '';
    return task.time || '';
  };

  // Helper to get notification enabled status from task
  const getTaskNotificationEnabled = (task: TaskForModal): boolean => {
    if (!task) return false;
    return (task as any).notification_enabled || false;
  };

  // Initialize form data when modal opens or task changes
  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        date: getTaskDate(task),
        time: getTaskTime(task),
        notificationEnabled: getTaskNotificationEnabled(task),
      });
      setErrors({});
      setActiveDatePicker(null);
      setActiveTimePicker(null);
      setIsSubmitting(false);
    }
  }, [isOpen, task]);

  const updateFormField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const updateNotificationField = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, notificationEnabled: checked }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date.trim()) {
      newErrors.date = 'Date is required';
    }

    if (!formData.time.trim()) {
      newErrors.time = 'Time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!task || !token || !validateForm()) {
      return;
    }

    const taskId = getTaskId(task);
    if (!taskId) {
      setErrors({ general: 'Invalid task ID' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current task state
      const wasNotificationEnabled = getTaskNotificationEnabled(task);
      const currentNotificationId = (task as any).notification_id;
      const dateChanged = formData.date.trim() !== getTaskDate(task);
      const timeChanged = formData.time.trim() !== getTaskTime(task);
      const notificationChanged = formData.notificationEnabled !== wasNotificationEnabled;
      
      // Get grow name and stage key for notification context
      const taskGrowId = (task as any).grow_id;
      const taskStageKey = (task as any).stage_key;
      const currentGrow = growStore.grows.find(g => g.id === taskGrowId);
      const growName = currentGrow?.name;
      
      let newNotificationId: string | null = null;

      // Handle notification logic
      if (wasNotificationEnabled && !formData.notificationEnabled) {
        // Disable notifications - cancel existing
        if (currentNotificationId) {
          await cancelTaskNotification(currentNotificationId);
        }
      } else if (!wasNotificationEnabled && formData.notificationEnabled) {
        // Enable notifications - schedule new
        newNotificationId = await scheduleTaskNotification(
          parseInt(taskId),
          task.action,
          formData.date.trim(),
          formData.time.trim(),
          growName,
          taskStageKey
        );
      } else if (wasNotificationEnabled && formData.notificationEnabled && (dateChanged || timeChanged)) {
        // Reschedule existing notification with new date/time
        if (currentNotificationId) {
          newNotificationId = await rescheduleTaskNotification(
            parseInt(taskId),
            currentNotificationId,
            task.action,
            formData.date.trim(),
            formData.time.trim(),
            growName,
            taskStageKey
          );
        } else {
          // No existing notification ID, schedule new
          newNotificationId = await scheduleTaskNotification(
            parseInt(taskId),
            task.action,
            formData.date.trim(),
            formData.time.trim(),
            growName,
            taskStageKey
          );
        }
      } else {
        // Keep existing notification ID if no notification changes
        newNotificationId = currentNotificationId;
      }

      // Update calendar task with new data
      const updateData: any = {
        date: formData.date.trim(),
        time: formData.time.trim(),
        notification_enabled: formData.notificationEnabled,
      };

      // Only include notification_id if we have one
      if (formData.notificationEnabled && newNotificationId) {
        updateData.notification_id = newNotificationId;
      } else if (!formData.notificationEnabled) {
        updateData.notification_id = null;
      }

      const success = await updateCalendarTask(token, taskId, updateData);

      if (success) {
        console.log(`Successfully updated task ${taskId} with notifications`);
        onClose();
      } else {
        setErrors({ general: 'Failed to update task. Please try again.' });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setErrors({ general: 'An error occurred while updating the task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !token) {
      return;
    }

    const taskId = getTaskId(task);
    if (!taskId) {
      setErrors({ general: 'Invalid task ID' });
      return;
    }

    setIsDeleting(true);
    setErrors({}); // Clear any existing errors

    try {
      const success = await deleteCalendarTask(token, taskId);

      if (success) {
        console.log(`Successfully deleted task ${taskId}`);
        onClose();
      } else {
        setErrors({ general: 'Failed to delete task. Please try again.' });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setErrors({ general: 'An error occurred while deleting the task.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isDeleting) {
      onClose();
    }
  };

  if (!task) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <HStack className="items-center gap-2">
            <Icon as={CalendarDays} className="text-primary-600" size="lg" />
            <Text className="text-lg font-semibold flex-1">Modify Task</Text>
          </HStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="xl" className="mt-2 mb-2">
            {/* Task Action Display */}
            <VStack space="xs">
              <Text className="text-typography-500">Task</Text>
              <Text className="font-medium text-lg text-typography-700">{task.action}</Text>
            </VStack>

            {/* Date Field */}
            <VStack space="xs">
              <Text className="text-typography-500">Date</Text>
              <Input isReadOnly className={errors.date ? 'border-error-500' : ''}>
                <InputField
                  value={parseDate(formData.date)?.toDateString() || 'Select date'}
                  className={!formData.date ? 'text-typography-400' : ''}
                />
                {formData.date ? (
                  <InputSlot onPress={() => updateFormField('date', '')}>
                    <Icon as={X} className="mr-3 text-typography-400" />
                  </InputSlot>
                ) : (
                  <InputSlot onPress={() => setActiveDatePicker('date')}>
                    <Icon as={CalendarDays} className="mr-3 text-typography-400" />
                  </InputSlot>
                )}
              </Input>
              {errors.date && <Text className="text-sm text-error-600">{errors.date}</Text>}
              {activeDatePicker === 'date' && (
                <DateTimePicker
                  value={parseDate(formData.date) || new Date()}
                  mode="date"
                  onChange={(event, date) => handleDateChange('date', date, event)}
                />
              )}
            </VStack>

            {/* Time Field */}
            <VStack space="xs">
              <Text className="text-typography-500">Time</Text>
              <Input isReadOnly className={errors.time ? 'border-error-500' : ''}>
                <InputField
                  value={parseTime(formData.time)?.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) || 'Select time'}
                  className={!formData.time ? 'text-typography-400' : ''}
                />
                {formData.time ? (
                  <InputSlot onPress={() => updateFormField('time', '')}>
                    <Icon as={X} className="mr-3 text-typography-400" />
                  </InputSlot>
                ) : (
                  <InputSlot onPress={() => setActiveTimePicker('time')}>
                    <Icon as={Clock} className="mr-3 text-typography-400" />
                  </InputSlot>
                )}
              </Input>
              {errors.time && <Text className="text-sm text-error-600">{errors.time}</Text>}
              {activeTimePicker === 'time' && (
                <DateTimePicker
                  value={parseTime(formData.time) || new Date()}
                  mode="time"
                  onChange={(event, date) => handleTimeChange('time', date, event)}
                />
              )}
            </VStack>

            {/* Notification Checkbox */}
            <VStack space="xs" className="mt-2">
              <Checkbox
                value={formData.notificationEnabled ? 'true' : 'false'}
                isChecked={formData.notificationEnabled}
                onChange={(checked: boolean) => updateNotificationField(checked)}
                size="md"
              >
                <CheckboxIndicator className="mr-2">
                  <CheckboxIcon as={Check} />
                </CheckboxIndicator>
                <CheckboxLabel>Enable task notification</CheckboxLabel>
              </Checkbox>
            </VStack>

            {/* General Error Display */}
            {errors.general && (
              <Text className="text-sm text-error-600 text-center">{errors.general}</Text>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button 
              variant="outline" 
              action="secondary" 
              onPress={handleClose}
              isDisabled={isSubmitting || isDeleting}
              className="flex-1"
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button 
              variant="solid" 
              action="negative" 
              onPress={handleDelete}
              isDisabled={isSubmitting || isDeleting}
              className="flex-1"
            >
              <ButtonText className="text-white">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </ButtonText>
            </Button>
            <Button 
              variant="solid" 
              action="positive" 
              onPress={handleSave}
              isDisabled={isSubmitting || isDeleting}
              className="flex-1"
            >
              <ButtonText className="text-typography-900">
                {isSubmitting ? 'Updating...' : 'Update'}
              </ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
