import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Input, InputField } from '~/components/ui/input';
import { Pressable } from '~/components/ui/pressable';
import { CirclePlus, CircleMinus, Calculator, Save } from 'lucide-react-native';
import { HAEntity, IoTEntity } from '~/lib/iot/iot';

interface NumberControlProps {
  state: HAEntity;
  entity?: IoTEntity;
  showCard?: boolean;
  isControlling?: boolean;
  pendingValue?: string;
  onValueChange?: (entityId: string, value: string) => void;
  onAdjustValue?: (entityId: string, increment: boolean, currentValue: string) => void;
  onSaveValue?: (entityId: string, pendingValue: string) => void;
}

export const NumberControl: React.FC<NumberControlProps> = ({
  state,
  showCard = true,
  isControlling = false,
  pendingValue,
  onValueChange,
  onAdjustValue,
  onSaveValue,
}) => {
  const friendlyName = state.attributes.friendly_name || state.entity_id;
  const currentValue = pendingValue ?? state.state;
  const hasPendingChanges = pendingValue !== undefined && pendingValue !== state.state;

  const content = (
    <VStack space="sm">
      {/* Entity Name and Current Value */}
      <HStack space='sm' className='items-center'>
        <Icon as={Calculator} className="text-typography-400"/>
        <VStack className="flex-1">
          <Text className="flex-1 font-medium text-typography-600" numberOfLines={1}>{friendlyName}</Text>
          <Text className="text-md mt-1 text-typography-500">
            {state.state}
            {state.attributes.unit_of_measurement && ` ${state.attributes.unit_of_measurement}`}
          </Text>
        </VStack>

      {/* Input Field */}
      {hasPendingChanges && onSaveValue && (
        <Pressable
          className="mx-2"
          onPress={() => onSaveValue(state.entity_id, pendingValue)}
          disabled={isControlling}>
          <Icon as={Save} size="lg" className="text-typography-600" />
        </Pressable>
      )}
      {onValueChange && (
        <Input className="w-16 ml-auto">
          <InputField
            value={currentValue}
            onChangeText={(value) => onValueChange(state.entity_id, value)}
            keyboardType="numeric"
            editable={!isControlling}
          />
        </Input>
      )}
      </HStack>
    </VStack>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="bg-background-0 p-0">{content}</Card>;
};
