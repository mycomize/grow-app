import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowDownToDot, CalendarDays, X } from 'lucide-react-native';

// Import grow components
import { FlushList } from '../FlushList';

// Import tek types
import { StageTabs } from '~/components/ui/stage-tabs';
import { StageIoTData } from '~/lib/types/iotTypes';

interface HarvestSectionProps {
  growData?: any; // Grow data for calendar integration
  updateField?: (field: string, value: any) => void;
  activeDatePicker?: string | null;
  setActiveDatePicker?: (field: string | null) => void;
  handleDateChange?: (field: string, date?: Date, event?: any) => void;
  parseDate?: (dateString?: string) => Date | null;

  // Tek stage data (if available from tek)
  stageData?: any;
  onUpdateBulkStageData?: (stageData: any) => void;

  // Complete button props
  status: string;
  currentStageIndex: number;
  stageIndex: number;
  advanceToNextStage: () => void;

  // Grow object for IoT integration (consistent with other sections)
  grow?: any;

  // IoT data for this specific stage
  stageIoTData?: StageIoTData;
}

export const HarvestSection: React.FC<HarvestSectionProps> = ({
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
        stageName="harvest"
        stageStartDate={growData?.fruiting_start_date}
        stageIoTData={stageIoTData}
      />

        {/* Harvest-specific fields */}
        <VStack space="lg" className="mt-1 border-t border-background-200 pt-4">
          {/* Harvest Flushes */}
          <FlushList />

          {/* Harvest Completion Date (after flushes) */}
          {updateField && setActiveDatePicker && handleDateChange && parseDate && (
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className="text-typography-600">
                  Harvest Completion Date
                </FormControlLabelText>
              </FormControlLabel>
              <Input isReadOnly>
                <InputField
                  value={parseDate(growData?.harvest_completion_date)?.toDateString() || 'Select date'}
                  className={!growData?.harvest_completion_date ? 'text-typography-400' : ''}
                />
                {growData?.harvest_completion_date ? (
                  <InputSlot onPress={() => updateField('harvest_completion_date', null)}>
                    <Icon as={X} className="mr-3 text-typography-400" />
                  </InputSlot>
                ) : (
                  <InputSlot onPress={() => setActiveDatePicker('harvest_completion_date')}>
                    <Icon as={CalendarDays} className="mr-3 text-typography-400" />
                  </InputSlot>
                )}
              </Input>
              {activeDatePicker === 'harvest_completion_date' && (
                <DateTimePicker
                  value={parseDate(growData?.harvest_completion_date) || new Date()}
                  mode="date"
                  onChange={(event, date) => handleDateChange('harvest_completion_date', date, event)}
                />
              )}
            </FormControl>
          )}

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
