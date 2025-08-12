import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Input, InputField } from '~/components/ui/input';
import { Pressable } from '~/components/ui/pressable';
import { CirclePlus, CircleMinus, Save } from 'lucide-react-native';
import { HAEntity, IoTEntity } from '~/lib/iot';

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
  entity,
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
      <VStack className="flex-1">
        <Text className="font-medium">{friendlyName}</Text>
        <Text className="text-md mt-1 text-typography-500">
          Current: {state.state}
          {state.attributes.unit_of_measurement && ` ${state.attributes.unit_of_measurement}`}
        </Text>
      </VStack>

      {/* Input Field */}
      {onValueChange && (
        <Input className="mt-4 w-20">
          <InputField
            value={currentValue}
            onChangeText={(value) => onValueChange(state.entity_id, value)}
            keyboardType="numeric"
            editable={!isControlling}
          />
        </Input>
      )}

      {/* Number input controls */}
      <HStack className="mt-3 gap-9">
        {onAdjustValue && (
          <>
            <Pressable
              onPress={() => onAdjustValue(state.entity_id, false, currentValue)}
              disabled={isControlling}>
              <Icon as={CircleMinus} size="xl" className="text-typography-600" />
            </Pressable>
            <Pressable
              onPress={() => onAdjustValue(state.entity_id, true, currentValue)}
              disabled={isControlling}>
              <Icon as={CirclePlus} size="xl" className="text-typography-600" />
            </Pressable>
          </>
        )}
        {hasPendingChanges && onSaveValue && (
          <Pressable
            className="ml-auto"
            onPress={() => onSaveValue(state.entity_id, pendingValue)}
            disabled={isControlling}>
            <Icon as={Save} size="xl" className="text-typography-600" />
          </Pressable>
        )}
      </HStack>
    </VStack>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="bg-background-0 p-3">{content}</Card>;
};
