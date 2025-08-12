import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Thermometer, Droplet, Activity } from 'lucide-react-native';
import { HAEntity, IoTEntity } from '~/lib/iot';

interface SensorControlProps {
  state: HAEntity;
  entity?: IoTEntity;
  showCard?: boolean;
}

export const SensorControl: React.FC<SensorControlProps> = ({ state, entity, showCard = true }) => {
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
    <HStack className="items-center">
      <Icon as={DeviceIcon} className="text-typography-500" />
      <Text className="ml-3 font-medium">{friendlyName}</Text>
      <Text className="ml-auto text-typography-500">
        {state.state}
        {state.attributes.unit_of_measurement && ` ${state.attributes.unit_of_measurement}`}
      </Text>
    </HStack>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="bg-background-0 p-3">{content}</Card>;
};
