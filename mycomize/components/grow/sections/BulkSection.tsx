import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputSlot } from '~/components/ui/input';
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
import { ChevronDown, ArrowDownToDot, CalendarDays, X } from 'lucide-react-native';

// Import tek types
import { BulkGrow } from '~/lib/types/growTypes';
import { StageTabs } from '~/components/ui/stage-tabs';
import { StageIoTData } from '~/lib/types/iotTypes';

interface BulkStageData {
  bulk_start_date?: string;
  full_bulk_colonization_date?: string;
  bulk_colonization_status?: string;
  s2b_ratio?: string;
}

interface BulkSectionProps {
  growData: BulkStageData;
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

  // Grow object for IoT integration
  grow?: any;

  // IoT data for this specific stage
  stageIoTData?: StageIoTData;
}

export const BulkSection: React.FC<BulkSectionProps> = ({
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
  grow,
  stageIoTData,
}) => {
  const showCompleteButton = status === 'active';

  return (
    <VStack space="md" className="bg-background-0 p-1">
      {/* Stage Tabs */}
      <StageTabs
        stageData={stageData}
        onUpdateBulkStageData={onUpdateBulkStageData}
        grow={grow}
        stageName="bulk_colonization"
        stageStartDate={growData.bulk_start_date}
        stageIoTData={stageIoTData}
      />

      {/* Bulk-specific fields */}
      <VStack space="lg" className="mt-1 border-t border-background-200 pt-4">
        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-600">Start Date</FormControlLabelText>
          </FormControlLabel>
          <Input isReadOnly>
            <InputField
              value={parseDate(growData.bulk_start_date)?.toDateString() || 'Select date'}
              className={!growData.bulk_start_date ? 'text-typography-400' : ''}
            />
            {growData.bulk_start_date ? (
              <InputSlot onPress={() => updateField('bulk_start_date', null)}>
                <Icon as={X} className="mr-3 text-typography-400" />
              </InputSlot>
            ) : (
              <InputSlot onPress={() => setActiveDatePicker('bulk_start_date')}>
                <Icon as={CalendarDays} className="mr-3 text-typography-400" />
              </InputSlot>
            )}
          </Input>
          {activeDatePicker === 'bulk_start_date' && (
            <DateTimePicker
              value={parseDate(growData.bulk_start_date) || new Date()}
              mode="date"
              onChange={(event, date) => handleDateChange('bulk_start_date', date, event)}
            />
          )}
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-600">
              Full Colonization Date
            </FormControlLabelText>
          </FormControlLabel>
          <Input isReadOnly>
            <InputField
              value={
                parseDate(growData.full_bulk_colonization_date)?.toDateString() || 'Select date'
              }
              className={!growData.full_bulk_colonization_date ? 'text-typography-400' : ''}
            />
            {growData.full_bulk_colonization_date ? (
              <InputSlot onPress={() => updateField('full_bulk_colonization_date', null)}>
                <Icon as={X} className="mr-3 text-typography-400" />
              </InputSlot>
            ) : (
              <InputSlot onPress={() => setActiveDatePicker('full_bulk_colonization_date')}>
                <Icon as={CalendarDays} className="mr-3 text-typography-400" />
              </InputSlot>
            )}
          </Input>
          {activeDatePicker === 'full_bulk_colonization_date' && (
            <DateTimePicker
              value={parseDate(growData.full_bulk_colonization_date) || new Date()}
              mode="date"
              onChange={(event, date) =>
                handleDateChange('full_bulk_colonization_date', date, event)
              }
            />
          )}
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-600">S2B Ratio</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              value={growData.s2b_ratio || ''}
              onChangeText={(value) => updateField('s2b_ratio', value || null)}
              placeholder="e.g., 1:2, 1/3, 2:1"
            />
          </Input>
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-600">Status</FormControlLabelText>
          </FormControlLabel>
          <Select
            selectedValue={growData.bulk_colonization_status}
            onValueChange={(value) => updateField('bulk_colonization_status', value)}>
            <SelectTrigger variant="outline" size="md">
              <SelectInput
                value={growData.bulk_colonization_status}
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
