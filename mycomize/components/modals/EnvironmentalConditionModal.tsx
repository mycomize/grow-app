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
import { Pressable } from '~/components/ui/pressable';
import { X, Thermometer, ChevronDown, Check } from 'lucide-react-native';
import {
  EnvironmentalCondition,
  generateId,
  ENVIRONMENTAL_CONDITION_TYPES,
  CONDITION_UNITS,
} from '~/lib/tekTypes';

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
    lower_bound: '',
    upper_bound: '',
    unit: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [tempSelectedType, setTempSelectedType] = useState('');
  const [tempSelectedUnit, setTempSelectedUnit] = useState('');

  const isEditing = !!condition;

  useEffect(() => {
    if (isOpen) {
      if (condition) {
        setFormData({
          name: condition.name,
          type: condition.type,
          lower_bound: condition.lower_bound.toString(),
          upper_bound: condition.upper_bound.toString(),
          unit: condition.unit,
        });
      } else {
        setFormData({
          name: '',
          type: '',
          lower_bound: '',
          upper_bound: '',
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

    if (!formData.type.trim()) {
      newErrors.type = 'Type is required';
    }

    if (!formData.lower_bound.trim()) {
      newErrors.lower_bound = 'Lower bound is required';
    } else if (isNaN(Number(formData.lower_bound))) {
      newErrors.lower_bound = 'Lower bound must be a number';
    }

    if (!formData.upper_bound.trim()) {
      newErrors.upper_bound = 'Upper bound is required';
    } else if (isNaN(Number(formData.upper_bound))) {
      newErrors.upper_bound = 'Upper bound must be a number';
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }

    // Check if lower bound is less than upper bound
    if (
      formData.lower_bound &&
      formData.upper_bound &&
      !isNaN(Number(formData.lower_bound)) &&
      !isNaN(Number(formData.upper_bound))
    ) {
      if (Number(formData.lower_bound) >= Number(formData.upper_bound)) {
        newErrors.upper_bound = 'Upper bound must be greater than lower bound';
      }
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
      lower_bound: Number(formData.lower_bound),
      upper_bound: Number(formData.upper_bound),
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

  // Type modal handlers
  const handleTypeConfirm = () => {
    updateField('type', tempSelectedType);
    setShowTypeModal(false);
  };

  // Unit modal handlers
  const handleUnitConfirm = () => {
    updateField('unit', tempSelectedUnit);
    setShowUnitModal(false);
  };

  // Get available units based on selected type
  const getAvailableUnits = () => {
    const typeKey = Object.keys(ENVIRONMENTAL_CONDITION_TYPES).find(
      (key) =>
        ENVIRONMENTAL_CONDITION_TYPES[key as keyof typeof ENVIRONMENTAL_CONDITION_TYPES] ===
        formData.type
    );
    if (typeKey && typeKey in CONDITION_UNITS) {
      return CONDITION_UNITS[typeKey as keyof typeof CONDITION_UNITS];
    }
    return [];
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
              <Text className="font-medium">Name</Text>
              <Input className={errors.name ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., Max incubator temperature"
                  value={formData.name}
                  onChangeText={(value) => updateField('name', value)}
                />
              </Input>
              {errors.name && <Text className="text-sm text-error-600">{errors.name}</Text>}
            </VStack>

            {/* Type */}
            <VStack space="xs">
              <Text className="font-medium">Type</Text>
              <Pressable
                onPress={() => {
                  setTempSelectedType(formData.type);
                  setShowTypeModal(true);
                }}
                className="flex-row items-center justify-between rounded-md border border-outline-300 px-3 py-2">
                <Text className="text-typography-900">{formData.type || 'Select type...'}</Text>
                <Icon as={ChevronDown} size="sm" className="text-typography-500" />
              </Pressable>
              {errors.type && <Text className="text-sm text-error-600">{errors.type}</Text>}
            </VStack>

            {/* Lower Bound */}
            <VStack space="xs">
              <Text className="font-medium">Lower Bound</Text>
              <Input className={errors.lower_bound ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., 68, 85, 1000"
                  value={formData.lower_bound}
                  onChangeText={(value) => updateField('lower_bound', value)}
                  keyboardType="numeric"
                />
              </Input>
              {errors.lower_bound && (
                <Text className="text-sm text-error-600">{errors.lower_bound}</Text>
              )}
            </VStack>

            {/* Upper Bound */}
            <VStack space="xs">
              <Text className="font-medium">Upper Bound</Text>
              <Input className={errors.upper_bound ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., 72, 90, 2000"
                  value={formData.upper_bound}
                  onChangeText={(value) => updateField('upper_bound', value)}
                  keyboardType="numeric"
                />
              </Input>
              {errors.upper_bound && (
                <Text className="text-sm text-error-600">{errors.upper_bound}</Text>
              )}
            </VStack>

            {/* Unit */}
            <VStack space="xs">
              <Text className="font-medium">Unit</Text>
              <Pressable
                onPress={() => {
                  setTempSelectedUnit(formData.unit);
                  setShowUnitModal(true);
                }}
                className="flex-row items-center justify-between rounded-md border border-outline-300 px-3 py-2">
                <Text className="text-typography-900">{formData.unit || 'Select unit...'}</Text>
                <Icon as={ChevronDown} size="sm" className="text-typography-500" />
              </Pressable>
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

      {/* Type Selection Modal */}
      <Modal isOpen={showTypeModal} onClose={() => setShowTypeModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-lg font-semibold">Select Type</Text>
            <ModalCloseButton onPress={() => setShowTypeModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose the environmental condition type:</Text>
              <VStack space="md">
                {Object.entries(ENVIRONMENTAL_CONDITION_TYPES).map(([key, value]) => (
                  <Pressable
                    key={key}
                    onPress={() => setTempSelectedType(value)}
                    className="flex-row items-center justify-between rounded-lg border border-outline-200 p-4">
                    <Text className="text-typography-900">{value}</Text>
                    {tempSelectedType === value && (
                      <Icon as={Check} className="text-success-600" size="sm" />
                    )}
                  </Pressable>
                ))}
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="sm" className="w-full justify-end">
              <Button variant="outline" onPress={() => setShowTypeModal(false)}>
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button action="positive" onPress={handleTypeConfirm}>
                <ButtonText className="text-white">Select Type</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Unit Selection Modal */}
      <Modal isOpen={showUnitModal} onClose={() => setShowUnitModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-lg font-semibold">Select Unit</Text>
            <ModalCloseButton onPress={() => setShowUnitModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">
                Choose the unit for {formData.type || 'this condition'}:
              </Text>
              <VStack space="md">
                {getAvailableUnits().map((unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => setTempSelectedUnit(unit)}
                    className="flex-row items-center justify-between rounded-lg border border-outline-200 p-4">
                    <Text className="text-typography-900">{unit}</Text>
                    {tempSelectedUnit === unit && (
                      <Icon as={Check} className="text-success-600" size="sm" />
                    )}
                  </Pressable>
                ))}
              </VStack>
              {getAvailableUnits().length === 0 && (
                <Text className="text-center text-typography-500">
                  Please select a type first to see available units.
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="sm" className="w-full justify-end">
              <Button variant="outline" onPress={() => setShowUnitModal(false)}>
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                action="positive"
                onPress={handleUnitConfirm}
                isDisabled={getAvailableUnits().length === 0}>
                <ButtonText className="text-white">Select Unit</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Modal>
  );
};
