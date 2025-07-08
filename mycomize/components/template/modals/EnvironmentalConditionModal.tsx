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
import { X, Thermometer } from 'lucide-react-native';
import { EnvironmentalCondition, generateId } from '~/lib/templateTypes';

interface EnvironmentalConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (condition: EnvironmentalCondition) => void;
  condition?: EnvironmentalCondition | null;
}

export const EnvironmentalConditionModal: React.FC<EnvironmentalConditionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  condition,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    value: '',
    unit: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!condition;

  useEffect(() => {
    if (isOpen) {
      if (condition) {
        setFormData({
          name: condition.name,
          type: condition.type,
          value: condition.value,
          unit: condition.unit,
        });
      } else {
        setFormData({
          name: '',
          type: '',
          value: '',
          unit: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, condition]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.value.trim()) {
      newErrors.value = 'Value is required';
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const conditionData: EnvironmentalCondition = {
      id: condition?.id || generateId(),
      name: formData.name.trim(),
      type: formData.type.trim(),
      value: formData.value.trim(),
      unit: formData.unit.trim(),
    };

    onSave(conditionData);
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
          <VStack space="sm">
            <HStack className="items-center justify-between">
              <HStack className="items-center" space="sm">
                <Icon as={Thermometer} className="text-primary-600" size="lg" />
                <Text className="text-lg font-semibold">
                  {isEditing ? 'Edit Environmental Condition' : 'Add Environmental Condition'}
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="md">
            {/* Name */}
            <VStack space="xs">
              <Text className="font-medium">Name *</Text>
              <Input className={errors.name ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., Temperature, Humidity, CO2 Level"
                  value={formData.name}
                  onChangeText={(value) => updateField('name', value)}
                />
              </Input>
              {errors.name && <Text className="text-sm text-error-600">{errors.name}</Text>}
            </VStack>

            {/* Type */}
            <VStack space="xs">
              <Text className="font-medium">Type</Text>
              <Input>
                <InputField
                  placeholder="e.g., temperature, humidity, co2"
                  value={formData.type}
                  onChangeText={(value) => updateField('type', value)}
                />
              </Input>
            </VStack>

            {/* Value */}
            <VStack space="xs">
              <Text className="font-medium">Value *</Text>
              <Input className={errors.value ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., 68-72, 85-90, >1000"
                  value={formData.value}
                  onChangeText={(value) => updateField('value', value)}
                />
              </Input>
              {errors.value && <Text className="text-sm text-error-600">{errors.value}</Text>}
            </VStack>

            {/* Unit */}
            <VStack space="xs">
              <Text className="font-medium">Unit *</Text>
              <Input className={errors.unit ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., °F, %, ppm"
                  value={formData.unit}
                  onChangeText={(value) => updateField('unit', value)}
                />
              </Input>
              {errors.unit && <Text className="text-sm text-error-600">{errors.unit}</Text>}
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button variant="outline" action="secondary" onPress={onClose} className="flex-1">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button variant="solid" action="primary" onPress={handleSave} className="flex-1">
              <ButtonText>{isEditing ? 'Update' : 'Add'} Condition</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
