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
import { BulkStageData } from '~/lib/tekTypes';
import { StageTabs } from '~/components/ui/stage-tabs';

interface GrowData {
  inoculation_date?: string;
  inoculation_status?: string;
}

interface InoculationSectionProps {
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

export const InoculationSection: React.FC<InoculationSectionProps> = ({
  growData,
  updateField,
  activeDatePicker,
  setActiveDatePicker,
  handleDateChange,
  parseDate,
  stageData,
  onUpdateBulkStageData,
  status,
  currentStageIndex,
  stageIndex,
  advanceToNextStage,
}) => {
  const showCompleteButton =
    growData.inoculation_date &&
    (status === 'active' || (currentStageIndex === -1 && stageIndex === 0));

  return (
    <VStack space="md" className="bg-background-0 p-4">
      {/* Stage Tabs */}
      <StageTabs stageData={stageData} onUpdateBulkStageData={onUpdateBulkStageData} />

      {/* Inoculation-specific fields */}
      <VStack space="lg" className="mt-4 border-t border-background-200 pt-4">
        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-700">
              Inoculation Date
            </FormControlLabelText>
          </FormControlLabel>
          <Input isReadOnly>
            <InputField
              value={parseDate(growData.inoculation_date)?.toDateString() || 'Select date'}
              className={!growData.inoculation_date ? 'text-typography-400' : ''}
            />
            {growData.inoculation_date ? (
              <InputSlot onPress={() => updateField('inoculation_date', null)}>
                <Icon as={X} className="mr-3 text-typography-400" />
              </InputSlot>
            ) : (
              <InputSlot onPress={() => setActiveDatePicker('inoculation_date')}>
                <Icon as={CalendarDays} className="mr-3 text-typography-400" />
              </InputSlot>
            )}
          </Input>
          {activeDatePicker === 'inoculation_date' && (
            <DateTimePicker
              value={parseDate(growData.inoculation_date) || new Date()}
              mode="date"
              onChange={(event, date) => handleDateChange('inoculation_date', date, event)}
            />
          )}
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-700">Status</FormControlLabelText>
          </FormControlLabel>
          <Select
            selectedValue={growData.inoculation_status}
            onValueChange={(value) => updateField('inoculation_status', value)}>
            <SelectTrigger variant="outline" size="md">
              <SelectInput
                value={growData.inoculation_status}
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

        {/* Complete button - only show if inoculation date is selected */}
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
