import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays, DollarSign, Weight, Package } from 'lucide-react-native';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import DateTimePicker from '@react-native-community/datetimepicker';

interface GrowData {
  bulk_type?: string;
  bulk_weight_lbs?: number;
  bulk_cost?: number;
  bulk_vendor?: string;
  bulk_created_at?: string;
  bulk_expiration_date?: string;
}

interface BulkSectionProps {
  growData: GrowData;
  updateField: (field: keyof GrowData, value: any) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date) => void;
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
          <FormControlLabelText>Type</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter substrate type (e.g., Coco Coir)"
            value={growData.bulk_type || ''}
            onChangeText={(value) => updateField('bulk_type', value)}
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
            value={growData.bulk_weight_lbs?.toString() || ''}
            onChangeText={(value) => updateField('bulk_weight_lbs', parseFloat(value) || 0)}
            keyboardType="numeric"
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
            value={growData.bulk_cost?.toString() || ''}
            onChangeText={(value) => updateField('bulk_cost', parseFloat(value) || 0)}
            keyboardType="numeric"
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
        <Pressable onPress={() => setActiveDatePicker('bulk_created_at')}>
          <Input isReadOnly>
            <InputField
              value={parseDate(growData.bulk_created_at)?.toDateString() || 'Select date'}
              className={!growData.bulk_created_at ? 'text-typography-400' : ''}
            />
            <InputIcon as={CalendarDays} className="mr-2" />
          </Input>
        </Pressable>
        {activeDatePicker === 'bulk_created_at' && (
          <DateTimePicker
            value={parseDate(growData.bulk_created_at) || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange('bulk_created_at', date)}
          />
        )}
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Expiration Date</FormControlLabelText>
        </FormControlLabel>
        <Pressable onPress={() => setActiveDatePicker('bulk_expiration_date')}>
          <Input isReadOnly>
            <InputField
              value={parseDate(growData.bulk_expiration_date)?.toDateString() || 'Select date'}
              className={!growData.bulk_expiration_date ? 'text-typography-400' : ''}
            />
            <InputIcon as={CalendarDays} className="mr-2" />
          </Input>
        </Pressable>
        {activeDatePicker === 'bulk_expiration_date' && (
          <DateTimePicker
            value={parseDate(growData.bulk_expiration_date) || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange('bulk_expiration_date', date)}
          />
        )}
      </FormControl>
    </VStack>
  );
};
