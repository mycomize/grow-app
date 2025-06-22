import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays, ChevronDown } from 'lucide-react-native';
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
import MushroomIcon from '~/components/icons/MushroomIcon';
import DateTimePicker from '@react-native-community/datetimepicker';

interface GrowData {
  fruiting_start_date?: string;
  fruiting_pin_date?: string;
  fruiting_mist_frequency?: string;
  fruiting_fan_frequency?: string;
  fruiting_status?: string;
}

interface FruitingSectionProps {
  growData: GrowData;
  updateField: (field: keyof GrowData, value: any) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date, event?: any) => void;
  parseDate: (dateString?: string) => Date | null;
}

const frequencyOptions = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Every other day',
  'As needed',
  'Never',
];

export const FruitingSection: React.FC<FruitingSectionProps> = ({
  growData,
  updateField,
  activeDatePicker,
  setActiveDatePicker,
  handleDateChange,
  parseDate,
}) => {
  return (
    <VStack space="md" className="bg-background-0 p-4">
      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Fruiting Start Date</FormControlLabelText>
        </FormControlLabel>
        <Input isReadOnly>
          <InputField
            value={parseDate(growData.fruiting_start_date)?.toDateString() || 'Select date'}
            className={!growData.fruiting_start_date ? 'text-typography-400' : ''}
          />
          <InputSlot onPress={() => setActiveDatePicker('fruiting_start_date')}>
            <Icon as={CalendarDays} className="mr-3 text-typography-400" />
          </InputSlot>
        </Input>
        {activeDatePicker === 'fruiting_start_date' && (
          <DateTimePicker
            value={parseDate(growData.fruiting_start_date) || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange('fruiting_start_date', date, event)}
          />
        )}
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Pin Date</FormControlLabelText>
        </FormControlLabel>
        <Input isReadOnly>
          <InputField
            value={parseDate(growData.fruiting_pin_date)?.toDateString() || 'Select date'}
            className={!growData.fruiting_pin_date ? 'text-typography-400' : ''}
          />
          <InputSlot onPress={() => setActiveDatePicker('fruiting_pin_date')}>
            <Icon as={CalendarDays} className="mr-3 text-typography-400" />
          </InputSlot>
        </Input>
        {activeDatePicker === 'fruiting_pin_date' && (
          <DateTimePicker
            value={parseDate(growData.fruiting_pin_date) || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange('fruiting_pin_date', date, event)}
          />
        )}
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Mist Frequency</FormControlLabelText>
        </FormControlLabel>
        <Select
          selectedValue={growData.fruiting_mist_frequency}
          onValueChange={(value) => updateField('fruiting_mist_frequency', value)}>
          <SelectTrigger variant="outline" size="md">
            <SelectInput
              value={growData.fruiting_mist_frequency}
              placeholder="Select frequency"
              className="mt-1 placeholder:text-sm"
            />
            <SelectIcon as={ChevronDown} className="ml-auto mr-2" />
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
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Status</FormControlLabelText>
        </FormControlLabel>
        <Select
          selectedValue={growData.fruiting_status}
          onValueChange={(value) => updateField('fruiting_status', value)}>
          <SelectTrigger variant="outline" size="md">
            <SelectInput
              value={growData.fruiting_status}
              placeholder="Select status"
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
              <SelectItem label="Healthy" value="Healthy" />
              <SelectItem label="Suspect" value="Suspect" />
              <SelectItem label="Contaminated" value="Contaminated" />
            </SelectContent>
          </SelectPortal>
        </Select>
      </FormControl>
    </VStack>
  );
};
