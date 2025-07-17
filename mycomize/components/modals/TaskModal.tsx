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
import { Input, InputField } from '~/components/ui/input';
import { Menu, MenuItem, MenuItemLabel } from '~/components/ui/menu';
import { X, CheckSquare, ChevronDown } from 'lucide-react-native';
import { Task, generateId } from '~/lib/tekTypes';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  task?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, task }) => {
  const [formData, setFormData] = useState({
    action: '',
    repeatCount: '1',
    repeatUnit: 'day' as 'day' | 'week' | 'stage',
    days_after_stage_start: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!task;

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          action: task.action,
          repeatCount: task.repeatCount?.toString() || '1',
          repeatUnit: task.repeatUnit || 'day',
          days_after_stage_start: task.days_after_stage_start.toString(),
        });
      } else {
        // Default to 0 days for new tasks
        setFormData({
          action: '',
          repeatCount: '1',
          repeatUnit: 'day',
          days_after_stage_start: '0',
        });
      }
      setErrors({});
    }
  }, [isOpen, task]);

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

    if (!formData.days_after_stage_start.trim()) {
      newErrors.days_after_stage_start = 'Days after stage start is required';
    } else {
      const days = parseInt(formData.days_after_stage_start, 10);
      if (isNaN(days) || days < 0) {
        newErrors.days_after_stage_start = 'Must be a valid number of days (0 or greater)';
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
      days_after_stage_start: parseInt(formData.days_after_stage_start, 10),
    };

    onSave(taskData);
    onClose();
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <HStack className="items-center  gap-2">
            <Icon as={CheckSquare} className="text-primary-600" size="lg" />
            <Text className="text-lg font-semibold">{isEditing ? 'Edit Task' : 'Add Task'}</Text>
          </HStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="md">
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
                      <Button {...triggerProps} variant="outline" size="sm" className="flex-1">
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
                <Text className="text-sm">time{formData.repeatCount !== '1' ? 's' : ''} per</Text>
                <Menu
                  trigger={({ ...triggerProps }) => {
                    return (
                      <Button {...triggerProps} variant="outline" size="sm" className="flex-1">
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

            {/* Days After Stage Start */}
            <VStack space="xs">
              <Text className="font-medium">Start Day</Text>
              <Input className={errors.days_after_stage_start ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., 0, 14, 30"
                  value={formData.days_after_stage_start}
                  onChangeText={(value) => updateField('days_after_stage_start', value)}
                  keyboardType="numeric"
                />
              </Input>
              {errors.days_after_stage_start && (
                <Text className="text-sm text-error-600">{errors.days_after_stage_start}</Text>
              )}
              <Text className="text-xs text-typography-500">
                Days after beginning of the stage on which to begin the task
              </Text>
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button variant="outline" action="secondary" onPress={onClose} className="flex-1">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button variant="solid" action="primary" onPress={handleSave} className="flex-1">
              <ButtonText>{isEditing ? 'Update' : 'Add'} Task</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
