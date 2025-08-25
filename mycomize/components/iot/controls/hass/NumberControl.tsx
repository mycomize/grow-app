import React, { useState } from 'react';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Input, InputField } from '~/components/ui/input';
import { Pressable } from '~/components/ui/pressable';
import { Spinner } from '~/components/ui/spinner';
import { CirclePlus, CircleMinus, Save, Calculator } from 'lucide-react-native';
import { HAEntity, IoTEntity, IoTGateway } from '~/lib/iot/iot';

interface NumberControlProps {
  state: HAEntity;
  gateway?: IoTGateway;
  showCard?: boolean;
  onStateUpdate?: (entityId: string, newState: string) => void;
}

export const NumberControl: React.FC<NumberControlProps> = ({
  state,
  gateway,
  showCard = true,
  onStateUpdate,
}) => {
  const [pendingValue, setPendingValue] = useState<string | undefined>(undefined);
  const [isControlling, setIsControlling] = useState(false);

  const friendlyName = state.attributes.friendly_name || state.entity_id;
  const currentValue = pendingValue ?? state.state;
  const hasPendingChanges = pendingValue !== undefined && pendingValue !== state.state;

  // Handle Home Assistant API call for number set value
  const handleSetValue = async (value: string) => {
    if (!gateway || isControlling) return;

    try {
      setIsControlling(true);

      // Call Home Assistant number/set_value service
      const response = await fetch(`${gateway.api_url}/api/services/number/set_value`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_id: state.entity_id,
          value: parseFloat(value),
        }),
      });

      if (response.ok) {
        // Update local state
        onStateUpdate?.(state.entity_id, value);
        setPendingValue(undefined);
      } else {
        console.error('Failed to set number value:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error setting number value:', error);
    } finally {
      setIsControlling(false);
    }
  };

  const handleAdjustValue = (increment: boolean) => {
    const step = state.attributes.step || 1;
    const min = state.attributes.min;
    const max = state.attributes.max;
    const currentNum = parseFloat(currentValue) || 0;

    let newValue = increment ? currentNum + step : currentNum - step;

    if (min !== undefined) newValue = Math.max(min, newValue);
    if (max !== undefined) newValue = Math.min(max, newValue);

    setPendingValue(newValue.toString());
  };

  const content = (
    <HStack className="my-1 items-center justify-between" space="sm">
      {/* Entity Name and Current Value */}
      <VStack className="flex-1">
        <Text className="font-medium">{friendlyName}</Text>
        <Text className="text-sm text-typography-500">
          {state.state}
          {state.attributes.unit_of_measurement && ` ${state.attributes.unit_of_measurement}`}
        </Text>
      </VStack>

      {/* Right side controls */}
      <HStack className="items-center" space="sm">
        {/* Text area and save button */}
        <HStack className="items-center" space="md">
          <Input className="h-10 w-16">
            <InputField
              value={currentValue}
              onChangeText={setPendingValue}
              keyboardType="numeric"
              editable={!isControlling}
              className="text-center text-sm"
            />
          </Input>

          {/* Save button appears under text area when changes happen */}
          {hasPendingChanges && !isControlling && (
            <Pressable onPress={() => handleSetValue(pendingValue)} disabled={isControlling}>
              <Icon as={Save} size="md" className="text-typography-500" />
            </Pressable>
          )}

          {isControlling && <Spinner size="small" className="text-success-500" />}
        </HStack>
      </HStack>
    </HStack>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="bg-background-0 p-3">{content}</Card>;
};
