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
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from '~/components/ui/checkbox';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, CheckSquare, ChevronDown, CalendarDays, Clock, Check } from 'lucide-react-native';
import { Task, TaskContext, generateId } from '~/lib/types/tekTypes';
import { createCalendarTaskFromTemplate } from '~/lib/types/calendarTypes';
import { useGrowStore } from '~/lib/stores/growStore';
import { useTeksStore } from '~/lib/stores/teksStore';
import { useCalendarStore } from '~/lib/stores/calendarStore';
import { useAuthEncryption } from '~/lib/stores/authEncryptionStore';
import { generateTaskSchedule, calculateTotalTasks, generateScheduleDescription, TaskScheduleParams } from '~/lib/utils/frequencyCalculator';

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
  });
  
  const [calendarData, setCalendarData] = useState({
    addToCalendar: false,
    start_date: '',
    start_time: '',
    end_date: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);

  // Store hooks
  const growStore = useGrowStore();
  const teksStore = useTeksStore();
  const calendarStore = useCalendarStore();
  const { token } = useAuthEncryption();
  const currentGrow = growStore.currentGrow;

  const isEditing = !!task;
  const MAX_REPEAT_COUNT = 7;

  // Date utility functions
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
    return undefined;
  };

  // Date/time picker handlers
  const handleDateChange = (field: string, date?: Date, event?: any) => {
    if (event?.type === 'dismissed') {
      setActiveDatePicker(null);
      return;
    }

    if (date) {
      const formattedDate = formatDateForAPI(date);
      if (formattedDate && (field === 'start_date' || field === 'end_date')) {
        updateCalendarField(field as keyof typeof calendarData, formattedDate);
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
      if (formattedTime && field === 'start_time') {
        updateCalendarField(field as keyof typeof calendarData, formattedTime);
      }
    }
    setActiveTimePicker(null);
  };

  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Editing existing task
        setFormData({
          action: task.action,
          repeatCount: task.repeatCount?.toString() || '1',
          repeatUnit: task.repeatUnit || 'day',
        });
        
        // Calendar data is not part of Task templates
        setCalendarData({
          addToCalendar: false,
          start_date: '',
          start_time: '',
          end_date: '',
        });
      } else {
        // Creating new task
        const stageStartDate = getStageStartDate();
        setFormData({
          action: '',
          repeatCount: '1',
          repeatUnit: 'day',
        });
        
        setCalendarData({
          addToCalendar: false,
          start_date: stageStartDate || '',
          start_time: '',
          end_date: '',
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
      if (isNaN(count) || count < 1 || count > MAX_REPEAT_COUNT) {
        newErrors.repeatCount = `Must be a number between 1 and ${MAX_REPEAT_COUNT}`;
      }
    }

    // Validate calendar fields if checkbox is checked
    if (calendarData.addToCalendar) {
      if (!calendarData.start_date) {
        newErrors.start_date = 'Start date is required when adding to calendar';
      }
      if (!calendarData.start_time) {
        newErrors.start_time = 'Start time is required when adding to calendar';
      }
      if (!calendarData.end_date) {
        newErrors.end_date = 'End date is required when adding to calendar';
      }
      
      // Validate date range
      if (calendarData.start_date && calendarData.end_date) {
        const startDate = parseDate(calendarData.start_date);
        const endDate = parseDate(calendarData.end_date);
        if (startDate && endDate && startDate > endDate) {
          newErrors.end_date = 'End date must be after or equal to start date';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to generate frequency string for backward compatibility
  const generateFrequencyString = (count: number, unit: string): string => {
    const unitText = unit === 'day' ? 'day' : unit === 'week' ? 'week' : 'stage';

    if (count === 1) {
      return `Once per ${unitText}`;
    } else {
      return `${count} times per ${unitText}`;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const repeatCount = parseInt(formData.repeatCount, 10);
    const frequencyString = generateFrequencyString(repeatCount, formData.repeatUnit);

    // Create Task template (no date/time/status fields)
    const taskData: Task = {
      id: task?.id || generateId(),
      action: formData.action.trim(),
      frequency: frequencyString,
      repeatCount: repeatCount,
      repeatUnit: formData.repeatUnit,
    };

    // Save task template to appropriate store
    if (context === 'grow') {
      if (isEditing && task) {
        growStore.updateTaskInStage(stageKey, task.id, taskData);
      } else {
        growStore.addTaskToStage(stageKey, taskData);
      }

      // Create CalendarTasks if requested (for grow context)
      if (calendarData.addToCalendar && calendarData.start_date && calendarData.start_time && calendarData.end_date) {
        console.log(`[TaskModal] Creating calendar tasks for ${isEditing ? 'updated' : 'new'} task: ${taskData.action}`);
        
        const scheduleParams: TaskScheduleParams = {
          repeatCount: repeatCount,
          repeatUnit: formData.repeatUnit,
          startDate: calendarData.start_date,
          endDate: calendarData.end_date,
          startTime: calendarData.start_time,
        };

        const schedule = generateTaskSchedule(scheduleParams);
        console.log(`[TaskModal] Generated ${schedule.length} calendar task instances`);

        if (currentGrow?.id && token) {
          // Existing grow - create calendar tasks immediately to backend AND zustand store
          try {
            console.log(`[TaskModal] Saving calendar tasks immediately for existing grow ${currentGrow.id}`);
            const createdTasks = await calendarStore.createCalendarTasksFromTask(
              token,
              taskData,
              currentGrow.id,
              stageKey,
              schedule
            );
            console.log(`[TaskModal] Successfully created ${createdTasks.length} calendar tasks for existing grow`);
          } catch (error) {
            console.error('[TaskModal] Failed to create calendar tasks for existing grow:', error);
            // Note: We don't block the task creation if calendar task creation fails
            // The task template is still saved successfully
          }
        } else {
          // New grow (no ID yet) - save calendar tasks to zustand store with NEW_GROW_ID placeholder
          try {
            console.log(`[TaskModal] Saving calendar tasks to zustand store for new grow with NEW_GROW_ID placeholder`);
            
            for (const { date, time } of schedule) {
              calendarStore.createCalendarTaskForNewGrow({
                parent_task_id: taskData.id,
                action: taskData.action,
                stage_key: stageKey,
                date,
                time,
                status: 'upcoming',
              });
            }
            
            console.log(`[TaskModal] Successfully added ${schedule.length} calendar tasks with NEW_GROW_ID placeholder`);
          } catch (error) {
            console.error('[TaskModal] Failed to create calendar tasks for new grow:', error);
            // Note: We don't block the task creation if calendar task creation fails
          }
        }
      }
    } else {
      // For teks, save task template
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

  const updateCalendarField = (field: keyof typeof calendarData, value: string | boolean) => {
    setCalendarData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

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

            {/* Frequency */}
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

            {/* Calendar Checkbox - Only show for grow context */}
            {context === 'grow' && (
              <VStack space="xs">
                <Checkbox
                  value={calendarData.addToCalendar ? 'true' : 'false'}
                  isChecked={calendarData.addToCalendar}
                  onChange={(checked: boolean) => updateCalendarField('addToCalendar', checked)}
                  size="md"
                >
                  <CheckboxIndicator className="mr-2">
                    <CheckboxIcon as={Check} />
                  </CheckboxIndicator>
                  <CheckboxLabel>Add tasks to grow calendar</CheckboxLabel>
                </Checkbox>
              </VStack>
            )}

            {/* Date/Time Fields - Show below checkbox when checked */}
            {context === 'grow' && calendarData.addToCalendar && (
              <>
                {/* Start Date */}
                <VStack space="xs">
                  <Text className="font-medium">Start Date</Text>
                  <Input isReadOnly className={errors.start_date ? 'border-error-500' : ''}>
                    <InputField
                      value={parseDate(calendarData.start_date)?.toDateString() || 'Select date'}
                      className={!calendarData.start_date ? 'text-typography-400' : ''}
                    />
                    {calendarData.start_date ? (
                      <InputSlot onPress={() => updateCalendarField('start_date', '')}>
                        <Icon as={X} className="mr-3 text-typography-400" />
                      </InputSlot>
                    ) : (
                      <InputSlot onPress={() => setActiveDatePicker('start_date')}>
                        <Icon as={CalendarDays} className="mr-3 text-typography-400" />
                      </InputSlot>
                    )}
                  </Input>
                  {errors.start_date && <Text className="text-sm text-error-600">{errors.start_date}</Text>}
                  {activeDatePicker === 'start_date' && (
                    <DateTimePicker
                      value={parseDate(calendarData.start_date) || new Date()}
                      mode="date"
                      onChange={(event, date) => handleDateChange('start_date', date, event)}
                    />
                  )}
                </VStack>

                {/* Start Time */}
                <VStack space="xs">
                  <Text className="font-medium">Start Time</Text>
                  <Input isReadOnly className={errors.start_time ? 'border-error-500' : ''}>
                    <InputField
                      value={parseTime(calendarData.start_time)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Select time'}
                      className={!calendarData.start_time ? 'text-typography-400' : ''}
                    />
                    {calendarData.start_time ? (
                      <InputSlot onPress={() => updateCalendarField('start_time', '')}>
                        <Icon as={X} className="mr-3 text-typography-400" />
                      </InputSlot>
                    ) : (
                      <InputSlot onPress={() => setActiveTimePicker('start_time')}>
                        <Icon as={Clock} className="mr-3 text-typography-400" />
                      </InputSlot>
                    )}
                  </Input>
                  {errors.start_time && <Text className="text-sm text-error-600">{errors.start_time}</Text>}
                  {activeTimePicker === 'start_time' && (
                    <DateTimePicker
                      value={parseTime(calendarData.start_time) || new Date()}
                      mode="time"
                      onChange={(event, date) => handleTimeChange('start_time', date, event)}
                    />
                  )}
                </VStack>

                {/* End Date - Required */}
                <VStack space="xs">
                  <Text className="font-medium">End Date</Text>
                  <Input isReadOnly className={errors.end_date ? 'border-error-500' : ''}>
                    <InputField
                      value={parseDate(calendarData.end_date)?.toDateString() || 'Select date'}
                      className={!calendarData.end_date ? 'text-typography-400' : ''}
                    />
                    {calendarData.end_date ? (
                      <InputSlot onPress={() => updateCalendarField('end_date', '')}>
                        <Icon as={X} className="mr-3 text-typography-400" />
                      </InputSlot>
                    ) : (
                      <InputSlot onPress={() => setActiveDatePicker('end_date')}>
                        <Icon as={CalendarDays} className="mr-3 text-typography-400" />
                      </InputSlot>
                    )}
                  </Input>
                  {errors.end_date && <Text className="text-sm text-error-600">{errors.end_date}</Text>}
                  {activeDatePicker === 'end_date' && (
                    <DateTimePicker
                      value={parseDate(calendarData.end_date) || new Date()}
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
            <Button variant="outline" action="secondary" onPress={onClose}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button variant="solid" action="positive" onPress={handleSave}>
              <ButtonText className="text-typography-900">Save</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
