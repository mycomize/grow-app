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
import { X, Package, CalendarDays, DollarSign } from 'lucide-react-native';
import { Item, generateId } from '~/lib/tekTypes';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  item?: Item | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({ isOpen, onClose, onSave, item }) => {
  const [formData, setFormData] = useState({
    description: '',
    vendor: '',
    quantity: '',
    url: '',
    cost: '',
    created_date: '',
    expiration_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);

  const isEditing = !!item;

  const parseDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  const handleDateChange = (field: string, date?: Date) => {
    if (date) {
      updateField(field as keyof typeof formData, date.toISOString());
    }
    setActiveDatePicker(null);
  };

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setFormData({
          description: item.description,
          vendor: item.vendor,
          quantity: item.quantity,
          url: item.url,
          cost: item.cost || '',
          created_date: item.created_date || '',
          expiration_date: item.expiration_date || '',
        });
      } else {
        setFormData({
          description: '',
          vendor: '',
          quantity: '',
          url: '',
          cost: '',
          created_date: '',
          expiration_date: '',
        });
      }
      setErrors({});
      setActiveDatePicker(null);
    }
  }, [isOpen, item]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const itemData: Item = {
      id: item?.id || generateId(),
      description: formData.description.trim(),
      vendor: formData.vendor.trim(),
      quantity: formData.quantity.trim(),
      url: formData.url.trim(),
      cost: formData.cost.trim() || undefined,
      created_date: formData.created_date || undefined,
      expiration_date: formData.expiration_date || undefined,
    };

    onSave(itemData);
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
                <Icon as={Package} className="text-primary-600" size="lg" />
                <Text className="text-lg font-semibold">
                  {isEditing ? 'Edit Item' : 'Add Item'}
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="md">
            {/* Description */}
            <VStack space="xs">
              <Text className="font-medium">Description</Text>
              <Input className={errors.description ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., Brown rice flour, casing, syringe, etc."
                  value={formData.description}
                  onChangeText={(value) => updateField('description', value)}
                />
              </Input>
              {errors.description && (
                <Text className="text-sm text-error-600">{errors.description}</Text>
              )}
            </VStack>

            {/* Vendor */}
            <VStack space="xs">
              <Text className="font-medium">Vendor</Text>
              <Input>
                <InputField
                  placeholder="e.g., self, Midwest Grow Kits, etc."
                  value={formData.vendor}
                  onChangeText={(value) => updateField('vendor', value)}
                />
              </Input>
            </VStack>

            {/* Quantity */}
            <VStack space="xs">
              <Text className="font-medium">Amount</Text>
              <Input className={errors.quantity ? 'border-error-500' : ''}>
                <InputField
                  placeholder="e.g., 2 lbs, 10 mL, etc."
                  value={formData.quantity}
                  onChangeText={(value) => updateField('quantity', value)}
                />
              </Input>
              {errors.quantity && <Text className="text-sm text-error-600">{errors.quantity}</Text>}
            </VStack>

            {/* URL */}
            <VStack space="xs">
              <Text className="font-medium">URL</Text>
              <Input>
                <InputField
                  placeholder="https://..."
                  value={formData.url}
                  onChangeText={(value) => updateField('url', value)}
                  autoCapitalize="none"
                />
              </Input>
            </VStack>

            {/* Cost */}
            <VStack space="xs">
              <Text className="font-medium">Cost</Text>
              <Input>
                <InputField
                  placeholder="Enter cost"
                  value={formData.cost}
                  onChangeText={(value) => updateField('cost', value)}
                  keyboardType="decimal-pad"
                />
                <InputIcon as={DollarSign} className="mr-2" />
              </Input>
            </VStack>

            {/* Created/Acquired Date */}
            <VStack space="xs">
              <Text className="font-medium">Created/Acquired Date</Text>
              <Input isReadOnly>
                <InputField
                  value={
                    parseDate(formData.created_date)?.toDateString() ||
                    'Select date (if applicable)'
                  }
                  className={!formData.created_date ? 'text-typography-400' : ''}
                />
                {formData.created_date ? (
                  <InputSlot onPress={() => updateField('created_date', '')}>
                    <InputIcon as={X} className="mr-2" />
                  </InputSlot>
                ) : (
                  <InputSlot onPress={() => setActiveDatePicker('created_date')}>
                    <InputIcon as={CalendarDays} className="mr-2" />
                  </InputSlot>
                )}
              </Input>
              {activeDatePicker === 'created_date' && (
                <DateTimePicker
                  value={parseDate(formData.created_date) || new Date()}
                  mode="date"
                  onChange={(event, date) => handleDateChange('created_date', date)}
                />
              )}
            </VStack>

            {/* Expiration Date */}
            <VStack space="xs">
              <Text className="font-medium">Expiration Date</Text>
              <Input isReadOnly>
                <InputField
                  value={
                    parseDate(formData.expiration_date)?.toDateString() ||
                    'Select date (if applicable)'
                  }
                  className={!formData.expiration_date ? 'text-typography-400' : ''}
                />
                {formData.expiration_date ? (
                  <InputSlot onPress={() => updateField('expiration_date', '')}>
                    <InputIcon as={X} className="mr-2" />
                  </InputSlot>
                ) : (
                  <InputSlot onPress={() => setActiveDatePicker('expiration_date')}>
                    <InputIcon as={CalendarDays} className="mr-2" />
                  </InputSlot>
                )}
              </Input>
              {activeDatePicker === 'expiration_date' && (
                <DateTimePicker
                  value={parseDate(formData.expiration_date) || new Date()}
                  mode="date"
                  onChange={(event, date) => handleDateChange('expiration_date', date)}
                />
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
              <ButtonText>{isEditing ? 'Update' : 'Add'} Item</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
