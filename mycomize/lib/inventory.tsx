import { ScrollView, Keyboard } from 'react-native';
import {
  ChevronDown,
  FlaskConical,
  CalendarDays,
  DollarSign,
  Building2,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Button, ButtonText } from '~/components/ui/button';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { Input, InputIcon, InputField } from '~/components/ui/input';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Box } from '~/components/ui/box';
import { Center } from '~/components/ui/center';

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

import { getBackendUrl } from '~/lib/backendUrl';
import { AuthContext } from '~/lib/AuthContext';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

export interface InventoryItem {
  type: 'Syringe' | 'Spawn' | 'Bulk' | '';
  id: number;
  source: string;
  source_date: Date;
  expiration_date: Date | null;
  cost: number;
  notes: string;

  // Syringe-specific fields
  syringe_type?: string;
  volume_ml?: number;
  species?: string;
  variant?: string;

  // Spawn-specific fields
  spawn_type?: string;
  // amount_lbs?: number;

  // Bulk-specific fields
  bulk_type?: string;
  amount_lbs?: number;
}
export interface SaveInventoryItemButtonProps {
  title: string;
  newItem: boolean;
}

export interface DeleteInventoryItemButtonProps {
  title: string;
}

export interface InventoryFormProps {
  itemArg: InventoryItem | null;
}

