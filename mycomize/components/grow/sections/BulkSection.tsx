import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
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
import { ChevronDown, ArrowDownToDot } from 'lucide-react-native';

// Import template types
import { StageData } from '~/lib/templateTypes';
import { StageTabs } from '~/components/ui/stage-tabs';

interface GrowData {
  bulk_status?: string;
}

interface BulkSectionProps {
  growData: GrowData;
  updateField: (field: string, value: any) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date, event?: any) => void;
  parseDate: (dateString?: string) => Date | null;

  // Template stage data (if available from template)
  stageData?: any;
  onUpdateStageData?: (stageData: any) => void;

  // Complete button props
  status: string;
  currentStageIndex: number;
  stageIndex: number;
  advanceToNextStage: () => void;
}

export const BulkSection: React.FC<BulkSectionProps> = ({
  growData,
  updateField,
  stageData,
  onUpdateStageData,
  status,
  currentStageIndex,
  stageIndex,
  advanceToNextStage,
}) => {
  const showCompleteButton = status === 'active';

  return (
    <VStack space="md" className="bg-background-0 p-4">
      {/* Stage Tabs */}
      <StageTabs stageData={stageData} onUpdateStageData={onUpdateStageData} />

      {/* Bulk-specific fields */}
      <VStack space="md" className="mt-6 border-t border-background-200 pt-4">
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
