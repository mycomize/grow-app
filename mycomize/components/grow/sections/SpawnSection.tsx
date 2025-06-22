import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays, DollarSign, Weight, Wheat, ChevronDown } from 'lucide-react-native';
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

interface GrowData {
  spawn_type?: string;
  spawn_weight_lbs?: string;
  spawn_cost?: string;
  spawn_vendor?: string;
  spawn_status?: string;
  inoculation_date?: string;
}

interface SpawnSectionProps {
  growData: GrowData;
  updateField: (field: keyof GrowData, value: any) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date, event?: any) => void;
  parseDate: (dateString?: string) => Date | null;
}

export const SpawnSection: React.FC<SpawnSectionProps> = ({
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
          <FormControlLabelText>Type</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter spawn type (e.g., Rye Grain)"
            value={growData.spawn_type || ''}
            onChangeText={(value) => updateField('spawn_type', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Weight (lbs)</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter weight in pounds"
            value={growData.spawn_weight_lbs || ''}
            onChangeText={(value) => updateField('spawn_weight_lbs', value)}
          />
          <InputIcon as={Weight} className="mr-2" />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Cost</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter cost"
            value={growData.spawn_cost || ''}
            onChangeText={(value) => updateField('spawn_cost', value)}
          />
          <InputIcon as={DollarSign} className="mr-2" />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Vendor</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter vendor name"
            value={growData.spawn_vendor || ''}
            onChangeText={(value) => updateField('spawn_vendor', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Status</FormControlLabelText>
        </FormControlLabel>
        <Select
          selectedValue={growData.spawn_status}
          onValueChange={(value) => updateField('spawn_status', value)}>
          <SelectTrigger variant="outline" size="md">
            <SelectInput
              value={growData.spawn_status}
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
