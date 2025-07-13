import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
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
import { Package, Thermometer, CheckSquare, FileText, ChevronDown } from 'lucide-react-native';

// Import template components
import { ItemsList } from '~/components/template/ItemsList';
import { EnvironmentalConditionsList } from '~/components/template/EnvironmentalConditionsList';
import { TasksList } from '~/components/template/TasksList';
import { StageNotes } from '~/components/template/StageNotes';

// Import template types
import { StageData } from '~/lib/templateTypes';

type TabType = 'items' | 'conditions' | 'tasks' | 'notes';

interface GrowData {
  spawn_status?: string;
}

interface SpawnSectionProps {
  growData: GrowData;
  updateField: (field: string, value: any) => void;
  activeDatePicker: string | null;
  setActiveDatePicker: (field: string | null) => void;
  handleDateChange: (field: string, date?: Date, event?: any) => void;
  parseDate: (dateString?: string) => Date | null;

  // Template stage data (if available from template)
  stageData?: any;
  onUpdateStageData?: (stageData: any) => void;
}

export const SpawnSection: React.FC<SpawnSectionProps> = ({
  growData,
  updateField,
  stageData,
  onUpdateStageData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('items');

  // Initialize empty stage data if not provided
  const defaultStageData: StageData = {
    items: [],
    environmentalConditions: [],
    tasks: [],
    notes: '',
  };

  const currentStageData = stageData || defaultStageData;

  const handleUpdateItems = (items: typeof currentStageData.items) => {
    if (onUpdateStageData) {
      onUpdateStageData({
        ...currentStageData,
        items,
      });
    }
  };

  const handleUpdateConditions = (
    environmentalConditions: typeof currentStageData.environmentalConditions
  ) => {
    if (onUpdateStageData) {
      onUpdateStageData({
        ...currentStageData,
        environmentalConditions,
      });
    }
  };

  const handleUpdateTasks = (tasks: typeof currentStageData.tasks) => {
    if (onUpdateStageData) {
      onUpdateStageData({
        ...currentStageData,
        tasks,
      });
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (onUpdateStageData) {
      onUpdateStageData({
        ...currentStageData,
        notes,
      });
    }
  };

  const tabs = [
    { id: 'items' as TabType, icon: Package },
    { id: 'conditions' as TabType, icon: Thermometer },
    { id: 'tasks' as TabType, icon: CheckSquare },
    { id: 'notes' as TabType, icon: FileText },
  ];

  return (
    <VStack space="md" className="bg-background-0 p-4">
      {/* Tab Buttons */}
      <HStack space="xs" className="mb-2 justify-center">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'solid' : 'outline'}
            size="sm"
            onPress={() => setActiveTab(tab.id)}
            className={`flex-1 ${
              activeTab === tab.id
                ? 'border border-success-400 bg-success-300'
                : 'border-background-300 bg-transparent'
            }`}>
            <Icon
              as={tab.icon}
              size="lg"
              className={activeTab === tab.id ? 'text-white' : 'text-typography-500'}
            />
          </Button>
        ))}
      </HStack>

      {/* Tab Content */}
      <VStack space="md">
        {activeTab === 'items' && (
          <ItemsList items={currentStageData.items} onUpdateItems={handleUpdateItems} />
        )}
        {activeTab === 'conditions' && (
          <EnvironmentalConditionsList
            conditions={currentStageData.environmentalConditions}
            onUpdateConditions={handleUpdateConditions}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksList tasks={currentStageData.tasks} onUpdateTasks={handleUpdateTasks} />
        )}
        {activeTab === 'notes' && (
          <StageNotes notes={currentStageData.notes} onUpdateNotes={handleUpdateNotes} />
        )}
      </VStack>

      {/* Spawn-specific fields */}
      <VStack space="md" className="mt-6 border-t border-background-200 pt-4">
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
    </VStack>
  );
};