export async function getInventoryItem(id: number, token: string | null | undefined) {
  const url = `${getBackendUrl()}/inventory/item/${id}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return response;
  } catch (error) {
    console.error('Error calling getInventoryItem:', error);
    return null;
  }
}

const validateItemType = (type: string) => {
  const validTypes = ['Syringe', 'Spawn', 'Bulk'];
  return validTypes.includes(type);
};

export const InventoryForm: React.FC<InventoryFormProps> = ({ itemArg }) => {
  // Common date fields
  const [showSourceDate, setShowSourceDate] = useState(false);
  const [showExpirationDate, setShowExpirationDate] = useState(false);

  const [costIsValid, setCostIsValid] = useState(true);
  const [syringeVolumeIsValid, setSyringeVolumeIsValid] = useState(true);
  const [spawnAmountIsValid, setSpawnAmountIsValid] = useState(true);
  const [bulkAmountIsValid, setBulkAmountIsValid] = useState(true);
  const [itemTypeIsValid, setTypeIsValid] = useState(true);

  const [item, setItem] = useState<InventoryItem>({
    type: '',
    id: 0,
    source: '',
    source_date: new Date(),
    expiration_date: null,
    cost: -1,
    notes: '',
    syringe_type: '',
    volume_ml: -1,
    species: '',
    variant: '',
    spawn_type: '',
    amount_lbs: -1,
    bulk_type: '',
  });

  const handleItemChange =
    <K extends keyof InventoryItem>(key: K) =>
    (value: any) => {
      setItem((prevItem) => ({
        ...prevItem,
        [key]: value,
      }));
    };

  useEffect(() => {
    if (itemArg?.id) {
      handleItemChange('id')(itemArg.id);
    }

    if (itemArg?.type) {
      handleItemChange('type')(itemArg.type);
    }

    if (itemArg?.source) {
      handleItemChange('source')(itemArg.source);
    }

    if (itemArg?.cost) {
      handleItemChange('cost')(itemArg.cost);
    }

    if (itemArg?.source_date) {
      handleItemChange('source_date')(new Date(itemArg.source_date));
    }

    if (itemArg?.expiration_date) {
      handleItemChange('expiration_date')(new Date(itemArg.expiration_date));
    }

    if (itemArg?.notes) {
      handleItemChange('notes')(itemArg.notes);
    }

    if (itemArg?.type === 'Syringe') {
      handleItemChange('syringe_type')(itemArg.syringe_type);
      handleItemChange('volume_ml')(itemArg.volume_ml);
      handleItemChange('species')(itemArg.species);
      handleItemChange('variant')(itemArg.variant);
    } else if (itemArg?.type === 'Spawn') {
      handleItemChange('spawn_type')(itemArg.spawn_type);
      handleItemChange('amount_lbs')(itemArg.amount_lbs);
    } else if (itemArg?.type === 'Bulk') {
      handleItemChange('bulk_type')(itemArg.bulk_type);
      handleItemChange('amount_lbs')(itemArg.amount_lbs);
    }
  }, [itemArg]);

  const onChangeSourceDate = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || item.source_date;

    handleItemChange('source_date')(currentDate);
    setShowSourceDate(false);
  };

  const onChangeExpirationDate = (event: any, selectedDate: Date | undefined) => {
    // If user cancels or selects an invalid date, keep the current value
    if (event.type === 'dismissed') {
      setShowExpirationDate(false);
      return;
    }

    // Update the expiration date
    handleItemChange('expiration_date')(selectedDate);
    setShowExpirationDate(false);
  };

  const clearExpirationDate = () => {
    handleItemChange('expiration_date')(null);
  };

  const handleChangeInventoryType = (value: string) => {
    if (value === 'Syringe' || value === 'Spawn' || value === 'Bulk') {
      handleItemChange('type')(value);
      setTypeIsValid(true);
    } else {
      setTypeIsValid(false);
    }
  };

  // Track keyboard visibility to hide the save button when keyboard is showing
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Set up keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    // Clean up listeners
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const SaveInventoryItemButton: React.FC<SaveInventoryItemButtonProps> = ({ title, newItem }) => {
    const router = useRouter();
    const { token } = useContext(AuthContext);

    // Hide the button when keyboard is visible
    if (keyboardVisible) {
      return null;
    }

    const handleSave = async () => {
      const itemType = item.type;
      let validData = true;

      if (!validateItemType(itemType)) {
        setTypeIsValid(false);
        validData = false;
      }

      if (item.cost < 0 || isNaN(parseFloat(item.cost.toString()))) {
        setCostIsValid(false);
        validData = false;
      }

      if (itemType === 'Syringe') {
        if (!item.volume_ml || item.volume_ml < 0) {
          setSyringeVolumeIsValid(false);
          validData = false;
        }

        if (
          (item.volume_ml && item.volume_ml < 0) ||
          isNaN(parseFloat(item.volume_ml?.toString() || ''))
        ) {
          setSyringeVolumeIsValid(false);
          validData = false;
        }
      } else if (itemType === 'Spawn' || itemType === 'Bulk') {
        if (!item.amount_lbs || item.amount_lbs < 0) {
          setSpawnAmountIsValid(false);
          setBulkAmountIsValid(false);
          validData = false;
        }
      }

      if (!validData) {
        return;
      }

      try {
        let url = '';
        let method = '';

        if (newItem) {
          url = `${getBackendUrl()}/inventory/item`;
          method = 'POST';
        } else {
          url = `${getBackendUrl()}/inventory/item/${item.id}`;
          method = 'PUT';
        }

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item),
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/login');
          }

          if (response.status === 422) {
            const errorData = await response.json();
            console.error('Validation error:', errorData);
          }
        } else {
          router.back();
        }
      } catch (error) {
        console.error('Error saving item:', error);
      }
    };

    return (
      <>
        <Button
          variant="solid"
          className="mb-4 h-12 w-11/12 rounded-md"
          action="positive"
          onPress={handleSave}>
          <ButtonText className="text-lg font-bold text-white">{title}</ButtonText>
        </Button>
      </>
    );
  };

  const DeleteInventoryItemButton: React.FC<DeleteInventoryItemButtonProps> = ({ title }) => {
    const router = useRouter();
    const { token } = useContext(AuthContext);

    if (keyboardVisible) {
      return null;
    }

    const handleDelete = async () => {
      try {
        const url = `${getBackendUrl()}/inventory/item/${item.id}`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/login');
          } else {
            const errorData = await response.json();
            console.error('Error deleting item:', errorData);
            router.back();
          }
        } else {
          router.back();
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    };

    return (
      <>
        <Button
          variant="solid"
          className="mb-4 h-12 w-11/12 rounded-md"
          action="negative"
          onPress={handleDelete}>
          <ButtonText className="text-lg font-bold text-white">{title}</ButtonText>
        </Button>
      </>
    );
  };

  return (
    <>
      <Box className="h-full w-full bg-background-50">
        <VStack className="mt-4 flex-1 items-center">
          <ScrollView className="w-full bg-background-50">
            <Card className="mx-auto mb-4 w-11/12 gap-8 bg-background-50">
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-lg font-normal text-typography-500">
                    TYPE
                  </FormControlLabelText>
                </FormControlLabel>
                <Select isInvalid={!itemTypeIsValid} onValueChange={handleChangeInventoryType}>
                  <SelectTrigger variant="underlined" size="xl">
                    <SelectInput className="ml-3" value={item.type} />
                    <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
                  </SelectTrigger>
                  {!itemTypeIsValid && (
                    <Text className="mt-2 text-error-600">Please select inventory type</Text>
                  )}
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
              <VStack>
                <Text className="text-bold text-lg text-typography-500">VENDOR</Text>
                <Input
                  isDisabled={false}
                  isInvalid={false}
                  isReadOnly={false}
                  variant="underlined"
                  size="xl"
                  className="pl-3 ">
                  <InputField
                    autoCapitalize="none"
                    inputMode="text"
                    onChangeText={handleItemChange('source')}
                    value={item.source}
                  />
                  <InputIcon as={Building2} size="xl" className="ml-auto mr-4" />
                </Input>
              </VStack>
              <VStack>
                <Text className="text-bold text-lg text-typography-500">COST</Text>
                <Input
                  isDisabled={false}
                  isInvalid={!costIsValid}
                  isReadOnly={false}
                  variant="underlined"
                  size="xl"
                  className="pl-3 ">
                  <InputField
                    autoCapitalize="none"
                    inputMode="decimal"
                    onChangeText={handleItemChange('cost')}
                    value={item.cost >= 0 ? item.cost.toString() : ''}
                  />
                  <InputIcon as={DollarSign} size="xl" className="ml-auto mr-4" />
                </Input>
                {!costIsValid && (
                  <Text className="mt-2 text-error-600">Please enter a valid cost</Text>
                )}
              </VStack>
              <VStack>
                <Text className="text-bold  text-lg text-typography-500">SOURCE DATE</Text>
                <HStack className="flex flex-row items-center justify-between">
                  <Input
                    className="mt-2 w-11/12"
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}>
                    <InputField>{item.source_date.toDateString()}</InputField>
                  </Input>
                  <Pressable onPress={() => setShowSourceDate(true)}>
                    <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
                  </Pressable>
                </HStack>
                {showSourceDate && (
                  <DateTimePicker
                    value={item.source_date}
                    mode="date"
                    onChange={onChangeSourceDate}
                  />
                )}
              </VStack>
              <VStack>
                <Text className="text-bold text-lg text-typography-500">EXPIRATION DATE</Text>
                <HStack className="flex flex-row items-center justify-between">
                  <Input
                    className="mt-2 w-11/12"
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}>
                    <InputField>
                      {item.expiration_date
                        ? item.expiration_date.toDateString()
                        : 'No expiration date'}
                    </InputField>
                  </Input>
                  <VStack>
                    <Pressable onPress={() => setShowExpirationDate(true)}>
                      <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
                    </Pressable>
                    {item.expiration_date && (
                      <Pressable onPress={clearExpirationDate}>
                        <Text className="mt-1 text-xs text-error-600">Clear</Text>
                      </Pressable>
                    )}
                  </VStack>
                </HStack>
                {showExpirationDate && (
                  <DateTimePicker
                    value={item.expiration_date || new Date()}
                    mode="date"
                    onChange={onChangeExpirationDate}
                  />
                )}
              </VStack>
              {item.type === 'Syringe' && (
                <>
                  <FormControl>
                    <FormControlLabel>
                      <FormControlLabelText className=" text-lg font-normal text-typography-500">
                        SYRINGE TYPE
                      </FormControlLabelText>
                    </FormControlLabel>
                    <Select onValueChange={handleItemChange('syringe_type')}>
                      <SelectTrigger variant="underlined" size="xl">
                        <SelectInput className="ml-3" value={item.syringe_type} />
                        <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          <SelectItem label="Spore" value="Spore" />
                          <SelectItem label="Liquid Culture" value="Liquid Culture" />
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  </FormControl>
                  <VStack>
                    <Text className="text-bold text-lg text-typography-500">VOLUME (ml)</Text>
                    <Input
                      isDisabled={false}
                      isInvalid={!syringeVolumeIsValid}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="decimal"
                        onChangeText={handleItemChange('volume_ml')}
                        value={
                          item.volume_ml && item.volume_ml >= 0 ? item.volume_ml.toString() : ''
                        }
                      />
                      <InputIcon as={FlaskConical} size="xl" className="ml-auto mr-4" />
                    </Input>
                    {!syringeVolumeIsValid && (
                      <Text className="mt-2 text-error-600">Please enter syringe volume</Text>
                    )}
                  </VStack>
                  <VStack>
                    <Text className="text-bold text-lg text-typography-500">SPECIES</Text>
                    <Input
                      isDisabled={false}
                      isInvalid={false}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="text"
                        onChangeText={handleItemChange('species')}
                        value={item.species}
                      />
                    </Input>
                  </VStack>
                  <VStack>
                    <Text className="text-bold text-lg text-typography-500">VARIANT</Text>
                    <Input
                      isDisabled={false}
                      isInvalid={false}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="text"
                        onChangeText={handleItemChange('variant')}
                        value={item.variant}
                      />
                    </Input>
                  </VStack>
                </>
              )}
              {item.type === 'Spawn' && (
                <>
                  <VStack>
                    <Text className="text-bold text-lg text-typography-500">SPAWN SUBSTRATE</Text>
                    <Input
                      isDisabled={false}
                      isInvalid={false}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="text"
                        onChangeText={handleItemChange('spawn_type')}
                        value={item.spawn_type}
                      />
                    </Input>
                  </VStack>
                  <VStack>
                    <Text className="text-bold text-lg text-typography-500">AMOUNT (lbs)</Text>
                    <Input
                      isDisabled={false}
                      isInvalid={!spawnAmountIsValid}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="decimal"
                        onChangeText={handleItemChange('amount_lbs')}
                        value={
                          item.amount_lbs && item.amount_lbs >= 0 ? item.amount_lbs.toString() : ''
                        }
                      />
                    </Input>
                    {!spawnAmountIsValid && (
                      <Text className="mt-2 text-error-600">Please enter spawn amount</Text>
                    )}
                  </VStack>
                </>
              )}
              {item.type === 'Bulk' && (
                <>
                  <VStack>
                    <Text className="text-bold mt-5 text-lg text-typography-500">
                      BULK SUBSTRATE
                    </Text>
                    <Input
                      isDisabled={false}
                      isInvalid={false}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="text"
                        onChangeText={handleItemChange('bulk_type')}
                        value={item.bulk_type}
                      />
                    </Input>
                  </VStack>
                  <VStack>
                    <Text className="text-bold text-lg text-typography-500">AMOUNT (lbs)</Text>
                    <Input
                      isDisabled={false}
                      isInvalid={!bulkAmountIsValid}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="decimal"
                        onChangeText={handleItemChange('amount_lbs')}
                        value={
                          item.amount_lbs && item.amount_lbs >= 0 ? item.amount_lbs?.toString() : ''
                        }
                      />
                    </Input>
                    {!bulkAmountIsValid && (
                      <Text className="mt-2 text-error-600">Please enter bulk amount</Text>
                    )}
                  </VStack>
                </>
              )}
              <VStack>
                <Text className="text-bold text-lg text-typography-500">NOTES</Text>
                <Textarea className="mt-2">
                  <TextareaInput
                    textAlignVertical="top"
                    className="mx-1"
                    onChangeText={handleItemChange('notes')}
                  />
                </Textarea>
              </VStack>
            </Card>
            <Center className="mt-4">
              <SaveInventoryItemButton title="Save" newItem={!itemArg} />
              {itemArg && <DeleteInventoryItemButton title="Delete" />}
            </Center>
          </ScrollView>
        </VStack>
      </Box>
    </>
  );
};
