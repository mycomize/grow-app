import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import {
  CalendarDays,
  DollarSign,
  Weight,
  Plus,
  Trash2,
  Zap,
  ShoppingBasket,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

export const HarvestStep: React.FC = () => {
  const { flushes, addFlush, updateFlush, removeFlush } = useGrowWizard();

  // Date picker states (separate for each flush)
  const [activeHarvestDatePickerIndex, setActiveHarvestDatePickerIndex] = useState<string | null>(
    null
  );

  // Handle date change
  const onChangeHarvestDate = (event: any, selectedDate?: Date, flushId?: string) => {
    setActiveHarvestDatePickerIndex(null);
    if (selectedDate && flushId) {
      updateFlush(flushId, { harvestDate: selectedDate });
    }
  };

  // Potency options
  const potencyOptions = ['Low', 'Medium', 'High', 'Very High', 'Unknown'];

  return (
    <VStack space="md">
      <HStack className="items-center justify-between">
        <Text className="text-xl font-bold">Harvest</Text>
        <Icon as={ShoppingBasket} size="xl" className="text-typography-400" />
      </HStack>
      <Text className="text-sm text-gray-500">
        Record each flush as it becomes available. You can add multiple flushes over time.
      </Text>

      {flushes.map((flush, index) => (
        <Card key={flush.id} className="mb-4 gap-5 p-4">
          <HStack className="mb-2 justify-between">
            <Text className="text-lg font-bold">Flush #{index + 1}</Text>
            {flushes.length > 1 && (
              <Pressable onPress={() => removeFlush(flush.id)}>
                <Icon as={Trash2} size="md" className="text-error-500" />
              </Pressable>
            )}
          </HStack>

          <VStack space="xs">
            <Text className="text-bold text-lg text-typography-500">Harvest Date</Text>
            <HStack className="flex flex-row items-center justify-between">
              <Input
                className="mt-2 w-11/12"
                isDisabled={false}
                isInvalid={false}
                isReadOnly={false}>
                <InputField className={!flush.harvestDate ? 'text-typography-200' : ''}>
                  {flush.harvestDate ? flush.harvestDate.toDateString() : 'Select date'}
                </InputField>
              </Input>
              <Pressable onPress={() => setActiveHarvestDatePickerIndex(flush.id)}>
                <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
              </Pressable>
            </HStack>
            {activeHarvestDatePickerIndex === flush.id && (
              <DateTimePicker
                value={flush.harvestDate || new Date()}
                mode="date"
                onChange={(event, date) => onChangeHarvestDate(event, date, flush.id)}
              />
            )}
          </VStack>

          <VStack space="xs">
            <Text className="text-bold text-lg text-typography-500">Wet Weight (g)</Text>
            <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
              <InputField
                autoCapitalize="none"
                inputMode="decimal"
                placeholder="Enter wet weight in grams"
                className="placeholder:text-typography-200"
                value={flush.wetWeightG ? flush.wetWeightG.toString() : ''}
                onChangeText={(value) =>
                  updateFlush(flush.id, { wetWeightG: parseFloat(value) || 0 })
                }
              />
              <InputIcon as={Weight} size="xl" className="ml-auto mr-4" />
            </Input>
          </VStack>

          <VStack space="xs">
            <Text className="text-bold text-lg text-typography-500">Dry Weight (g)</Text>
            <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
              <InputField
                autoCapitalize="none"
                inputMode="decimal"
                placeholder="Enter dry weight in grams"
                className="placeholder:text-typography-200"
                value={flush.dryWeightG ? flush.dryWeightG.toString() : ''}
                onChangeText={(value) =>
                  updateFlush(flush.id, { dryWeightG: parseFloat(value) || 0 })
                }
              />
              <InputIcon as={Weight} size="xl" className="ml-auto mr-4" />
            </Input>
          </VStack>

          <VStack space="xs">
            <Text className="text-bold text-lg text-typography-500">Potency</Text>
            <Select
              selectedValue={flush.potency}
              onValueChange={(value) => updateFlush(flush.id, { potency: value })}>
              <SelectTrigger variant="underlined" size="xl">
                <SelectInput
                  className="ml-3 placeholder:text-typography-200"
                  value={flush.potency}
                  placeholder="Select potency"
                />
                <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  {potencyOptions.map((option) => (
                    <SelectItem key={option} label={option} value={option} />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>
          </VStack>
        </Card>
      ))}

      <Button variant="outline" className="mt-2 border-success-400" onPress={addFlush}>
        <HStack space="xs" className="items-center">
          <ButtonIcon as={Plus} />
          <ButtonText>Add Flush</ButtonText>
        </HStack>
      </Button>

      {flushes.length > 0 && (
        <VStack className="mt-4 gap-1 rounded-md bg-background-100 p-4">
          <HStack className="justify-between">
            <Text className="font-bold">Total Wet Weight:</Text>
            <Text>
              {flushes.reduce((sum, flush) => sum + (flush.wetWeightG || 0), 0).toFixed(2)}g
            </Text>
          </HStack>
          <HStack className="justify-between">
            <Text className="font-bold">Total Dry Weight:</Text>
            <Text>
              {flushes.reduce((sum, flush) => sum + (flush.dryWeightG || 0), 0).toFixed(2)}g
            </Text>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
};
