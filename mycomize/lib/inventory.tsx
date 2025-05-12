import { ScrollView } from 'react-native';
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
  expiration_date: Date;
  cost: number;
  notes: string;
}

export type SyringeItem = InventoryItem & {
  syringe_type: string;
  volume_ml: number;
  species: string;
  variant: string;
};

export type SpawnItem = InventoryItem & {
  spawn_type: string;
  amount_lbs: number;
};

export type BulkItem = InventoryItem & {
  bulk_type: string;
  amount_lbs: number;
};

export interface SaveInventoryItemButtonProps {
  title: string;
  item: InventoryItem;
  newItem: boolean;
  setTypeIsValid: (isValid: boolean) => void;
  setSyringeVolumeIsValid: (isValid: boolean) => void;
  setSpawnAmountIsValid: (isValid: boolean) => void;
  setBulkAmountIsValid: (isValid: boolean) => void;
}

export interface InventoryFormProps {
  item: InventoryItem | null;
}

export async function getInventoryItem(id: number, type: string, token: string | null | undefined) {
  type = type.toLowerCase();
  const url = `${getBackendUrl()}/inventory/${type}/${id}`;

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

const SaveInventoryItemButton: React.FC<SaveInventoryItemButtonProps> = ({
  title,
  item,
  newItem,
  setTypeIsValid,
  setSyringeVolumeIsValid,
  setSpawnAmountIsValid,
  setBulkAmountIsValid,
}) => {
  const router = useRouter();
  const { token } = useContext(AuthContext);

  const handleSave = async () => {
    const itemType = item.type;
    let validData = true;

    if (!validateItemType(itemType)) {
      console.error('Invalid item type:', itemType);
      console.error('New item:', newItem);
      setTypeIsValid(false);
      validData = false;
    }

    if (itemType === 'Syringe') {
      if (!(item as SyringeItem).volume_ml || (item as SyringeItem).volume_ml <= 0) {
        setSyringeVolumeIsValid(false);
        validData = false;
      }
    } else if (itemType === 'Spawn') {
      if (!(item as SpawnItem).amount_lbs || (item as SpawnItem).amount_lbs <= 0) {
        setSpawnAmountIsValid(false);
        validData = false;
      }
    } else if (itemType === 'Bulk') {
      if (!(item as BulkItem).amount_lbs || (item as BulkItem).amount_lbs <= 0) {
        setBulkAmountIsValid(false);
        validData = false;
      }
    }

    if (!validData) {
      return;
    }

    try {
      let url = '';

      if (newItem) {
        url = `${getBackendUrl()}/inventory/${itemType.toLowerCase()}`;
      } else {
        url = `${getBackendUrl()}/inventory/${itemType.toLowerCase()}/${item.id}`;
      }

      const response = await fetch(url, {
        method: 'PUT',
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
        router.replace('/inventory');
      }
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  return (
    <>
      <Button
        variant="solid"
        className="absolute bottom-0 z-50 mb-4 h-12 w-11/12 rounded-md shadow-lg shadow-background-700"
        action="positive"
        onPress={handleSave}>
        <ButtonText className="text-lg font-bold">{title}</ButtonText>
      </Button>
    </>
  );
};

export const InventoryForm: React.FC<InventoryFormProps> = ({ item }) => {
  // Common state

  const [itemType, setItemType] = useState<'Syringe' | 'Spawn' | 'Bulk' | ''>('');
  const [vendor, setVendor] = useState('');
  const [cost, setCost] = useState(0.0);
  const [sourceDate, setSourceDate] = useState(new Date());
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  // Syringe-specific state
  const [syringeType, setSyringeType] = useState('');
  const [syringeVolume, setSyringeVolume] = useState(0.0);
  const [syringeSpecies, setSyringeSpecies] = useState('');
  const [syringeVariant, setSyringeVariant] = useState('');

  // Spawn-specific state
  const [spawnSubstrate, setSpawnSubstrate] = useState('');
  const [spawnAmount, setSpawnAmount] = useState(0.0);

  // Bulk-specific state
  const [bulkSubstrate, setBulkSubstrate] = useState('');
  const [bulkAmount, setBulkAmount] = useState(0.0);

  // Common date fields
  const [showSourceDate, setShowSourceDate] = useState(false);
  const [showExpirationDate, setShowExpirationDate] = useState(false);

  const [typeIsValid, setTypeIsValid] = useState(true);
  const [syringeVolumeIsValid, setSyringeVolumeIsValid] = useState(true);
  const [spawnAmountIsValid, setSpawnAmountIsValid] = useState(true);
  const [bulkAmountIsValid, setBulkAmountIsValid] = useState(true);

  useEffect(() => {
    if (item?.type) {
      setItemType(item.type as 'Syringe' | 'Spawn' | 'Bulk');
    }

    if (item?.source) {
      setVendor(item.source);
    }

    if (item?.cost) {
      setCost(item.cost);
    }

    if (item?.source_date) {
      setSourceDate(new Date(item.source_date));
    }

    if (item?.expiration_date) {
      setExpirationDate(new Date(item.expiration_date));
    }

    if (item?.notes) {
      setNotes(item.notes);
    }

    if (item?.type === 'Syringe') {
      setSyringeType((item as SyringeItem)?.syringe_type);
      setSyringeVolume((item as SyringeItem)?.volume_ml);
      setSyringeSpecies((item as SyringeItem)?.species);
      setSyringeVariant((item as SyringeItem)?.variant);
    } else if (item?.type === 'Spawn') {
      setSpawnSubstrate((item as SpawnItem)?.spawn_type);
      setSpawnAmount((item as SpawnItem)?.amount_lbs);
    } else if (item?.type === 'Bulk') {
      setBulkSubstrate((item as BulkItem)?.bulk_type);
      setBulkAmount((item as BulkItem)?.amount_lbs);
    }
  }, [item]);

  const onChangeSourceDate = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || sourceDate;

    setSourceDate(currentDate);
    setShowSourceDate(false);
  };

  const onChangeExpirationDate = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || expirationDate;

    setExpirationDate(currentDate);
    setShowExpirationDate(false);
  };

  const updateSyringeVolume = (value: string) => {
    const parsedValue = parseFloat(value);

    if (!isNaN(parsedValue) && parsedValue > 0) {
      setSyringeVolume(parsedValue);
      setSyringeVolumeIsValid(true);
    } else {
      setSyringeVolume(0.0);
      setSyringeVolumeIsValid(false);
    }
  };

  const updateSpawnAmount = (value: string) => {
    const parsedValue = parseFloat(value);

    if (!isNaN(parsedValue) && parsedValue > 0) {
      setSpawnAmount(parsedValue);
      setSpawnAmountIsValid(true);
    } else {
      setSpawnAmount(0.0);
      setSpawnAmountIsValid(false);
    }
  };

  const updateBulkAmount = (value: string) => {
    const parsedValue = parseFloat(value);

    if (!isNaN(parsedValue) && parsedValue > 0) {
      setBulkAmount(parsedValue);
      setBulkAmountIsValid(true);
    } else {
      setBulkAmount(0.0);
      setBulkAmountIsValid(false);
    }
  };

  const handleChangeInventoryType = (value: string) => {
    if (value === 'Syringe') {
      setItemType('Syringe');
      setTypeIsValid(true);
    } else if (value === 'Spawn') {
      setItemType('Spawn');
      setTypeIsValid(true);
    } else if (value === 'Bulk') {
      setItemType('Bulk');
      setTypeIsValid(true);
    } else {
      setItemType('');
    }
  };

  const createItem = (oldItem: InventoryItem | null): InventoryItem => {
    const newItem: InventoryItem = {
      type: itemType,
      id: oldItem ? oldItem.id : 0,
      source: vendor,
      source_date: sourceDate,
      expiration_date: expirationDate,
      cost: cost,
      notes: notes,
    };

    if (newItem.type === 'Syringe') {
      console.log('Syringe item:', newItem);
      return {
        ...item,
        syringe_type: syringeType,
        volume_ml: syringeVolume,
        species: syringeSpecies,
        variant: syringeVariant,
      } as SyringeItem;
    } else if (newItem.type === 'Spawn') {
      console.log('Spawn item:', newItem);
      return {
        ...item,
        spawn_type: spawnSubstrate,
        amount_lbs: spawnAmount,
      } as SpawnItem;
    } else if (newItem.type === 'Bulk') {
      console.log('Bulk item:', newItem);
      return {
        ...item,
        bulk_type: bulkSubstrate,
        amount_lbs: bulkAmount,
      } as BulkItem;
    }

    return newItem;
  };

  const setCostString = () => {
    const parsedValue = parseFloat(cost.toString());
    if (!isNaN(parsedValue) && parsedValue > 0) {
      return parsedValue.toString();
    } else {
      return '';
    }
  };

  const setSyringeVolumeString = () => {
    const parsedValue = parseFloat(syringeVolume.toString());
    if (!isNaN(parsedValue) && parsedValue > 0) {
      return parsedValue.toString();
    } else {
      return '';
    }
  };

  const setSpawnAmountString = () => {
    const parsedValue = parseFloat(spawnAmount.toString());
    if (!isNaN(parsedValue) && parsedValue > 0) {
      return parsedValue.toString();
    } else {
      return '';
    }
  };

  const setBulkAmountString = () => {
    const parsedValue = parseFloat(bulkAmount.toString());
    if (!isNaN(parsedValue) && parsedValue > 0) {
      return parsedValue.toString();
    } else {
      return '';
    }
  };

  return (
    <>
      <VStack className="mt-4 flex-1 items-center">
        <ScrollView className="w-full">
          <Card className="mx-auto mb-24 w-11/12 gap-4 shadow-lg shadow-background-700">
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className="text-lg font-normal text-typography-500">
                  TYPE
                </FormControlLabelText>
              </FormControlLabel>
              <Select isInvalid={!typeIsValid} onValueChange={handleChangeInventoryType}>
                <SelectTrigger variant="underlined" size="xl">
                  <SelectInput className="ml-3 placeholder:text-typography-300" value={itemType} />
                  <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
                </SelectTrigger>
                {!typeIsValid && (
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
                className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                <InputField
                  autoCapitalize="none"
                  inputMode="text"
                  onChangeText={(value) => setVendor(value)}
                  value={vendor}
                />
                <InputIcon as={Building2} size="xl" className="ml-auto mr-4" />
              </Input>
            </VStack>
            <VStack>
              <Text className="text-bold text-lg text-typography-500">COST</Text>
              <Input
                isDisabled={false}
                isInvalid={false}
                isReadOnly={false}
                variant="underlined"
                size="xl"
                className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                <InputField
                  placeholder="Enter cost"
                  autoCapitalize="none"
                  inputMode="decimal"
                  onChangeText={(value) => setCost(parseFloat(value))}
                  className="placeholder:text-typography-300"
                  value={setCostString()}
                />
                <InputIcon as={DollarSign} size="xl" className="ml-auto mr-4" />
              </Input>
            </VStack>
            <VStack>
              <Text className="text-bold  text-lg text-typography-500">SOURCE DATE</Text>
              <HStack className="flex flex-row items-center justify-between">
                <Input
                  className="mt-2 w-11/12 data-[focus=true]:border-success-400"
                  isDisabled={false}
                  isInvalid={false}
                  isReadOnly={false}>
                  <InputField>{sourceDate.toDateString()}</InputField>
                </Input>
                <Pressable onPress={() => setShowSourceDate(true)}>
                  <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
                </Pressable>
              </HStack>
              {showSourceDate && (
                <DateTimePicker value={sourceDate} mode="date" onChange={onChangeSourceDate} />
              )}
            </VStack>
            <VStack>
              <Text className="text-bold text-lg text-typography-500">EXPIRATION DATE</Text>
              <HStack className="flex flex-row items-center justify-between">
                <Input
                  className="mt-2 w-11/12 data-[focus=true]:border-success-400"
                  isDisabled={false}
                  isInvalid={false}
                  isReadOnly={false}>
                  <InputField>{expirationDate.toDateString()}</InputField>
                </Input>
                <Pressable onPress={() => setShowExpirationDate(true)}>
                  <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
                </Pressable>
              </HStack>
              {showExpirationDate && (
                <DateTimePicker
                  value={expirationDate}
                  mode="date"
                  onChange={onChangeExpirationDate}
                />
              )}
            </VStack>
            {itemType === 'Syringe' && (
              <>
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText className=" text-lg font-normal text-typography-500">
                      SYRINGE TYPE
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Select onValueChange={(value) => setSyringeType(value)}>
                    <SelectTrigger variant="underlined" size="xl">
                      <SelectInput
                        className="ml-3 placeholder:text-typography-300"
                        placeholder="Select syringe type"
                        value={syringeType}
                      />
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
                    className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                    <InputField
                      placeholder="Enter volume"
                      autoCapitalize="none"
                      inputMode="decimal"
                      onChangeText={(value) => updateSyringeVolume(value)}
                      className="placeholder:text-typography-300"
                      value={setSyringeVolumeString()}
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
                    className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                    <InputField
                      placeholder="Enter species"
                      autoCapitalize="none"
                      inputMode="text"
                      onChangeText={(value) => {
                        setSyringeSpecies(value);
                      }}
                      className="placeholder:text-typography-300"
                      value={syringeSpecies}
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
                    className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                    <InputField
                      placeholder="Enter strain/variant"
                      autoCapitalize="none"
                      inputMode="text"
                      onChangeText={(value) => {
                        setSyringeVariant(value);
                      }}
                      className="placeholder:text-typography-300"
                      value={syringeVariant}
                    />
                  </Input>
                </VStack>
              </>
            )}
            {itemType === 'Spawn' && (
              <>
                <VStack>
                  <Text className="text-bold text-lg text-typography-500">SPAWN SUBSTRATE</Text>
                  <Input
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}
                    variant="underlined"
                    size="xl"
                    className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                    <InputField
                      placeholder="Enter spawn type"
                      autoCapitalize="none"
                      inputMode="text"
                      onChangeText={(value) => {
                        setSpawnSubstrate(value);
                      }}
                      className="placeholder:text-typography-300"
                      value={spawnSubstrate}
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
                    className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                    <InputField
                      placeholder="Enter spawn amount"
                      autoCapitalize="none"
                      inputMode="decimal"
                      onChangeText={(value) => updateSpawnAmount(value)}
                      className="placeholder:text-typography-300"
                      value={setSpawnAmountString()}
                    />
                  </Input>
                  {!spawnAmountIsValid && (
                    <Text className="mt-2 text-error-600">Please enter spawn amount</Text>
                  )}
                </VStack>
              </>
            )}
            {itemType === 'Bulk' && (
              <>
                <VStack>
                  <Text className="text-bold mt-5 text-lg text-typography-500">BULK SUBSTRATE</Text>
                  <Input
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}
                    variant="underlined"
                    size="xl"
                    className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                    <InputField
                      placeholder="Enter bulk substrate type"
                      autoCapitalize="none"
                      inputMode="text"
                      onChangeText={(value) => {
                        setBulkSubstrate(value);
                      }}
                      className="placeholder:text-typography-300"
                      value={bulkSubstrate}
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
                    className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                    <InputField
                      placeholder="Enter bulk amount"
                      autoCapitalize="none"
                      inputMode="decimal"
                      onChangeText={(value) => updateBulkAmount(value)}
                      className="placeholder:text-typography-300"
                      value={setBulkAmountString()}
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
              <Textarea className="mt-2 data-[focus=true]:border-success-400">
                <TextareaInput
                  textAlignVertical="top"
                  className="mx-1"
                  onChangeText={(value) => {
                    setNotes(value);
                  }}
                />
              </Textarea>
            </VStack>
          </Card>
        </ScrollView>
        <SaveInventoryItemButton
          title="Save"
          item={createItem(item)}
          newItem={!item}
          setTypeIsValid={setTypeIsValid}
          setSyringeVolumeIsValid={setSyringeVolumeIsValid}
          setSpawnAmountIsValid={setSpawnAmountIsValid}
          setBulkAmountIsValid={setBulkAmountIsValid}
        />
      </VStack>
    </>
  );
};
