import { ScrollView, Keyboard } from 'react-native';
import {
  ChevronDown,
  Sprout,
  Leaf,
  CalendarDays,
  Scale,
  AlertCircle,
  FlaskConical,
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
import { Switch } from '~/components/ui/switch';

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
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { useRouter } from 'expo-router';
import { InventoryItem } from '~/lib/inventory';
import { IoTGateway } from '~/lib/iot';

export interface Grow {
  id: number;
  species: string;
  variant: string;
  tek: string;
  stage: string;
  status: string;
  cost: number;
  notes: string;
  inoculationDate: Date | null;
  harvestDate: Date | null;
  harvestDryWeight: number;
  harvestWetWeight: number;
  age: number;
  inventoryList: InventoryItem[];
  iotGatewayList: IoTGateway[];
}

// Grow tek options - must match backend enum values
export const growTeks = {
  MONOTUB: 'Monotub',
};

// Human-readable tek names
export const tekLabels = {
  [growTeks.MONOTUB]: 'Monotub',
};

// Grow status options - must match backend enum values
export const growStatuses = {
  GROWING: 'growing',
  CONTAMINATED: 'contaminated',
  HARVESTED: 'harvested',
};

// Human-readable status names
export const statusLabels = {
  [growStatuses.GROWING]: 'Growing',
  [growStatuses.CONTAMINATED]: 'Contaminated',
  [growStatuses.HARVESTED]: 'Harvested',
};

// Grow stage options - must match backend enum values
export const growStages = {
  SPAWN_COLONIZATION: 'spawn_colonization',
  BULK_COLONIZATION: 'bulk_colonization',
  FRUITING: 'fruiting',
  HARVEST: 'harvest',
};

// Human-readable stage names
export const stageLabels = {
  [growStages.SPAWN_COLONIZATION]: 'Spawn Colonization',
  [growStages.BULK_COLONIZATION]: 'Bulk Colonization',
  [growStages.FRUITING]: 'Fruiting',
  [growStages.HARVEST]: 'Harvest',
};

export interface SaveGrowButtonProps {
  title: string;
  newGrow: boolean;
}

export interface DeleteGrowButtonProps {
  title: string;
}

export interface GrowFormProps {
  growArg: Grow | null;
}

export async function getGrow(id: number, token: string | null | undefined) {
  const url = `${getBackendUrl()}/grows/${id}`;

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
    console.error('Error calling getGrow:', error);
    return null;
  }
}

const validateGrowTek = (tek: string) => {
  const validTeks = ['Monotub'];
  return validTeks.includes(tek);
};

function getSwitchColors(theme: string) {
  let track_false_color = '';
  let track_true_color = '';

  if (theme === 'light') {
    track_false_color = 'rgb(157, 157, 157)';
    track_true_color = 'rgb(110, 150, 242)';
  } else if (theme === 'dark') {
    track_false_color = 'rgb(153, 153, 153)';
    track_true_color = 'rgb(110, 150, 242)';
  }

  return {
    trackFalse: track_false_color,
    trackTrue: track_true_color,
    thumbColor: 'rgb(255, 255, 255)',
  };
}

interface ContaminatedSwitchProps {
  value: boolean;
  onToggle: (value: boolean) => void;
}

const ContaminatedSwitch: React.FC<ContaminatedSwitchProps> = ({ value, onToggle }) => {
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);

  return (
    <Switch
      trackColor={{ false: trackFalse, true: trackTrue }}
      thumbColor={thumbColor}
      ios_backgroundColor={trackFalse}
      value={value}
      onToggle={onToggle}
      className="ml-auto mr-0"
    />
  );
};

