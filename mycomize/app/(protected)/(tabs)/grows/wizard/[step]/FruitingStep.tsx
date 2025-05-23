import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MushroomIcon from '~/components/icons/MushroomIcon';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
} from '~/components/ui/select';
import { ChevronDown } from 'lucide-react-native';
import { useGrowWizard } from '~/lib/GrowWizardContext';

export const FruitingStep: React.FC = () => {
  const { fruiting, setFruiting } = useGrowWizard();

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showPinDatePicker, setShowPinDatePicker] = useState(false);

  // Handle date changes
  const onChangeStartDate = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFruiting({ startDate: selectedDate });
    }
  };

  const onChangePinDate = (event: any, selectedDate?: Date) => {
    setShowPinDatePicker(false);
    if (selectedDate) {
      setFruiting({ pinDate: selectedDate });
    }
  };

  // Frequency options
  const frequencyOptions = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Every other day',
    'As needed',
    'Never',
  ];

  return (
    <VStack space="md">
      <HStack className="items-center justify-between">
        <Text className="text-xl font-bold">Fruiting</Text>
        <MushroomIcon height={24} width={24} color="#9ca3af" strokeWidth={2} />
      </HStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Fruiting Start Date</Text>
        <HStack className="flex flex-row items-center justify-between">
          <Input className="mt-2 w-11/12" isDisabled={false} isInvalid={false} isReadOnly={false}>
            <InputField className={!fruiting.startDate ? 'text-typography-200' : ''}>
              {fruiting.startDate ? fruiting.startDate.toDateString() : 'Select date'}
            </InputField>
          </Input>
          <Pressable onPress={() => setShowStartDatePicker(true)}>
            <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
          </Pressable>
        </HStack>
        {showStartDatePicker && (
          <DateTimePicker
            value={fruiting.startDate || new Date()}
            mode="date"
            onChange={onChangeStartDate}
          />
        )}
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Pin Date</Text>
        <HStack className="flex flex-row items-center justify-between">
          <Input className="mt-2 w-11/12" isDisabled={false} isInvalid={false} isReadOnly={false}>
            <InputField className={!fruiting.pinDate ? 'text-typography-200' : ''}>
              {fruiting.pinDate ? fruiting.pinDate.toDateString() : 'Select date'}
            </InputField>
          </Input>
          <Pressable onPress={() => setShowPinDatePicker(true)}>
            <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
          </Pressable>
        </HStack>
        {showPinDatePicker && (
          <DateTimePicker
            value={fruiting.pinDate || new Date()}
            mode="date"
            onChange={onChangePinDate}
          />
        )}
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Mist Frequency</Text>
        <Select
          selectedValue={fruiting.mistFrequency}
          onValueChange={(value) => setFruiting({ mistFrequency: value })}>
          <SelectTrigger variant="underlined" size="xl">
            <SelectInput
              className="ml-3 placeholder:text-typography-200"
              value={fruiting.mistFrequency}
              placeholder="Select frequency"
            />
            <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              <SelectDragIndicatorWrapper>
                <SelectDragIndicator />
              </SelectDragIndicatorWrapper>
              {frequencyOptions.map((option) => (
                <SelectItem key={option} label={option} value={option} />
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      </VStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Fan Frequency</Text>
        <Select
          selectedValue={fruiting.fanFrequency}
          onValueChange={(value) => setFruiting({ fanFrequency: value })}>
          <SelectTrigger variant="underlined" size="xl">
            <SelectInput
              className="ml-3 placeholder:text-typography-200"
              value={fruiting.fanFrequency}
              placeholder="Select frequency"
            />
            <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              <SelectDragIndicatorWrapper>
                <SelectDragIndicator />
              </SelectDragIndicatorWrapper>
              {frequencyOptions.map((option) => (
                <SelectItem key={option} label={option} value={option} />
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      </VStack>
    </VStack>
  );
};
