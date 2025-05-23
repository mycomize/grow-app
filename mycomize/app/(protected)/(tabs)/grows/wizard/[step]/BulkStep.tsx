import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays, DollarSign, Weight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGrowWizard } from '~/lib/GrowWizardContext';

export const BulkStep: React.FC = () => {
  const { bulk, setBulk } = useGrowWizard();

  // Date picker states
  const [showCreatedAtPicker, setShowCreatedAtPicker] = useState(false);
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);

  // Handle date changes
  const onChangeCreatedAt = (event: any, selectedDate?: Date) => {
    setShowCreatedAtPicker(false);
    if (selectedDate) {
      setBulk({ createdAt: selectedDate });
    }
  };

  const onChangeExpiration = (event: any, selectedDate?: Date) => {
    setShowExpirationPicker(false);
    if (selectedDate) {
      setBulk({ expirationDate: selectedDate });
    }
  };

  return (
    <VStack space="md">
      <Text className="text-xl font-bold">Bulk Substrate Information</Text>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Type</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="text"
            placeholder="Enter substrate type (e.g., Coco Coir)"
            value={bulk.type || ''}
            onChangeText={(value) => setBulk({ type: value })}
          />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Weight (lbs)</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="decimal"
            placeholder="Enter weight in pounds"
            value={bulk.weightLbs ? bulk.weightLbs.toString() : ''}
            onChangeText={(value) => setBulk({ weightLbs: parseFloat(value) || 0 })}
          />
          <InputIcon as={Weight} size="xl" className="ml-auto mr-4" />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Cost</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="decimal"
            placeholder="Enter cost"
            value={bulk.cost ? bulk.cost.toString() : ''}
            onChangeText={(value) => setBulk({ cost: parseFloat(value) || 0 })}
          />
          <InputIcon as={DollarSign} size="xl" className="ml-auto mr-4" />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Vendor</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="text"
            placeholder="Enter vendor name"
            value={bulk.vendor}
            onChangeText={(value) => setBulk({ vendor: value })}
          />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Created Date</Text>
        <HStack className="flex flex-row items-center justify-between">
          <Input className="mt-2 w-11/12" isDisabled={false} isInvalid={false} isReadOnly={false}>
            <InputField>
              {bulk.createdAt ? bulk.createdAt.toDateString() : 'Select date'}
            </InputField>
          </Input>
          <Pressable onPress={() => setShowCreatedAtPicker(true)}>
            <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
          </Pressable>
        </HStack>
        {showCreatedAtPicker && (
          <DateTimePicker
            value={bulk.createdAt || new Date()}
            mode="date"
            onChange={onChangeCreatedAt}
          />
        )}
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Expiration Date</Text>
        <HStack className="flex flex-row items-center justify-between">
          <Input className="mt-2 w-11/12" isDisabled={false} isInvalid={false} isReadOnly={false}>
            <InputField>
              {bulk.expirationDate ? bulk.expirationDate.toDateString() : 'Select date'}
            </InputField>
          </Input>
          <Pressable onPress={() => setShowExpirationPicker(true)}>
            <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
          </Pressable>
        </HStack>
        {showExpirationPicker && (
          <DateTimePicker
            value={bulk.expirationDate || new Date()}
            mode="date"
            onChange={onChangeExpiration}
          />
        )}
      </VStack>
    </VStack>
  );
};
