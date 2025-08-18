import React, { useState, useMemo } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Spinner } from '~/components/ui/spinner';
import {
  ChevronDown,
  ChevronRight,
  Activity,
  Bot,
  Calculator,
  ToggleRight,
  WifiOff,
  ListX,
} from 'lucide-react-native';
import { IoTEntity, IoTGateway, HAEntity } from '~/lib/iot';
import { stageLabels } from '~/lib/growTypes';
import { InfoBadge } from '~/components/ui/info-badge';
//import { getConnectionBadgeProps } from '~/lib/iot-gateway/connectionUtils';

// Import Home Assistant controls
import { SwitchControl } from '~/components/iot/controls/hass/SwitchControl';
import { NumberControl } from '~/components/iot/controls/hass/NumberControl';
import { AutomationControl } from '~/components/iot/controls/hass/AutomationControl';
import { SensorControl } from '~/components/iot/controls/hass/SensorControl';

interface IoTGatewaySectionProps {
  growId?: number;
  linkedEntities: IoTEntity[];
  gateways: IoTGateway[];
  entityStates: Record<string, HAEntity>;
  iotLoading: boolean;
  onEntityStateUpdate: (entityId: string, newState: string) => void;
}

interface EntityWithState extends IoTEntity {
  state?: HAEntity;
}

interface GatewayWithEntities {
  gateway: IoTGateway;
  entities: EntityWithState[];
  isExpanded: boolean;
}

export const IoTGatewaySection: React.FC<IoTGatewaySectionProps> = ({
  growId,
  linkedEntities,
  gateways,
  entityStates,
  iotLoading,
  onEntityStateUpdate,
}) => {
  const [gatewayExpansion, setGatewayExpansion] = useState<Record<number, boolean>>({});

  // Toggle gateway expansion
  const toggleGatewayExpansion = (gatewayId: number) => {
    setGatewayExpansion((prev) => ({
      ...prev,
      [gatewayId]: !prev[gatewayId],
    }));
  };

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
        return null;
    }
  };

  // Render control based on domain
  const renderControl = (entity: EntityWithState, gateway: IoTGateway) => {
    if (!entity.state) return null;

    const commonProps = {
      state: entity.state,
      gateway,
      showCard: false,
      onStateUpdate: onEntityStateUpdate,
    };

    switch (entity.domain) {
      case 'switch':
        return <SwitchControl key={entity.entity_name} {...commonProps} />;
      case 'number':
        return <NumberControl key={entity.entity_name} {...commonProps} />;
      case 'automation':
        return <AutomationControl key={entity.entity_name} {...commonProps} />;
      case 'sensor':
        return (
          <SensorControl
            key={entity.entity_name}
            state={entity.state}
            gateway={gateway}
            showCard={false}
          />
        );
      default:
        return null;
    }
  };

  // Group entities by gateway and stage
  const groupedData: GatewayWithEntities[] = useMemo(() => {
    const gatewayMap = gateways.reduce(
      (acc, gateway) => {
        acc[gateway.id] = gateway;
        return acc;
      },
      {} as Record<number, IoTGateway>
    );

    const gatewayGroups: Record<number, EntityWithState[]> = {};

    linkedEntities.forEach((entity) => {
      if (!gatewayGroups[entity.gateway_id]) {
        gatewayGroups[entity.gateway_id] = [];
      }

      gatewayGroups[entity.gateway_id].push({
        ...entity,
        state: entityStates[entity.entity_name],
      });
    });

    return Object.entries(gatewayGroups).map(([gatewayId, entities]) => ({
      gateway: gatewayMap[parseInt(gatewayId)],
      entities,
      isExpanded: gatewayExpansion[parseInt(gatewayId)] ?? true,
    }));
  }, [linkedEntities, gateways, entityStates, gatewayExpansion]);

  if (!growId) {
    return (
      <VStack className="items-center justify-center p-8" space="md">
        <Icon as={WifiOff} size="xl" className="text-typography-400" />
        <Text className="text-center text-typography-500">
          Save the grow first to manage IoT controls
        </Text>
      </VStack>
    );
  }

  if (iotLoading) {
    return (
      <VStack className="items-center justify-center p-8" space="md">
        <Spinner size="large" className="text-typography-400" />
        <Text className="text-center text-typography-500">Loading IoT controls...</Text>
      </VStack>
    );
  }

  if (linkedEntities.length === 0) {
    return (
      <VStack className="items-center justify-center p-8" space="md">
        <Icon as={ListX} size="xl" className="text-typography-400" />
        <Text className="text-center text-typography-500">No IoT controls linked to this grow</Text>
        <Text className="text-center text-sm text-typography-400">
          Use the IoT tab to link controls to grow stages
        </Text>
      </VStack>
    );
  }

  return (
    <VStack space="md" className="p-1">
      {groupedData.map(({ gateway, entities, isExpanded }) => {
        if (!gateway) return null;

        // Group entities by stage
        const entitiesByStage: Record<string, EntityWithState[]> = {};

        entities.forEach((entity) => {
          const stage = entity.linked_stage || 'unassigned';
          if (!entitiesByStage[stage]) {
            entitiesByStage[stage] = [];
          }
          entitiesByStage[stage].push(entity);
        });

        return (
          <VStack key={gateway.id} space="sm">
            {/* Gateway Header */}
            <Pressable onPress={() => toggleGatewayExpansion(gateway.id)}>
              <HStack className="items-center justify-between">
                <Text className="text-md font-semibold italic text-typography-700">
                  {gateway.name}
                </Text>
                <HStack className="items-center" space="md">
                  {/* <InfoBadge {...getConnectionBadgeProps('connected')} size="sm" /> */}
                  <Icon
                    as={isExpanded ? ChevronDown : ChevronRight}
                    size="lg"
                    className="text-typography-500"
                  />
                </HStack>
              </HStack>
            </Pressable>

            {/* Gateway Content */}
            {isExpanded && (
              <VStack space="md">
                {Object.entries(entitiesByStage).map(([stage, stageEntities]) => (
                  <VStack key={stage} space="sm">
                    {/* Stage Header */}
                    <Text className="text-sm capitalize text-typography-500">
                      {stage === 'unassigned'
                        ? 'Unassigned'
                        : stageLabels[stage as keyof typeof stageLabels] || stage}
                    </Text>

                    {/* Controls */}
                    <VStack space="sm">
                      {stageEntities.map((entity) => {
                        const DomainIcon = getDomainIcon(entity.domain);

                        return (
                          <HStack key={entity.entity_name} className="items-center" space="sm">
                            {DomainIcon && (
                              <Icon as={DomainIcon} size="sm" className="text-typography-500" />
                            )}
                            <VStack className="flex-1">{renderControl(entity, gateway)}</VStack>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </VStack>
                ))}
              </VStack>
            )}
          </VStack>
        );
      })}
    </VStack>
  );
};
