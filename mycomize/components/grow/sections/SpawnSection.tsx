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
import { BulkGrow } from '~/lib/growTypes';
import { StageTabs } from '~/components/ui/stage-tabs';
import { IoTEntity, IoTGateway } from '~/lib/iot';

interface StageIoTData {
  entities: IoTEntity[];
  gateways: IoTGateway[];
  entityStates: Record<string, string>;
  loading: boolean;
}

interface SpawnStageData {
  spawn_start_date?: string;
  full_spawn_colonization_date?: string;
  spawn_colonization_status?: string;
  inoculation_date?: string;
}

interface SpawnSectionProps {
  growData: SpawnStageData;
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

export const SpawnSection: React.FC<SpawnSectionProps> = ({
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
        stageName="spawn_colonization"
        stageStartDate={growData.spawn_start_date || growData.inoculation_date}
        stageIoTData={stageIoTData}
      />

      {/* Spawn-specific fields */}
      <VStack space="lg" className="mt-4 border-t border-background-200 pt-4">
        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-600">Start Date</FormControlLabelText>
          </FormControlLabel>
          <Input isReadOnly>
            <InputField
              value={
                parseDate(growData.spawn_start_date || growData.inoculation_date)?.toDateString() ||
                'Select date'
              }
              className={
                !growData.spawn_start_date && !growData.inoculation_date
                  ? 'text-typography-400'
                  : ''
              }
            />
            {growData.spawn_start_date ? (
              <InputSlot onPress={() => updateField('spawn_start_date', null)}>
                <Icon as={X} className="mr-3 text-typography-400" />
              </InputSlot>
            ) : (
              <InputSlot onPress={() => setActiveDatePicker('spawn_start_date')}>
                <Icon as={CalendarDays} className="mr-3 text-typography-400" />
              </InputSlot>
            )}
          </Input>
          {activeDatePicker === 'spawn_start_date' && (
            <DateTimePicker
              value={
                parseDate(growData.spawn_start_date || growData.inoculation_date) || new Date()
              }
              mode="date"
              onChange={(event, date) => handleDateChange('spawn_start_date', date, event)}
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
                parseDate(growData.full_spawn_colonization_date)?.toDateString() || 'Select date'
              }
              className={!growData.full_spawn_colonization_date ? 'text-typography-400' : ''}
            />
            {growData.full_spawn_colonization_date ? (
              <InputSlot onPress={() => updateField('full_spawn_colonization_date', null)}>
                <Icon as={X} className="mr-3 text-typography-400" />
              </InputSlot>
            ) : (
              <InputSlot onPress={() => setActiveDatePicker('full_spawn_colonization_date')}>
                <Icon as={CalendarDays} className="mr-3 text-typography-400" />
              </InputSlot>
            )}
          </Input>
          {activeDatePicker === 'full_spawn_colonization_date' && (
            <DateTimePicker
              value={parseDate(growData.full_spawn_colonization_date) || new Date()}
              mode="date"
              onChange={(event, date) =>
                handleDateChange('full_spawn_colonization_date', date, event)
              }
            />
          )}
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText className="text-typography-600">Status</FormControlLabelText>
          </FormControlLabel>
          <Select
            selectedValue={growData.spawn_colonization_status}
            onValueChange={(value) => updateField('spawn_colonization_status', value)}>
            <SelectTrigger variant="outline" size="md">
              <SelectInput
                value={growData.spawn_colonization_status}
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
                <SelectItem label="Contam" value="Contaminated" />
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
