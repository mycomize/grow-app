import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { Icon } from '~/components/ui/icon';
import { CalendarDays, DollarSign, Droplets, Syringe } from 'lucide-react-native';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import DateTimePicker from '@react-native-community/datetimepicker';

interface GrowData {
  syringe_vendor?: string;
  syringe_volume_ml?: string;
  syringe_cost?: string;
  syringe_created_at?: string;
  syringe_expiration_date?: string;
}

interface SyringeSectionProps {
  growData: GrowData;
  updateField: (field: keyof GrowData, value: any) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date, event?: any) => void;
  parseDate: (dateString?: string) => Date | null;
}

export const SyringeSection: React.FC<SyringeSectionProps> = ({
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
          <FormControlLabelText>Syringe Vendor</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter vendor name"
            value={growData.syringe_vendor || ''}
            onChangeText={(value) => updateField('syringe_vendor', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Syringe Volume (mL)</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter volume in mL"
            value={growData.syringe_volume_ml || ''}
            onChangeText={(value) => updateField('syringe_volume_ml', value)}
          />
          <InputIcon as={Droplets} className="mr-2" />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Syringe Cost</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter cost"
            value={growData.syringe_cost || ''}
            onChangeText={(value) => updateField('syringe_cost', value)}
          />
          <InputIcon as={DollarSign} className="mr-2" />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Syringe Created Date</FormControlLabelText>
        </FormControlLabel>
        <Input isReadOnly>
          <InputField
            value={parseDate(growData.syringe_created_at)?.toDateString() || 'Select date'}
            className={!growData.syringe_created_at ? 'text-typography-400' : ''}
          />
          <InputSlot onPress={() => setActiveDatePicker('syringe_created_at')}>
            <InputIcon as={CalendarDays} className="mr-2" />
          </InputSlot>
        </Input>
        {activeDatePicker === 'syringe_created_at' && (
          <DateTimePicker
            value={parseDate(growData.syringe_created_at) || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange('syringe_created_at', date, event)}
          />
        )}
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Syringe Expiration Date</FormControlLabelText>
        </FormControlLabel>
        <Input isReadOnly>
          <InputField
            value={parseDate(growData.syringe_expiration_date)?.toDateString() || 'Select date'}
            className={!growData.syringe_expiration_date ? 'text-typography-400' : ''}
          />
          <InputSlot onPress={() => setActiveDatePicker('syringe_expiration_date')}>
            <InputIcon as={CalendarDays} className="mr-2" />
          </InputSlot>
        </Input>
        {activeDatePicker === 'syringe_expiration_date' && (
          <DateTimePicker
            value={parseDate(growData.syringe_expiration_date) || new Date()}
            mode="date"
            onChange={(event, date) => handleDateChange('syringe_expiration_date', date, event)}
          />
        )}
      </FormControl>
    </VStack>
  );
};
