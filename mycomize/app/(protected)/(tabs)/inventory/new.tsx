import { ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button, ButtonText } from '~/components/ui/button';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { FormControlHelper, FormControlHelperText } from '~/components/ui/form-control';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { Input, InputField } from '~/components/ui/input';
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
} from '@/components/ui/select';

export default function NewInventoryScreen() {
  const date = new Date();
  return (
    <VStack className="flex-1 items-center">
      <Card className="mt-3 w-11/12">
        <FormControl isRequired>
          <FormControlLabel>
            <FormControlLabelText className="ml-0 text-lg text-typography-600">
              TYPE
            </FormControlLabelText>
          </FormControlLabel>
          <Select>
            <SelectTrigger variant="outline" size="lg">
              <SelectInput />
              <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                <SelectItem label="Syringe" value="Syringe" />
                <SelectItem label="Spawn" value="Spawn" />
                <SelectItem label="Bulk" value="Bulk" />
              </SelectContent>
            </SelectPortal>
          </Select>
        </FormControl>
        <Text className="text-bold mt-4 text-lg text-typography-600">VENDOR</Text>
        <Input isDisabled={false} isInvalid={false} isReadOnly={false}>
          <InputField placeholder="Enter source/vendor here"></InputField>
        </Input>
        <DateTimePicker value={date} mode="date"></DateTimePicker>
      </Card>
    </VStack>
  );
}
