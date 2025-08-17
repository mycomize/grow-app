import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Thermometer, Droplet, Activity } from 'lucide-react-native';
import { HAEntity, IoTEntity, IoTGateway } from '~/lib/iot';

interface SensorControlProps {
  state: HAEntity;
  gateway?: IoTGateway;
  showCard?: boolean;
}

export const SensorControl: React.FC<SensorControlProps> = ({
  state,
  gateway,
  showCard = true,
}) => {
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

  const DeviceIcon = getDeviceClassIcon();

  const content = (
    <HStack className="items-center justify-between" space="sm">
      {/* Entity Name */}
      <VStack className="flex-1">
        <Text className="font-medium">{friendlyName}</Text>
      </VStack>

      {/* Device Icon and State Value */}
      <HStack className="items-center" space="sm">
        <Icon as={DeviceIcon} className="text-typography-500" />
        <Text className="text-typography-500">
          {state.state}
          {state.attributes.unit_of_measurement && ` ${state.attributes.unit_of_measurement}`}
        </Text>
      </HStack>
    </HStack>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="bg-background-0 p-3">{content}</Card>;
};
