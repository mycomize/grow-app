import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Pressable } from '~/components/ui/pressable';
import { Thermometer, Droplet, Activity, ChartLine } from 'lucide-react-native';
import { HAEntity, IoTEntity } from '~/lib/iot/iot';
import { router } from 'expo-router';

interface SensorControlProps {
  state: HAEntity;
  entity?: IoTEntity;
  showCard?: boolean;
  gatewayId?: number; // Add gatewayId for navigation
}

export const SensorControl: React.FC<SensorControlProps> = ({ state, entity, showCard = true, gatewayId }) => {
  const friendlyName = state.attributes.friendly_name || state.entity_id;
  const deviceClass = state.attributes.device_class;

  const getDeviceClassIcon = () => {
    switch (deviceClass?.toLowerCase()) {
      case 'temperature':
        return Thermometer;
      case 'humidity':
        return Droplet;
      default:
        return Activity;
    }
  };

  const formatStateValue = (value: string): string => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Format to max 2 decimal places, removing trailing zeros
      return parseFloat(numValue.toFixed(2)).toString();
    }
    return value;
  };

  const DeviceIcon = getDeviceClassIcon();

  const handleChartPress = () => {
    if (gatewayId) {
      router.push(`/iot/${gatewayId}/sensor/${state.entity_id}`);
    }
  };

  const content = (
    <HStack className="items-center justify-between">
      <HStack className="items-center flex-1">
        <Icon as={DeviceIcon} className="text-typography-400" />
        <VStack className="flex-1">
          <Text numberOfLines={1} className="font-medium text-typography-600 ml-2">{friendlyName}</Text>
          <Text className="ml-2 text-typography-500">
            {formatStateValue(state.state)}
            {state.attributes.unit_of_measurement && ` ${state.attributes.unit_of_measurement}`}
          </Text>
        </VStack>
      </HStack>
      {gatewayId && (
        <Pressable onPress={handleChartPress} className="pr-3">
          <Icon as={ChartLine} className="text-typography-500" size="xl" />
        </Pressable>
      )}
    </HStack>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="bg-background-0 p-0">{content}</Card>;
};
