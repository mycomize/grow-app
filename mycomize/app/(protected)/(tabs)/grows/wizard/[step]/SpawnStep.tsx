import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays, DollarSign, Weight, Wheat } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGrowWizard } from '~/lib/GrowWizardContext';

export const SpawnStep: React.FC = () => {
  const { spawn, setSpawn } = useGrowWizard();

  // Date picker state
  const [showInoculationDatePicker, setShowInoculationDatePicker] = useState(false);

  // Handle date change
  const onChangeInoculationDate = (event: any, selectedDate?: Date) => {
    setShowInoculationDatePicker(false);
    if (selectedDate) {
      setSpawn({ inoculationDate: selectedDate });
    }
  };

  return (
    <VStack space="md">
      <HStack className="items-center justify-between">
        <Text className="text-xl font-bold">Spawn</Text>
        <Icon as={Wheat} size="xl" className="text-typography-400" />
      </HStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Type</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="text"
            placeholder="Enter spawn type (e.g., Rye Grain)"
            value={spawn.type || ''}
            onChangeText={(value) => setSpawn({ type: value })}
            className="placeholder:text-typography-200"
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
            value={spawn.weightLbs ? spawn.weightLbs.toString() : ''}
            onChangeText={(value) => setSpawn({ weightLbs: parseFloat(value) || 0 })}
            className="placeholder:text-typography-200"
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
            value={spawn.cost ? spawn.cost.toString() : ''}
            onChangeText={(value) => setSpawn({ cost: parseFloat(value) || 0 })}
            className="placeholder:text-typography-200"
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
            value={spawn.vendor}
            onChangeText={(value) => setSpawn({ vendor: value })}
            className="placeholder:text-typography-200"
          />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Inoculation Date</Text>
        <HStack className="flex flex-row items-center justify-between">
          <Input className="mt-2 w-11/12" isDisabled={false} isInvalid={false} isReadOnly={false}>
            <InputField className={!spawn.inoculationDate ? 'text-typography-200' : ''}>
              {spawn.inoculationDate ? spawn.inoculationDate.toDateString() : 'Select date'}
            </InputField>
          </Input>
          <Pressable onPress={() => setShowInoculationDatePicker(true)}>
            <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
          </Pressable>
        </HStack>
        {showInoculationDatePicker && (
          <DateTimePicker
            value={spawn.inoculationDate || new Date()}
            mode="date"
            onChange={onChangeInoculationDate}
          />
        )}
      </VStack>
    </VStack>
  );
};
