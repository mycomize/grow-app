import React from 'react';
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
  Weight,
  Plus,
  Trash2,
  ShoppingBasket,
  ChevronDown,
} from 'lucide-react-native';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
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
import DateTimePicker from '@react-native-community/datetimepicker';

interface HarvestFlush {
  id: string;
  harvestDate: Date | null;
  wetWeightG: number;
  dryWeightG: number;
  potency: string;
}

interface HarvestSectionProps {
  flushes: HarvestFlush[];
  addFlush: () => void;
  updateFlush: (id: string, data: Partial<HarvestFlush>) => void;
  removeFlush: (id: string) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date) => void;
}

const potencyOptions = ['Low', 'Medium', 'High', 'Very High', 'Unknown'];

export const HarvestSection: React.FC<HarvestSectionProps> = ({
  flushes,
  addFlush,
  updateFlush,
  removeFlush,
  activeDatePicker,
  setActiveDatePicker,
  handleDateChange,
}) => {
  return (
    <VStack space="md" className="bg-background-0 p-4">
      <Text className="text-sm text-typography-500">
        Record each flush as it becomes available. You can add multiple flushes over time.
      </Text>

      {flushes.map((flush, index) => (
        <Card key={flush.id} className="mb-4 gap-4 p-4">
          <HStack className="justify-between">
            <Text className="text-lg font-bold">Flush #{index + 1}</Text>
            {flushes.length > 1 && (
              <Pressable onPress={() => removeFlush(flush.id)}>
                <Icon as={Trash2} size="md" className="text-error-500" />
              </Pressable>
            )}
          </HStack>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>Harvest Date</FormControlLabelText>
            </FormControlLabel>
            <Pressable onPress={() => setActiveDatePicker(`flush_${flush.id}`)}>
              <Input isReadOnly>
                <InputField
                  value={flush.harvestDate?.toDateString() || 'Select date'}
                  className={!flush.harvestDate ? 'text-typography-400' : ''}
                />
                <InputIcon as={CalendarDays} className="mr-2" />
              </Input>
            </Pressable>
            {activeDatePicker === `flush_${flush.id}` && (
              <DateTimePicker
                value={flush.harvestDate || new Date()}
                mode="date"
                onChange={(event, date) => handleDateChange(`flush_${flush.id}`, date)}
              />
            )}
          </FormControl>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>Wet Weight (g)</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Enter wet weight in grams"
                value={flush.wetWeightG ? flush.wetWeightG.toString() : ''}
                onChangeText={(value) =>
                  updateFlush(flush.id, { wetWeightG: parseFloat(value) || 0 })
                }
                keyboardType="numeric"
              />
              <InputIcon as={Weight} className="mr-2" />
            </Input>
          </FormControl>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>Dry Weight (g)</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                placeholder="Enter dry weight in grams"
                value={flush.dryWeightG ? flush.dryWeightG.toString() : ''}
                onChangeText={(value) =>
                  updateFlush(flush.id, { dryWeightG: parseFloat(value) || 0 })
                }
                keyboardType="numeric"
              />
              <InputIcon as={Weight} className="mr-2" />
            </Input>
          </FormControl>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>Potency</FormControlLabelText>
            </FormControlLabel>
            <Select
              selectedValue={flush.potency}
              onValueChange={(value) => updateFlush(flush.id, { potency: value })}>
              <SelectTrigger variant="outline" size="md" className="">
                <SelectInput
                  value={flush.potency}
                  placeholder="Select potency"
                  className="placeholder:text-sm"
                />
                <SelectIcon as={ChevronDown} className="ml-auto mr-2" />
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
          </FormControl>
        </Card>
      ))}

      <Button variant="outline" className="mt-2 border-success-400" onPress={addFlush}>
        <HStack space="xs" className="items-center">
          <ButtonIcon as={Plus} />
          <ButtonText>Add Flush</ButtonText>
        </HStack>
      </Button>

      {flushes.length > 0 && (
        <VStack className="mt-4 gap-4 rounded-md p-4">
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
