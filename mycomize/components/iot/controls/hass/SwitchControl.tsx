import React, { useState } from 'react';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { Spinner } from '~/components/ui/spinner';
import { ToggleLeft, ToggleRight } from 'lucide-react-native';
import { HAEntity, IoTEntity, IoTGateway } from '~/lib/iot/iot';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getSwitchColors } from '~/lib/switchUtils';

interface SwitchControlProps {
  state: HAEntity;
  entity?: IoTEntity;
  gateway?: IoTGateway;
  showCard?: boolean;
  isControlling?: boolean;
  onToggle?: (entityId: string, domain: string, currentState: string) => void;
  onStateUpdate?: (entityId: string, newState: string) => void;
}

export const SwitchControl: React.FC<SwitchControlProps> = ({
  state,
  showCard = true,
  isControlling = false,
  onToggle,
}) => {
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);

  const friendlyName = state.attributes.friendly_name || state.entity_id;
  const domain = state.entity_id.split('.')[0];
  const isOn = state.state === 'on';

  const content = (
    <HStack className="items-center" space="sm">
      {/* State Icon */}
      {isOn ? (
        <Icon as={ToggleRight} size="lg" className="text-green-500" />
      ) : (
        <Icon as={ToggleLeft} size="lg" className="text-typography-400" />
      )}

      {/* Entity Name */}
      <VStack className="flex-1">
        <Text className="font-medium text-typography-600" numberOfLines={1}>{friendlyName}</Text>
      </VStack>

      {/* Control */}
      <HStack className="items-center" space="sm">
        {isControlling && <Spinner size="small" className="mr-6 mt-2 text-success-500" />}

        {!isControlling && onToggle && (
          <Switch
            trackColor={{ false: trackFalse, true: trackTrue }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackFalse}
            value={isOn}
            onValueChange={() => onToggle(state.entity_id, domain, state.state)}
            disabled={isControlling}
          />
        )}
      </HStack>
    </HStack>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="bg-background-0 p-0">{content}</Card>;
};
