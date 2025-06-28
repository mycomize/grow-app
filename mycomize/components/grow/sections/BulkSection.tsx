import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays, DollarSign, Weight, Package, ChevronDown } from 'lucide-react-native';
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
  bulk_weight_lbs?: string;
  bulk_cost?: string;
  bulk_vendor?: string;
  bulk_created_at?: string;
  bulk_expiration_date?: string;
  bulk_status?: string;
}

interface BulkSectionProps {
  growData: GrowData;
  updateField: (field: keyof GrowData, value: any) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date, event?: any) => void;
  parseDate: (dateString?: string) => Date | null;
}

export const BulkSection: React.FC<BulkSectionProps> = ({
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
          <FormControlLabelText>Weight (lbs)</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter weight in pounds"
            value={growData.bulk_weight_lbs || ''}
            onChangeText={(value) => updateField('bulk_weight_lbs', value)}
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
            value={growData.bulk_cost || ''}
            onChangeText={(value) => updateField('bulk_cost', value)}
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
            value={growData.bulk_vendor || ''}
            onChangeText={(value) => updateField('bulk_vendor', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Created Date</FormControlLabelText>
        </FormControlLabel>
        <Input isReadOnly>
          <InputField
            value={parseDate(growData.bulk_created_at)?.toDateString() || 'Select date'}
            className={!growData.bulk_created_at ? 'text-typography-400' : ''}
          />
          <InputSlot onPress={() => setActiveDatePicker('bulk_created_at')}>
            <InputIcon as={CalendarDays} className="mr-2" />
          </InputSlot>
        </Input>
        {activeDatePicker === 'bulk_created_at' && (
          <DateTimePicker
            value={parseDate(growData.bulk_created_at) || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange('bulk_created_at', date, event)}
          />
        )}
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Expiration Date</FormControlLabelText>
        </FormControlLabel>
        <Input isReadOnly>
          <InputField
            value={parseDate(growData.bulk_expiration_date)?.toDateString() || 'Select date'}
            className={!growData.bulk_expiration_date ? 'text-typography-400' : ''}
          />
          <InputSlot onPress={() => setActiveDatePicker('bulk_expiration_date')}>
            <InputIcon as={CalendarDays} className="mr-2" />
          </InputSlot>
        </Input>
        {activeDatePicker === 'bulk_expiration_date' && (
          <DateTimePicker
            value={parseDate(growData.bulk_expiration_date) || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange('bulk_expiration_date', date, event)}
          />
        )}
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Status</FormControlLabelText>
        </FormControlLabel>
        <Select
          selectedValue={growData.bulk_status}
          onValueChange={(value) => updateField('bulk_status', value)}>
          <SelectTrigger variant="outline" size="md">
            <SelectInput
              value={growData.bulk_status}
              placeholder="Select status"
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
