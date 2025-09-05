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
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import { Menu, MenuItem, MenuItemLabel } from '~/components/ui/menu';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
} from '~/components/ui/select';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, CheckSquare, ChevronDown, CalendarDays, Clock } from 'lucide-react-native';
import { Task, TaskContext, generateId } from '~/lib/types/tekTypes';
import { useCurrentGrow, useGrowStore } from '~/lib/stores/growStore';
import { useCurrentTek, useTeksStore } from '~/lib/stores/teksStore';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  context: TaskContext; // Determines field visibility
  stageKey: string; // The stage key for the task
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  context,
  stageKey,
}) => {
  const [formData, setFormData] = useState({
    action: '',
    repeatCount: '1',
    repeatUnit: 'day' as 'day' | 'week' | 'stage',
    days_after_stage_start: '',
    start_date: '',
    start_time: '',
    end_date: '',
    status: 'pending' as 'pending' | 'completed',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);

  // Store hooks
  const growStore = useGrowStore();
  const teksStore = useTeksStore();

  const isEditing = !!task;

  // Date utility functions (following the established pattern)
  const parseDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  };

  const formatDateForAPI = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  // Get stage start date for context
  const getStageStartDate = (): string | undefined => {
    if (context === 'grow') {
      return growStore.getStageStartDate(stageKey);
    }
    return undefined; // Teks don't have stage start dates
  };

  // Date/time picker handlers (following established pattern)
  const handleDateChange = (field: string, date?: Date, event?: any) => {
    if (event?.type === 'dismissed') {
      setActiveDatePicker(null);
      return;
    }

    if (date) {
      const formattedDate = formatDateForAPI(date);
      if (formattedDate) {
        updateFieldTypeSafe(field, formattedDate);
      }
    }
    setActiveDatePicker(null);
  };

  const handleTimeChange = (field: string, date?: Date, event?: any) => {
    if (event?.type === 'dismissed') {
      setActiveTimePicker(null);
      return;
    }

    if (date) {
      const formattedTime = formatTimeForAPI(date);
      if (formattedTime) {
        updateFieldTypeSafe(field, formattedTime);
      }
    }
    setActiveTimePicker(null);
  };

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          action: task.action,
          repeatCount: task.repeatCount?.toString() || '1',
          repeatUnit: task.repeatUnit || 'day',
          days_after_stage_start: task.days_after_stage_start.toString(),
          start_date: task.start_date || '',
          start_time: task.start_time || '',
          end_date: task.end_date || '',
          status: task.status || 'pending',
        });
      } else {
        // For new tasks, initialize start_date from stage start date if available
        const stageStartDate = getStageStartDate();
        setFormData({
          action: '',
          repeatCount: '1',
          repeatUnit: 'day',
          days_after_stage_start: '0',
          start_date: stageStartDate || '',
          start_time: '',
          end_date: '',
          status: 'pending',
        });
      }
      setErrors({});
      setActiveDatePicker(null);
      setActiveTimePicker(null);
    }
  }, [isOpen, task, stageKey, context]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.action.trim()) {
      newErrors.action = 'Action is required';
    }

    if (!formData.repeatCount.trim()) {
      newErrors.repeatCount = 'Repeat count is required';
    } else {
      const count = parseInt(formData.repeatCount, 10);
      if (isNaN(count) || count < 1 || count > 7) {
        newErrors.repeatCount = 'Must be a number between 1 and 7';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to generate frequency string for backward compatibility
  const generateFrequencyString = (count: number, unit: string): string => {
    const unitText = unit === 'day' ? 'day' : unit === 'week' ? 'week' : 'stage';
    const unitPlural = unit === 'day' ? 'days' : unit === 'week' ? 'weeks' : 'stages';

    if (count === 1) {
      return `Once per ${unitText}`;
    } else {
      return `${count} times per ${unitText}`;
    }
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const repeatCount = parseInt(formData.repeatCount, 10);
    const frequencyString = generateFrequencyString(repeatCount, formData.repeatUnit);

    const taskData: Task = {
      id: task?.id || generateId(),
      action: formData.action.trim(),
      frequency: frequencyString,
      repeatCount: repeatCount,
      repeatUnit: formData.repeatUnit,
      days_after_stage_start: parseInt(formData.days_after_stage_start, 10) || 0,
      start_date: formData.start_date || undefined,
      start_time: formData.start_time || undefined,
      end_date: formData.end_date || undefined,
      status: 'pending', // Always default to pending, no UI for this
    };

    // Use appropriate store function based on context
    if (context === 'grow') {
      if (isEditing && task) {
        growStore.updateTaskInStage(stageKey, task.id, taskData);
      } else {
        growStore.addTaskToStage(stageKey, taskData);
      }
    } else {
      if (isEditing && task) {
        teksStore.updateTaskInStage(stageKey, task.id, taskData);
      } else {
        teksStore.addTaskToStage(stageKey, taskData);
      }
    }

    onClose();
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const updateFieldTypeSafe = (field: string, value: string) => {
    if (field in formData) {
      updateField(field as keyof typeof formData, value);
    }
  };


  // Determine field visibility based on context
  const shouldShowDateTimeFields = context === 'grow';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <HStack className="items-center gap-2">
            <Icon as={CheckSquare} className="text-primary-600" size="lg" />
            <Text className="text-lg font-semibold flex-1">{isEditing ? 'Edit Task' : 'Add Task'}</Text>
          </HStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="2xl" className="mt-3">
            {/* Action */}
            <VStack space="xs">
              <Text className="font-medium">Action</Text>
              <Input className={errors.action ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., Break and shake, Mist substrate"
                  value={formData.action}
                  onChangeText={(value) => updateField('action', value)}
                />
              </Input>
              {errors.action && <Text className="text-sm text-error-600">{errors.action}</Text>}
            </VStack>

            {/* Repeat Frequency */}
            <VStack space="xs">
              <Text className="font-medium">Frequency</Text>
              <HStack space="sm" className="items-center">
                <Text className="text-sm">Repeat</Text>
                <Menu
                  trigger={({ ...triggerProps }) => {
                    return (
                      <Button {...triggerProps} variant="outline" size="sm" className="mx-2">
                        <ButtonText>{formData.repeatCount}</ButtonText>
                        <ButtonIcon as={ChevronDown} className="ml-2" />
                      </Button>
                    );
                  }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <MenuItem key={num} onPress={() => updateField('repeatCount', num.toString())}>
                      <MenuItemLabel>{num.toString()}</MenuItemLabel>
                    </MenuItem>
                  ))}
                </Menu>
                <Text className="text-sm"> time{formData.repeatCount !== '1' ? 's' : ''} per</Text>
                <Menu
                  trigger={({ ...triggerProps }) => {
                    return (
                      <Button {...triggerProps} variant="outline" size="sm" className="ml-2">
                        <ButtonText>{formData.repeatUnit}</ButtonText>
                        <ButtonIcon as={ChevronDown} className="ml-2" />
                      </Button>
                    );
                  }}>
                  <MenuItem onPress={() => updateField('repeatUnit', 'day')}>
                    <MenuItemLabel>day</MenuItemLabel>
                  </MenuItem>
                  <MenuItem onPress={() => updateField('repeatUnit', 'week')}>
                    <MenuItemLabel>week</MenuItemLabel>
                  </MenuItem>
                  <MenuItem onPress={() => updateField('repeatUnit', 'stage')}>
                    <MenuItemLabel>stage</MenuItemLabel>
                  </MenuItem>
                </Menu>
              </HStack>
              {errors.repeatCount && (
                <Text className="text-sm text-error-600">{errors.repeatCount}</Text>
              )}
            </VStack>


            {/* Date/Time Fields - Only show for Grow context */}
            {shouldShowDateTimeFields && (
              <>
                {/* Start Date */}
                <VStack space="xs">
                  <Text className="font-medium">Start Date</Text>
                  <Input isReadOnly>
                    <InputField
                      value={parseDate(formData.start_date)?.toDateString() || 'Select date'}
                      className={!formData.start_date ? 'text-typography-400' : ''}
                    />
                    {formData.start_date ? (
                      <InputSlot onPress={() => updateField('start_date', '')}>
                        <Icon as={X} className="mr-3 text-typography-400" />
                      </InputSlot>
                    ) : (
                      <InputSlot onPress={() => setActiveDatePicker('start_date')}>
                        <Icon as={CalendarDays} className="mr-3 text-typography-400" />
                      </InputSlot>
                    )}
                  </Input>
                  {activeDatePicker === 'start_date' && (
                    <DateTimePicker
                      value={parseDate(formData.start_date) || new Date()}
                      mode="date"
                      onChange={(event, date) => handleDateChange('start_date', date, event)}
                    />
                  )}
                </VStack>

                {/* Start Time */}
                <VStack space="xs">
                  <Text className="font-medium">Start Time</Text>
                  <Input isReadOnly>
                    <InputField
                      value={parseTime(formData.start_time)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Select time'}
                      className={!formData.start_time ? 'text-typography-400' : ''}
                    />
                    {formData.start_time ? (
                      <InputSlot onPress={() => updateField('start_time', '')}>
                        <Icon as={X} className="mr-3 text-typography-400" />
                      </InputSlot>
                    ) : (
                      <InputSlot onPress={() => setActiveTimePicker('start_time')}>
                        <Icon as={Clock} className="mr-3 text-typography-400" />
                      </InputSlot>
                    )}
                  </Input>
                  {activeTimePicker === 'start_time' && (
                    <DateTimePicker
                      value={parseTime(formData.start_time) || new Date()}
                      mode="time"
                      onChange={(event, date) => handleTimeChange('start_time', date, event)}
                    />
                  )}
                </VStack>

                {/* End Date */}
                <VStack space="xs">
                  <Text className="font-medium">End Date</Text>
                  <Input isReadOnly>
                    <InputField
                      value={parseDate(formData.end_date)?.toDateString() || 'Select date'}
                      className={!formData.end_date ? 'text-typography-400' : ''}
                    />
                    {formData.end_date ? (
                      <InputSlot onPress={() => updateField('end_date', '')}>
                        <Icon as={X} className="mr-3 text-typography-400" />
                      </InputSlot>
                    ) : (
                      <InputSlot onPress={() => setActiveDatePicker('end_date')}>
                        <Icon as={CalendarDays} className="mr-3 text-typography-400" />
                      </InputSlot>
                    )}
                  </Input>
                  {activeDatePicker === 'end_date' && (
                    <DateTimePicker
                      value={parseDate(formData.end_date) || new Date()}
                      mode="date"
                      onChange={(event, date) => handleDateChange('end_date', date, event)}
                    />
                  )}
                </VStack>
              </>
            )}

          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full justify-around">
            <Button variant="outline" action="secondary" onPress={onClose} className="">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button variant="solid" action="positive" onPress={handleSave} className="">
              <ButtonText className="text-typography-900">Save</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
