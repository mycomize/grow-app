import React, { useState } from 'react';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { Spinner } from '~/components/ui/spinner';
import { Zap, ZapOff } from 'lucide-react-native';
import { HAEntity, IoTEntity, IoTGateway } from '~/lib/iot/iot';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getSwitchColors } from '~/lib/switchUtils';

interface AutomationControlProps {
  state: HAEntity;
  gateway?: IoTGateway;
  showCard?: boolean;
  onStateUpdate?: (entityId: string, newState: string) => void;
}

export const AutomationControl: React.FC<AutomationControlProps> = ({
  state,
  gateway,
  showCard = true,
  onStateUpdate,
}) => {
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);
  const [isControlling, setIsControlling] = useState(false);

  const friendlyName = state.attributes.friendly_name || state.entity_id;
  const isOn = state.state === 'on';

  // Handle Home Assistant API call for automation toggle
  const handleToggle = async () => {
    if (!gateway || isControlling) return;

    try {
      setIsControlling(true);

      // Call Home Assistant automation turn_on/turn_off service
      const service = isOn ? 'turn_off' : 'turn_on';
      const response = await fetch(`${gateway.api_url}/api/services/automation/${service}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_id: state.entity_id,
        }),
      });

      if (response.ok) {
        // Update local state optimistically
        const newState = isOn ? 'off' : 'on';
        onStateUpdate?.(state.entity_id, newState);
      } else {
        console.error('Failed to toggle automation:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error toggling automation:', error);
    } finally {
      setIsControlling(false);
    }
  };

  const content = (
    <HStack className="items-center justify-between" space="sm">
      {/* Entity Name */}
      <VStack className="flex-1">
        <Text className="font-medium">{friendlyName}</Text>
      </VStack>

      {/* State Icon and Control */}
      <HStack className="items-center" space="sm">
        {/* State Icon */}
        {isOn ? (
          <Icon as={Zap} className="text-green-500" />
        ) : (
          <Icon as={ZapOff} className="text-typography-400" />
        )}

        {/* Control */}
        {isControlling && <Spinner size="small" className="text-success-500" />}

        {!isControlling && (
          <Switch
            trackColor={{ false: trackFalse, true: trackTrue }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackFalse}
            value={isOn}
            onValueChange={handleToggle}
            disabled={isControlling}
          />
        )}
      </HStack>
    </HStack>
  );

  if (!showCard) {
    return content;
  }

  return <Card className="bg-background-0 p-3">{content}</Card>;
};
