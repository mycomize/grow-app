import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Button, ButtonText } from '~/components/ui/button';
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
import { CalendarDays, ChevronDown, X, ArrowDownToDot } from 'lucide-react-native';

// Import tek types
import { StageTabs } from '~/components/ui/stage-tabs';

interface GrowData {
  fruiting_start_date?: string;
  fruiting_pin_date?: string;
  fruiting_status?: string;
}

interface FruitingSectionProps {
  growData: GrowData;
  updateField: (field: string, value: any) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date, event?: any) => void;
  parseDate: (dateString?: string) => Date | null;

  // Tek stage data (if available from tek)
  stageData?: any;
  onUpdateBulkStageData?: (stageData: any) => void;

  // Complete button props
  status: string;
  currentStageIndex: number;
  stageIndex: number;
  advanceToNextStage: () => void;
}

export const FruitingSection: React.FC<FruitingSectionProps> = ({
  growData,
  updateField,
  activeDatePicker,
  setActiveDatePicker,
  handleDateChange,
  parseDate,
  stageData,
  onUpdateBulkStageData,
  status,
  advanceToNextStage,
}) => {
  const showCompleteButton = status === 'active';

  return (
    <VStack space="md" className="bg-background-0 p-4">
      {/* Stage Tabs */}
      <StageTabs stageData={stageData} onUpdateBulkStageData={onUpdateBulkStageData} />

      {/* Fruiting-specific fields */}
      <VStack space="md" className="mt-4 border-t border-background-200 pt-4">
        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-700">
              Fruiting Start Date
            </FormControlLabelText>
          </FormControlLabel>
          <Input isReadOnly>
            <InputField
              value={parseDate(growData.fruiting_start_date)?.toDateString() || 'Select date'}
              className={!growData.fruiting_start_date ? 'text-typography-400' : ''}
            />
            {growData.fruiting_start_date ? (
              <InputSlot onPress={() => updateField('fruiting_start_date', null)}>
                <Icon as={X} className="mr-3 text-typography-400" />
              </InputSlot>
            ) : (
              <InputSlot onPress={() => setActiveDatePicker('fruiting_start_date')}>
                <Icon as={CalendarDays} className="mr-3 text-typography-400" />
              </InputSlot>
            )}
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
            <FormControlLabelText>First Pin Date</FormControlLabelText>
          </FormControlLabel>
          <Input isReadOnly>
            <InputField
              value={parseDate(growData.fruiting_pin_date)?.toDateString() || 'Select date'}
              className={!growData.fruiting_pin_date ? 'text-typography-400' : ''}
            />
            {growData.fruiting_pin_date ? (
              <InputSlot onPress={() => updateField('fruiting_pin_date', null)}>
                <Icon as={X} className="mr-3 text-typography-400" />
              </InputSlot>
            ) : (
              <InputSlot onPress={() => setActiveDatePicker('fruiting_pin_date')}>
                <Icon as={CalendarDays} className="mr-3 text-typography-400" />
              </InputSlot>
            )}
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

        {/* Complete button */}
        {showCompleteButton && (
          <HStack className="mt-4 justify-end">
            <Button
              size="sm"
              variant="solid"
              onPress={advanceToNextStage}
              className="bg-success-300">
              <ButtonText className="text-white">Complete</ButtonText>
              <Icon as={ArrowDownToDot} className="ml-1" size="sm" />
            </Button>
          </HStack>
        )}
      </VStack>
    </VStack>
  );
};
