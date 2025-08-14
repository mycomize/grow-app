import React, { useMemo } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { ScrollView } from '~/components/ui/scroll-view';
import {
  ListX,
  WifiOff,
  Activity,
  Bot,
  Calculator,
  ToggleRight,
  Loader2,
} from 'lucide-react-native';
import { IoTEntity, IoTGateway } from '~/lib/iot';
import { InfoBadge } from '~/components/ui/info-badge';
import { getConnectionBadgeProps } from '~/lib/iot-gateway/connectionUtils';

interface IotControlsListProps {
  entities: IoTEntity[];
  gateways: IoTGateway[];
  entityStates: Record<string, string>;
  loading: boolean;
}

interface EntityWithState extends IoTEntity {
  state?: string;
}

export const IotControlsList: React.FC<IotControlsListProps> = ({
  entities,
  gateways,
  entityStates,
  loading,
}) => {
  // Group linked entities by gateway
  const groupedEntities = useMemo(() => {
    if (!entities.length || !gateways.length) return {};

    const gatewayMap = gateways.reduce(
      (acc, gateway) => {
        acc[gateway.id] = gateway;
        return acc;
      },
      {} as Record<number, IoTGateway>
    );

    return entities.reduce(
      (acc, entity) => {
        const gateway = gatewayMap[entity.gateway_id];
        const gatewayName = gateway?.name || `Gateway ${entity.gateway_id}`;

        if (!acc[gatewayName]) {
          acc[gatewayName] = {
            gateway,
            entities: [],
          };
        }

        acc[gatewayName].entities.push({
          ...entity,
          state: entityStates[entity.entity_name],
        });

        return acc;
      },
      {} as Record<string, { gateway: IoTGateway | undefined; entities: EntityWithState[] }>
    );
  }, [entities, gateways, entityStates]);

  // Get domain icon
  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'sensor':
        return Activity;
      case 'automation':
        return Bot;
      case 'number':
        return Calculator;
      case 'switch':
        return ToggleRight;
      default:
        return Activity;
    }
  };

  if (loading) {
    return (
      <VStack className="items-center justify-center p-8" space="md">
        <Icon as={Loader2} size="xl" className="animate-spin text-typography-400" />
        <Text className="text-center text-typography-500">Loading IoT controls...</Text>
      </VStack>
    );
  }

  if (entities.length === 0) {
    return (
      <VStack
        className="mt-2 items-center rounded-lg border border-dashed border-typography-300 p-6"
        space="sm">
        <Icon as={ListX} size="xl" className="text-typography-400" />
        <Text className="text-center text-typography-500">
          No IoT controls linked to this stage
        </Text>
        <Text className="text-center text-sm text-typography-400">
          Visit the IoT section to link controls to this grow stage
        </Text>
      </VStack>
    );
  }

  return (
    <ScrollView className="max-h-96" showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
      <VStack space="md" className="pb-4 pr-4">
        {Object.entries(groupedEntities).map(
          ([gatewayName, { gateway, entities: gatewayEntities }], index) => (
            <VStack key={gatewayName} space="sm">
              {/* Gateway Header */}
              <HStack className={`items-center justify-between ${index === 0 ? 'mt-2' : 'mt-4'}`}>
                <Text className="text-md font-semibold italic text-typography-600">
                  {gatewayName}
                </Text>
                {gateway && <InfoBadge {...getConnectionBadgeProps('connected')} size="sm" />}
              </HStack>

              {/* Gateway Entities */}
              <VStack space="xs">
                {gatewayEntities.map((entity) => {
                  const friendlyName = entity.friendly_name || entity.entity_name;
                  const DomainIcon = getDomainIcon(entity.domain);

                  return (
                    <Card key={entity.entity_name} className="bg-background-0 p-0.5">
                      <HStack className="mt-1 items-center" space="sm">
                        {/* Domain Icon */}
                        <Icon as={DomainIcon} size="sm" className="ml-2 text-typography-500" />

                        {/* Entity Information */}
                        <VStack className="flex-1">
                          <Text className="text-sm font-medium">{friendlyName}</Text>
                          {entity.device_class && (
                            <Text className="text-xs capitalize text-typography-400">
                              {entity.device_class}
                            </Text>
                          )}
                        </VStack>

                        {/* Entity State */}
                        <VStack className="mr-2 items-end">
                          <Text className="text-sm font-medium text-typography-500">
                            {entity.state || 'Unknown'}
                          </Text>
                        </VStack>
                      </HStack>
                    </Card>
                  );
                })}
              </VStack>
            </VStack>
          )
        )}
      </VStack>
    </ScrollView>
  );
};
