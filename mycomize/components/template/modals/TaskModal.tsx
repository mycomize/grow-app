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
import { Input, InputField } from '~/components/ui/input';
import { X, CheckSquare } from 'lucide-react-native';
import { Task, generateId } from '~/lib/templateTypes';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  task?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, task }) => {
  const [formData, setFormData] = useState({
    action: '',
    frequency: '',
    daysAfterStageStart: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!task;

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          action: task.action,
          frequency: task.frequency,
          daysAfterStageStart: task.daysAfterStageStart.toString(),
        });
      } else {
        // Default to 0 days for new tasks
        setFormData({
          action: '',
          frequency: '',
          daysAfterStageStart: '0',
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

    if (!formData.frequency.trim()) {
      newErrors.frequency = 'Frequency is required';
    }

    if (!formData.daysAfterStageStart.trim()) {
      newErrors.daysAfterStageStart = 'Days after stage start is required';
    } else {
      const days = parseInt(formData.daysAfterStageStart, 10);
      if (isNaN(days) || days < 0) {
        newErrors.daysAfterStageStart = 'Must be a valid number of days (0 or greater)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const taskData: Task = {
      id: task?.id || generateId(),
      action: formData.action.trim(),
      frequency: formData.frequency.trim(),
      daysAfterStageStart: parseInt(formData.daysAfterStageStart, 10),
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
              <Text className="font-medium">Action *</Text>
              <Input className={errors.action ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., Break and shake, Mist substrate, Check for pins"
                  value={formData.action}
                  onChangeText={(value) => updateField('action', value)}
                />
              </Input>
              {errors.action && <Text className="text-sm text-error-600">{errors.action}</Text>}
            </VStack>

            {/* Frequency */}
            <VStack space="xs">
              <Text className="font-medium">Frequency *</Text>
              <Input className={errors.frequency ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., Once, Daily for 7 days, Every 3 days, As needed"
                  value={formData.frequency}
                  onChangeText={(value) => updateField('frequency', value)}
                />
              </Input>
              {errors.frequency && (
                <Text className="text-sm text-error-600">{errors.frequency}</Text>
              )}
            </VStack>

            {/* Days After Stage Start */}
            <VStack space="xs">
              <Text className="font-medium">Start Day</Text>
              <Input className={errors.daysAfterStageStart ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., 0, 14, 30"
                  value={formData.daysAfterStageStart}
                  onChangeText={(value) => updateField('daysAfterStageStart', value)}
                  keyboardType="numeric"
                />
              </Input>
              {errors.daysAfterStageStart && (
                <Text className="text-sm text-error-600">{errors.daysAfterStageStart}</Text>
              )}
              <Text className="text-xs text-typography-500">
                Days after beginning of stage on which to being the task
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
