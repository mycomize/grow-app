import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays, DollarSign, Droplets } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGrowWizard } from '~/lib/GrowWizardContext';

export const SyringeStep: React.FC = () => {
  const { syringe, setSyringe } = useGrowWizard();

  // Date picker states
  const [showCreatedAtPicker, setShowCreatedAtPicker] = useState(false);
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);

  // Handle date changes
  const onChangeCreatedAt = (event: any, selectedDate?: Date) => {
    setShowCreatedAtPicker(false);
    if (selectedDate) {
      setSyringe({ createdAt: selectedDate });
    }
  };

  const onChangeExpiration = (event: any, selectedDate?: Date) => {
    setShowExpirationPicker(false);
    if (selectedDate) {
      setSyringe({ expirationDate: selectedDate });
    }
  };

  return (
    <VStack space="md">
      <Text className="text-xl font-bold">Syringe Information</Text>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Vendor</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="text"
            placeholder="Enter vendor name"
            value={syringe.vendor}
            onChangeText={(value) => setSyringe({ vendor: value })}
          />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Species</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="text"
            placeholder="Enter species"
            value={syringe.species}
            onChangeText={(value) => setSyringe({ species: value })}
          />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Strain</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="text"
            placeholder="Enter strain"
            value={syringe.strain}
            onChangeText={(value) => setSyringe({ strain: value })}
          />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Volume (mL)</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="decimal"
            placeholder="Enter volume in mL"
            value={syringe.volumeMl ? syringe.volumeMl.toString() : ''}
            onChangeText={(value) => setSyringe({ volumeMl: parseFloat(value) || 0 })}
          />
          <InputIcon as={Droplets} size="xl" className="ml-auto mr-4" />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Cost</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="decimal"
            placeholder="Enter cost"
            value={syringe.cost ? syringe.cost.toString() : ''}
            onChangeText={(value) => setSyringe({ cost: parseFloat(value) || 0 })}
          />
          <InputIcon as={DollarSign} size="xl" className="ml-auto mr-4" />
        </Input>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Created Date</Text>
        <HStack className="flex flex-row items-center justify-between">
          <Input className="mt-2 w-11/12" isDisabled={false} isInvalid={false} isReadOnly={false}>
            <InputField>
              {syringe.createdAt ? syringe.createdAt.toDateString() : 'Select date'}
            </InputField>
          </Input>
          <Pressable onPress={() => setShowCreatedAtPicker(true)}>
            <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
          </Pressable>
        </HStack>
        {showCreatedAtPicker && (
          <DateTimePicker
            value={syringe.createdAt || new Date()}
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
              {syringe.expirationDate ? syringe.expirationDate.toDateString() : 'Select date'}
            </InputField>
          </Input>
          <Pressable onPress={() => setShowExpirationPicker(true)}>
            <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
          </Pressable>
        </HStack>
        {showExpirationPicker && (
          <DateTimePicker
            value={syringe.expirationDate || new Date()}
            mode="date"
            onChange={onChangeExpiration}
          />
        )}
      </VStack>
    </VStack>
  );
};