export const GrowForm: React.FC<GrowFormProps> = ({ growArg }) => {
  // Date pickers
  const [showInoculationDate, setShowInoculationDate] = useState(false);
  const [showHarvestDate, setShowHarvestDate] = useState(false);

  // Validation states
  const [growTekIsValid, setGrowTekIsValid] = useState(true);
  const [speciesIsValid, setSpeciesIsValid] = useState(true);
  const [variantIsValid, setVariantIsValid] = useState(true);
  const [harvestDryWeightIsValid, setHarvestDryWeightIsValid] = useState(true);
  const [harvestWetWeightIsValid, setHarvestWetWeightIsValid] = useState(true);

  // Grow state
  const [grow, setGrow] = useState<Grow>({
    id: 0,
    species: '',
    variant: '',
    tek: growTeks.MONOTUB,
    stage: growStages.SPAWN_COLONIZATION,
    status: growStatuses.GROWING,
    cost: 0,
    notes: '',
    inoculationDate: new Date(),
    harvestDate: null,
    harvestDryWeight: 0,
    harvestWetWeight: 0,
    age: 0,
    inventoryList: [],
    iotGatewayList: [],
  });

  const handleGrowChange =
    <K extends keyof Grow>(key: K) =>
    (value: any) => {
      setGrow((prevGrow) => ({
        ...prevGrow,
        [key]: value,
      }));
    };

  useEffect(() => {
    if (growArg) {
      setGrow({
        id: growArg.id || 0,
        species: growArg.species || '',
        variant: growArg.variant || '',
        tek: growArg.tek || growTeks.MONOTUB,
        stage: growArg.stage || growStages.SPAWN_COLONIZATION,
        status: growArg.status || growStatuses.GROWING,
        cost: growArg.cost || 0,
        notes: growArg.notes || '',
        inoculationDate: growArg.inoculationDate ? new Date(growArg.inoculationDate) : new Date(),
        harvestDate: growArg.harvestDate ? new Date(growArg.harvestDate) : null,
        harvestDryWeight: growArg.harvestDryWeight || 0,
        harvestWetWeight: growArg.harvestWetWeight || 0,
        age: growArg.age || 0,
        inventoryList: growArg.inventoryList || [],
        iotGatewayList: growArg.iotGatewayList || [],
      });
    }
  }, [growArg]);

  const onChangeInoculationDate = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || grow.inoculationDate;
    handleGrowChange('inoculationDate')(currentDate);
    setShowInoculationDate(false);
  };

  const onChangeHarvestDate = (event: any, selectedDate: Date | undefined) => {
    // If user cancels or selects an invalid date, keep the current value
    if (event.type === 'dismissed') {
      setShowHarvestDate(false);
      return;
    }

    // Update the harvest date (can be null)
    handleGrowChange('harvestDate')(selectedDate);
    setShowHarvestDate(false);
  };

  const clearHarvestDate = () => {
    handleGrowChange('harvestDate')(null);
  };

  const handleChangeGrowTek = (value: string) => {
    if (validateGrowTek(value)) {
      handleGrowChange('tek')(value);
      setGrowTekIsValid(true);
    } else {
      setGrowTekIsValid(false);
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

  const SaveGrowButton: React.FC<SaveGrowButtonProps> = ({ title, newGrow }) => {
    const router = useRouter();
    const { token } = useContext(AuthContext);

    // Hide the button when keyboard is visible
    if (keyboardVisible) {
      return null;
    }

    const handleSave = async () => {
      let validData = true;

      if (!grow.species || grow.species.trim() === '') {
        setSpeciesIsValid(false);
        validData = false;
      }

      if (!grow.variant || grow.variant.trim() === '') {
        setVariantIsValid(false);
        validData = false;
      }

      if (!validateGrowTek(grow.tek)) {
        setGrowTekIsValid(false);
        validData = false;
      }

      if (grow.harvestDate) {
        if (isNaN(parseFloat(grow.harvestDryWeight?.toString()))) {
          setHarvestDryWeightIsValid(false);
          validData = false;
        }

        if (isNaN(parseFloat(grow.harvestWetWeight?.toString()))) {
          setHarvestWetWeightIsValid(false);
          validData = false;
        }
      }

      if (!validData) {
        return;
      }

      try {
        let url = '';
        let method = '';

        if (newGrow) {
          url = `${getBackendUrl()}/grows`;
          method = 'POST';
        } else {
          url = `${getBackendUrl()}/grows/${grow.id}`;
          method = 'PUT';
        }

        // Convert to backend format
        const growData = {
          species: grow.species,
          variant: grow.variant,
          tek: grow.tek,
          stage: grow.stage,
          status: grow.status,
          notes: grow.notes,
          cost: grow.cost,
          inoculation_date: grow.inoculationDate?.toISOString().split('T')[0],
          harvest_date: grow.harvestDate?.toISOString().split('T')[0] || null,
          harvest_dry_weight_grams: grow.harvestDryWeight,
          harvest_wet_weight_grams: grow.harvestWetWeight,
        };

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(growData),
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
        console.error('Error saving grow:', error);
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

  const DeleteGrowButton: React.FC<DeleteGrowButtonProps> = ({ title }) => {
    const router = useRouter();
    const { token } = useContext(AuthContext);

    if (keyboardVisible) {
      return null;
    }

    const handleDelete = async () => {
      try {
        const url = `${getBackendUrl()}/grows/${grow.id}`;
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
            console.error('Error deleting grow:', errorData);
            router.back();
          }
        } else {
          router.back();
        }
      } catch (error) {
        console.error('Error deleting grow:', error);
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
                    GROW TEK
                  </FormControlLabelText>
                </FormControlLabel>
                <Select
                  isInvalid={!growTekIsValid}
                  selectedValue={grow.tek}
                  onValueChange={handleChangeGrowTek}>
                  <SelectTrigger variant="underlined" size="xl">
                    <SelectInput className="ml-3" value={tekLabels[grow.tek] || grow.tek} />
                    <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
                  </SelectTrigger>
                  {!growTekIsValid && (
                    <Text className="mt-2 text-error-600">Please select a valid grow tek</Text>
                  )}
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label="Monotub" value="Monotub" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </FormControl>

              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-lg font-normal text-typography-500">
                    GROW STAGE
                  </FormControlLabelText>
                </FormControlLabel>
                <Select selectedValue={grow.stage} onValueChange={handleGrowChange('stage')}>
                  <SelectTrigger variant="underlined" size="xl">
                    <SelectInput className="ml-3" value={stageLabels[grow.stage] || grow.stage} />
                    <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem
                        label={stageLabels[growStages.SPAWN_COLONIZATION]}
                        value={growStages.SPAWN_COLONIZATION}
                      />
                      <SelectItem
                        label={stageLabels[growStages.BULK_COLONIZATION]}
                        value={growStages.BULK_COLONIZATION}
                      />
                      <SelectItem
                        label={stageLabels[growStages.FRUITING]}
                        value={growStages.FRUITING}
                      />
                      <SelectItem
                        label={stageLabels[growStages.HARVEST]}
                        value={growStages.HARVEST}
                      />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </FormControl>

              <VStack>
                <Text className="text-bold text-lg text-typography-500">SPECIES</Text>
                <Input
                  isDisabled={false}
                  isInvalid={!speciesIsValid}
                  isReadOnly={false}
                  variant="underlined"
                  size="xl"
                  className="pl-3">
                  <InputField
                    autoCapitalize="none"
                    inputMode="text"
                    onChangeText={handleGrowChange('species')}
                    value={grow.species}
                  />
                </Input>
                {!speciesIsValid && (
                  <Text className="mt-2 text-error-600">Please enter a species</Text>
                )}
              </VStack>

              <VStack>
                <Text className="text-bold text-lg text-typography-500">VARIANT</Text>
                <Input
                  isDisabled={false}
                  isInvalid={!variantIsValid}
                  isReadOnly={false}
                  variant="underlined"
                  size="xl"
                  className="pl-3">
                  <InputField
                    autoCapitalize="none"
                    inputMode="text"
                    onChangeText={handleGrowChange('variant')}
                    value={grow.variant}
                  />
                </Input>
                {!variantIsValid && (
                  <Text className="mt-2 text-error-600">Please enter a variant</Text>
                )}
              </VStack>

              <VStack>
                <Text className="text-bold text-lg text-typography-500">INOCULATION DATE</Text>
                <HStack className="flex flex-row items-center justify-between">
                  <Input
                    className="mt-2 w-11/12"
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}>
                    <InputField>{grow.inoculationDate?.toDateString()}</InputField>
                  </Input>
                  <Pressable onPress={() => setShowInoculationDate(true)}>
                    <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
                  </Pressable>
                </HStack>
                {showInoculationDate && (
                  <DateTimePicker
                    value={grow.inoculationDate || new Date()}
                    mode="date"
                    onChange={onChangeInoculationDate}
                  />
                )}
              </VStack>

              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-lg font-normal text-typography-500">
                    STATUS
                  </FormControlLabelText>
                </FormControlLabel>
                <Select selectedValue={grow.status} onValueChange={handleGrowChange('status')}>
                  <SelectTrigger variant="underlined" size="xl">
                    <SelectInput
                      className="ml-3"
                      value={statusLabels[grow.status] || grow.status}
                    />
                    <SelectIcon className="ml-auto mr-3" as={ChevronDown}></SelectIcon>
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem
                        label={statusLabels[growStatuses.GROWING]}
                        value={growStatuses.GROWING}
                      />
                      <SelectItem
                        label={statusLabels[growStatuses.CONTAMINATED]}
                        value={growStatuses.CONTAMINATED}
                      />
                      <SelectItem
                        label={statusLabels[growStatuses.HARVESTED]}
                        value={growStatuses.HARVESTED}
                      />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </FormControl>

              <VStack>
                <Text className="text-bold text-lg text-typography-500">HARVEST DATE</Text>
                <HStack className="flex flex-row items-center justify-between">
                  <Input
                    className="mt-2 w-11/12"
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}>
                    <InputField>
                      {grow.harvestDate?.toDateString() || 'Not harvested yet'}
                    </InputField>
                  </Input>
                  <VStack>
                    <Pressable onPress={() => setShowHarvestDate(true)}>
                      <Icon as={CalendarDays} size="xl" className="mt-2 text-typography-400" />
                    </Pressable>
                    {grow.harvestDate && (
                      <Pressable onPress={clearHarvestDate}>
                        <Text className="mt-1 text-xs text-error-600">Clear</Text>
                      </Pressable>
                    )}
                  </VStack>
                </HStack>
                {showHarvestDate && (
                  <DateTimePicker
                    value={grow.harvestDate || new Date()}
                    mode="date"
                    onChange={onChangeHarvestDate}
                  />
                )}
              </VStack>

              {grow.harvestDate && (
                <>
                  <VStack>
                    <Text className="text-bold text-lg text-typography-500">DRY WEIGHT (g)</Text>
                    <Input
                      isDisabled={false}
                      isInvalid={!harvestDryWeightIsValid}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="decimal"
                        onChangeText={(text) =>
                          handleGrowChange('harvestDryWeight')(parseFloat(text) || 0)
                        }
                        value={grow.harvestDryWeight?.toString()}
                      />
                      <InputIcon as={Scale} size="xl" className="ml-auto mr-4" />
                    </Input>
                    {!harvestDryWeightIsValid && (
                      <Text className="mt-2 text-error-600">Please enter a valid dry weight</Text>
                    )}
                  </VStack>

                  <VStack>
                    <Text className="text-bold text-lg text-typography-500">WET WEIGHT (g)</Text>
                    <Input
                      isDisabled={false}
                      isInvalid={!harvestWetWeightIsValid}
                      isReadOnly={false}
                      variant="underlined"
                      size="xl"
                      className="pl-3">
                      <InputField
                        autoCapitalize="none"
                        inputMode="decimal"
                        onChangeText={(text) =>
                          handleGrowChange('harvestWetWeight')(parseFloat(text) || 0)
                        }
                        value={grow.harvestWetWeight?.toString()}
                      />
                      <InputIcon as={Scale} size="xl" className="ml-auto mr-4" />
                    </Input>
                    {!harvestWetWeightIsValid && (
                      <Text className="mt-2 text-error-600">Please enter a valid wet weight</Text>
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
                    onChangeText={handleGrowChange('notes')}
                    value={grow.notes}
                  />
                </Textarea>
              </VStack>
            </Card>
            <Center className="mt-4">
              <SaveGrowButton title="Save" newGrow={!growArg} />
              {growArg && <DeleteGrowButton title="Delete" />}
            </Center>
          </ScrollView>
        </VStack>
      </Box>
    </>
  );
};
