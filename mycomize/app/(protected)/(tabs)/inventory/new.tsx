import { useState } from 'react';
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
import { InventoryItem, SyringeItem, SpawnItem, BulkItem } from '~/lib/inventory';
import { AuthContext } from '~/lib/AuthContext';
import { useContext } from 'react';
import { useRouter } from 'expo-router';

interface SaveItemButtonProps {
  title: string;
  item: InventoryItem;
}

const SaveItemButton: React.FC<SaveItemButtonProps> = ({ title, item }) => {
  const router = useRouter();
  const { token } = useContext(AuthContext);

  const handleSave = async () => {
    const itemType = item.type;
    try {
      let url = '';

      if (itemType === 'Syringe') {
        url = `${getBackendUrl()}/inventory/syringe`;
      } else if (itemType === 'Spawn') {
        url = `${getBackendUrl()}/inventory/spawn`;
      } else if (itemType === 'Bulk') {
        url = `${getBackendUrl()}/inventory/bulk`;
      }

      const response = await fetch(url, {
        method: 'POST',
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
        const data = await response.json();
        console.log('Item saved successfully:', data);
      }
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  return (
    <>
      <Button
        variant="solid"
        className="absolute bottom-0 z-50 mb-3 ml-5 h-12 w-11/12 rounded-md shadow-lg shadow-background-700"
        action="positive"
        onPress={handleSave}>
        <ButtonText className="text-lg font-bold">{title}</ButtonText>
      </Button>
    </>
  );
};

export default function NewInventoryScreen() {
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

  const handleChangeInventoryType = (value: string) => {
    if (value === 'Syringe') {
      setItemType('Syringe');
    } else if (value === 'Spawn') {
      setItemType('Spawn');
    } else if (value === 'Bulk') {
      setItemType('Bulk');
    } else {
      setItemType('');
    }
  };

  const createItem = (): InventoryItem => {
    const item: InventoryItem = {
      type: itemType,
      id: 0, // Placeholder ID, will be set by the backend
      source: vendor,
      source_date: sourceDate,
      expiration_date: expirationDate,
      cost: cost,
      notes: notes,
    };

    if (item.type === 'Syringe') {
      return {
        ...item,
        syringe_type: syringeType,
        volume_ml: syringeVolume,
        species: syringeSpecies,
        variant: syringeVariant,
      } as SyringeItem;
    } else if (item.type === 'Spawn') {
      return {
        ...item,
        spawn_type: spawnSubstrate,
        amount_lbs: spawnAmount,
      } as SpawnItem;
    } else if (item.type === 'Bulk') {
      return {
        ...item,
        bulk_type: bulkSubstrate,
        amount_lbs: bulkAmount,
      } as BulkItem;
    }

    return item;
  };

  return (
    <>
      <ScrollView>
        <VStack className="mb-20 mt-8 flex-1 items-center">
          <Card className=" w-11/12 shadow-md">
            <FormControl isRequired>
              <FormControlLabel>
                <FormControlLabelText className=" text-lg text-typography-600">
                  TYPE
                </FormControlLabelText>
              </FormControlLabel>
              <Select onValueChange={handleChangeInventoryType}>
                <SelectTrigger variant="underlined" size="xl">
                  <SelectInput
                    className="placeholder-italic ml-3"
                    placeholder="Select inventory type"
                  />
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
            <Text className="text-bold mt-5 text-lg text-typography-700">VENDOR</Text>
            <Input
              isDisabled={false}
              isInvalid={false}
              isReadOnly={false}
              variant="underlined"
              size="xl"
              className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
              <InputField
                placeholder="Enter source/vendor"
                autoCapitalize="none"
                inputMode="text"
                onChangeText={(value) => setVendor(value)}
              />
              <InputIcon as={Building2} size="xl" className="ml-auto mr-4" />
            </Input>
            <Text className="text-bold mt-5 text-lg text-typography-700">COST</Text>
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
              />
              <InputIcon as={DollarSign} size="xl" className="ml-auto mr-4" />
            </Input>
            <Text className="text-bold mb-2 mt-5 text-lg text-typography-700">SOURCE DATE</Text>
            <HStack className="flex flex-row">
              <Input
                className="flex-grow data-[focus=true]:border-success-400"
                isDisabled={false}
                isInvalid={false}
                isReadOnly={false}>
                <InputField>{sourceDate.toDateString()}</InputField>
              </Input>
              <Pressable onPress={() => setShowSourceDate(true)}>
                <Icon as={CalendarDays} size="xl" className="ml-4 mr-1 mt-2 text-typography-400" />
              </Pressable>
            </HStack>
            {showSourceDate && (
              <DateTimePicker value={sourceDate} mode="date" onChange={onChangeSourceDate} />
            )}
            <Text className="text-bold mb-2 mt-5 text-lg text-typography-700">EXPIRATION DATE</Text>
            <HStack className="flex  flex-row">
              <Input
                className="flex-grow data-[focus=true]:border-success-400"
                isDisabled={false}
                isInvalid={false}
                isReadOnly={false}>
                <InputField>{expirationDate.toDateString()}</InputField>
              </Input>
              <Pressable onPress={() => setShowExpirationDate(true)}>
                <Icon as={CalendarDays} size="xl" className="ml-4 mr-1 mt-2 text-typography-400" />
              </Pressable>
            </HStack>
            {showExpirationDate && (
              <DateTimePicker
                value={expirationDate}
                mode="date"
                onChange={onChangeExpirationDate}
              />
            )}
            {itemType === 'Syringe' && (
              <>
                <FormControl isRequired className="mt-5">
                  <FormControlLabel>
                    <FormControlLabelText className=" text-lg text-typography-600">
                      SYRINGE TYPE
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Select onValueChange={(value) => setSyringeType(value)}>
                    <SelectTrigger variant="underlined" size="xl">
                      <SelectInput className="placeholder-italic ml-3" placeholder="Select type" />
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
                <Text className="text-bold mt-5 text-lg text-typography-700">VOLUME (ml)</Text>
                <Input
                  isDisabled={false}
                  isInvalid={false}
                  isReadOnly={false}
                  variant="underlined"
                  size="xl"
                  className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                  <InputField
                    placeholder="Enter volume"
                    autoCapitalize="none"
                    inputMode="decimal"
                    onChangeText={(value) => setSyringeVolume(parseFloat(value))}
                  />
                  <InputIcon as={FlaskConical} size="xl" className="ml-auto mr-4" />
                </Input>
                <Text className="text-bold mt-5 text-lg text-typography-700">SPECIES</Text>
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
                  />
                </Input>
                <Text className="text-bold mt-5 text-lg text-typography-700">VARIANT</Text>
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
                  />
                </Input>
              </>
            )}
            {itemType === 'Spawn' && (
              <>
                <Text className="text-bold mt-5 text-lg text-typography-700">SPAWN SUBSTRATE</Text>
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
                  />
                </Input>
                <Text className="text-bold mt-5 text-lg text-typography-700">AMOUNT (lbs)</Text>
                <Input
                  isDisabled={false}
                  isInvalid={false}
                  isReadOnly={false}
                  variant="underlined"
                  size="xl"
                  className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                  <InputField
                    placeholder="Enter spawn amount"
                    autoCapitalize="none"
                    inputMode="decimal"
                    onChangeText={(value) => {
                      setSpawnAmount(parseFloat(value));
                    }}
                  />
                </Input>
              </>
            )}
            {itemType === 'Bulk' && (
              <>
                <Text className="text-bold mt-5 text-lg text-typography-700">BULK SUBSTRATE</Text>
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
                  />
                </Input>
                <Text className="text-bold mt-5 text-lg text-typography-700">AMOUNT (lbs)</Text>
                <Input
                  isDisabled={false}
                  isInvalid={false}
                  isReadOnly={false}
                  variant="underlined"
                  size="xl"
                  className="pl-3 data-[focus=true]:border-b data-[focus=true]:border-success-400">
                  <InputField
                    placeholder="Enter bulk amount"
                    autoCapitalize="none"
                    inputMode="decimal"
                    onChangeText={(value) => {
                      setBulkAmount(parseFloat(value));
                    }}
                  />
                </Input>
              </>
            )}
            <Text className="text-bold mt-5 text-lg text-typography-700">NOTES</Text>
            <Textarea className="ml-0 data-[focus=true]:border-success-400">
              <TextareaInput
                textAlignVertical="top"
                className="mx-1"
                onChangeText={(value) => {
                  setNotes(value);
                }}
              />
            </Textarea>
          </Card>
        </VStack>
      </ScrollView>
      <SaveItemButton title="Save" item={createItem()} />
    </>
  );
}
