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
import { Input, InputField, InputIcon, InputSlot } from '~/components/ui/input';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, ShoppingBasket, CalendarDays, Weight } from 'lucide-react-native';
import { BulkGrowFlush } from '~/lib/growTypes';

interface FlushModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flush: BulkGrowFlush) => void;
  flush?: BulkGrowFlush | null;
}

export const FlushModal: React.FC<FlushModalProps> = ({ isOpen, onClose, onSave, flush }) => {
  const [formData, setFormData] = useState({
    harvest_date: null as Date | null,
    wet_yield_grams: '',
    dry_yield_grams: '',
    concentration_mg_per_gram: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeDatePicker, setActiveDatePicker] = useState<boolean>(false);

  const isEditing = !!flush;

  useEffect(() => {
    if (isOpen) {
      if (flush) {
        setFormData({
          harvest_date: flush.harvest_date ? new Date(flush.harvest_date) : null,
          wet_yield_grams: flush.wet_yield_grams?.toString() || '',
          dry_yield_grams: flush.dry_yield_grams?.toString() || '',
          concentration_mg_per_gram: flush.concentration_mg_per_gram?.toString() || '',
        });
      } else {
        setFormData({
          harvest_date: null,
          wet_yield_grams: '',
          dry_yield_grams: '',
          concentration_mg_per_gram: '',
        });
      }
      setErrors({});
      setActiveDatePicker(false);
    }
  }, [isOpen, flush]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Basic validation - at least one field should be filled
    if (
      !formData.harvest_date &&
      !formData.wet_yield_grams.trim() &&
      !formData.dry_yield_grams.trim() &&
      !formData.concentration_mg_per_gram.trim()
    ) {
      newErrors.general = 'Please fill in at least one field';
    }

    // Validate numeric fields
    if (formData.wet_yield_grams && isNaN(parseFloat(formData.wet_yield_grams))) {
      newErrors.wet_yield_grams = 'Must be a valid number';
    }

    if (formData.dry_yield_grams && isNaN(parseFloat(formData.dry_yield_grams))) {
      newErrors.dry_yield_grams = 'Must be a valid number';
    }

    if (
      formData.concentration_mg_per_gram &&
      isNaN(parseFloat(formData.concentration_mg_per_gram))
    ) {
      newErrors.concentration_mg_per_gram = 'Must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const flushData: BulkGrowFlush = {
      id: flush?.id || Date.now(),
      bulk_grow_id: flush?.bulk_grow_id || 0, // This will be set by the parent component
      harvest_date: formData.harvest_date?.toISOString().split('T')[0],
      wet_yield_grams: formData.wet_yield_grams.trim()
        ? parseFloat(formData.wet_yield_grams.trim())
        : undefined,
      dry_yield_grams: formData.dry_yield_grams.trim()
        ? parseFloat(formData.dry_yield_grams.trim())
        : undefined,
      concentration_mg_per_gram: formData.concentration_mg_per_gram.trim()
        ? parseFloat(formData.concentration_mg_per_gram.trim())
        : undefined,
    };

    onSave(flushData);
    onClose();
  };

  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setActiveDatePicker(false);
    if (date) {
      updateField('harvest_date', date);
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
                <Icon as={ShoppingBasket} className="text-primary-600" size="lg" />
                <Text className="text-lg font-semibold">
                  {isEditing ? 'Edit Flush' : 'Add Flush'}
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="md">
            {/* General Error */}
            {errors.general && <Text className="text-sm text-error-600">{errors.general}</Text>}

            {/* Harvest Date */}
            <VStack space="xs">
              <Text className="font-medium">Harvest Date</Text>
              <Input isReadOnly>
                <InputField
                  value={formData.harvest_date?.toDateString() || 'Select date'}
                  className={!formData.harvest_date ? 'text-typography-400' : ''}
                />
                <InputSlot onPress={() => setActiveDatePicker(true)}>
                  <InputIcon as={CalendarDays} className="mr-2" />
                </InputSlot>
              </Input>
              {activeDatePicker && (
                <DateTimePicker
                  value={formData.harvest_date || new Date()}
                  mode="date"
                  onChange={handleDateChange}
                />
              )}
            </VStack>

            {/* Wet Yield */}
            <VStack space="xs">
              <Text className="font-medium">Wet Yield (grams)</Text>
              <Input className={errors.wet_yield_grams ? 'border-error-500' : ''}>
                <InputField
                  placeholder="Enter wet weight in grams"
                  value={formData.wet_yield_grams}
                  onChangeText={(value) => updateField('wet_yield_grams', value)}
                  keyboardType="decimal-pad"
                />
                <InputIcon as={Weight} className="mr-2" />
              </Input>
              {errors.wet_yield_grams && (
                <Text className="text-sm text-error-600">{errors.wet_yield_grams}</Text>
              )}
            </VStack>

            {/* Dry Yield */}
            <VStack space="xs">
              <Text className="font-medium">Dry Yield (grams)</Text>
              <Input className={errors.dry_yield_grams ? 'border-error-500' : ''}>
                <InputField
                  placeholder="Enter dry weight in grams"
                  value={formData.dry_yield_grams}
                  onChangeText={(value) => updateField('dry_yield_grams', value)}
                  keyboardType="decimal-pad"
                />
                <InputIcon as={Weight} className="mr-2" />
              </Input>
              {errors.dry_yield_grams && (
                <Text className="text-sm text-error-600">{errors.dry_yield_grams}</Text>
              )}
            </VStack>

            {/* Concentration */}
            <VStack space="xs">
              <Text className="font-medium">Concentration (mg/gram)</Text>
              <Input className={errors.concentration_mg_per_gram ? 'border-error-500' : ''}>
                <InputField
                  placeholder="Enter concentration in mg/gram"
                  value={formData.concentration_mg_per_gram}
                  onChangeText={(value) => updateField('concentration_mg_per_gram', value)}
                  keyboardType="decimal-pad"
                />
              </Input>
              {errors.concentration_mg_per_gram && (
                <Text className="text-sm text-error-600">{errors.concentration_mg_per_gram}</Text>
              )}
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button variant="outline" action="secondary" onPress={onClose} className="flex-1">
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button variant="solid" action="primary" onPress={handleSave} className="flex-1">
              <ButtonText>{isEditing ? 'Update' : 'Add'} Flush</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
