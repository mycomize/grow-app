import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Input, InputField } from '~/components/ui/input';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { FileText } from 'lucide-react-native';
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
import { ChevronDown } from 'lucide-react-native';
import { useGrowWizard } from '~/lib/GrowWizardContext';
import { growTeks, tekLabels } from '~/lib/grow';

export const BasicsStep: React.FC = () => {
  const { name, setName, tek, setTek, notes, setNotes } = useGrowWizard();

  return (
    <VStack space="md">
      <HStack className="items-center justify-between">
        <Text className="text-xl font-bold">Basics</Text>
        <Icon as={FileText} size="xl" className="text-typography-400" />
      </HStack>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Name</Text>
        <Input isDisabled={false} variant="underlined" size="xl" className="pl-3">
          <InputField
            autoCapitalize="none"
            inputMode="text"
            placeholder="Enter grow name"
            value={name}
            onChangeText={setName}
            className="placeholder:text-typography-200"
          />
        </Input>
      </VStack>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText className="text-lg font-normal text-typography-500">
            Grow Tek
          </FormControlLabelText>
        </FormControlLabel>
        <Select selectedValue={tek} onValueChange={setTek}>
          <SelectTrigger variant="underlined" size="xl">
            <SelectInput className="ml-3" value={tekLabels[tek] || tek} />
            <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              <SelectDragIndicatorWrapper>
                <SelectDragIndicator />
              </SelectDragIndicatorWrapper>
              <SelectItem label="Monotub" value={growTeks.MONOTUB} />
            </SelectContent>
          </SelectPortal>
        </Select>
      </FormControl>

      <VStack space="xs">
        <Text className="text-bold text-lg text-typography-500">Notes</Text>
        <Textarea className="mt-2">
          <TextareaInput
            textAlignVertical="top"
            className="mx-1 placeholder:text-typography-200"
            placeholder="Enter any notes about this grow"
            value={notes}
            onChangeText={setNotes}
          />
        </Textarea>
      </VStack>
    </VStack>
  );
};
