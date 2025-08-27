import React, { useState, useCallback } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { ScrollView } from '~/components/ui/scroll-view';
import { Icon } from '~/components/ui/icon';
import { ListX, CircuitBoard, Wifi, RadioTower, PowerOff, WifiOff } from 'lucide-react-native';
import { useLinkedEntities } from '~/lib/stores/iot/entityStore';
import { useGateways, useGatewayStore } from '~/lib/stores/iot/gatewayStore';
import { EntityCard } from '~/components/iot/EntityCard';
import { InfoBadge, InfoBadgeVariant } from '~/components/ui/info-badge';
import { ConnectionStatus } from '~/lib/types/iotTypes';
import { IoTEntity } from '~/lib/iot/iot';

interface GrowStageIoTControlListProps {
  growId: number;
  stage: string;
}

export const GrowStageIoTControlList: React.FC<GrowStageIoTControlListProps> = ({
  growId,
  stage,
}) => {
  const linkedEntities = useLinkedEntities();
  const gateways = useGateways();
  const connectionStatuses = useGatewayStore((state) => state.connectionStatuses);
  
  // Filter entities for this specific grow and stage (include refreshTrigger to force recalculation)
  const stageLinkedEntities = linkedEntities.filter(
    (entity) => entity.linked_grow_id === growId && entity.linked_stage === stage
  );

  // Helper function to get InfoBadge props from connection status
  const getConnectionBadgeProps = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          text: 'CONNECTED',
          icon: Wifi,
          variant: 'success' as InfoBadgeVariant,
        };
      case 'connecting':
        return {
          text: 'CONNECTING',
          icon: RadioTower,
          variant: 'info' as InfoBadgeVariant,
        };
      case 'disconnected':
        return {
          text: 'DISCONNECTED',
          icon: PowerOff,
          variant: 'error' as InfoBadgeVariant,
        };
      default:
        return {
          text: 'UNKNOWN',
          icon: WifiOff,
          variant: 'error' as InfoBadgeVariant,
        };
    }
  };

  // Group entities by gateway first, then by domain
  const groupedEntities: Record<string, { 
    gateway: { id: number; name: string; connectionStatus: ConnectionStatus };
    domains: Record<string, IoTEntity[]>;
  }> = {};

  stageLinkedEntities.forEach((entity) => {
    const gateway = gateways.find(g => g.id === entity.gateway_id);
    const gatewayName = gateway?.name || 'Unknown Gateway';
    const gatewayId = entity.gateway_id;
    const connectionStatus = connectionStatuses[gatewayId] || 'unknown';
    
    if (!groupedEntities[gatewayName]) {
      groupedEntities[gatewayName] = {
        gateway: { id: gatewayId, name: gatewayName, connectionStatus },
        domains: {}
      };
    }

    const domain = entity.domain;
    if (!groupedEntities[gatewayName].domains[domain]) {
      groupedEntities[gatewayName].domains[domain] = [];
    }
    groupedEntities[gatewayName].domains[domain].push(entity);
  });

  return (
    <VStack space="md" className="px-0 py-2">
      <HStack className="items-center justify-between">
        <HStack className="items-center" space="sm">
          <Text className="text-md font-semibold text-typography-600">Linked IoT Controls</Text>
        </HStack>
        <InfoBadge text={`${stageLinkedEntities.length} LINKED`} variant="default" size="sm" />
      </HStack>

      {stageLinkedEntities.length === 0 ? (
        <VStack
          className="items-center rounded-lg border border-dashed border-typography-300 p-8"
          space="md">
          <Icon as={ListX} size="xl" className="text-typography-400" />
          <VStack space="sm" className="items-center">
            <Text className="text-center text-typography-500">
              No IoT controls linked to this grow and stage. Link them from the IoT tab
            </Text>
          </VStack>
        </VStack>
      ) : (
        <ScrollView
          className="max-h-96 rounded-md border border-outline-50 pt-2 px-2"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}>
          <VStack space="lg" className="pb-2">
            {Object.entries(groupedEntities).map(([gatewayName, { gateway, domains }]) => (
              <VStack key={gatewayName} space="md">
                {/* Gateway Header */}
                <HStack className="items-center justify-between">
                  <Text className="text-lg font-semibold text-typography-700">{gatewayName}</Text>
                  <InfoBadge {...getConnectionBadgeProps(gateway.connectionStatus)} size="sm" />
                </HStack>

                {/* Domains and Entities */}
                <VStack space="md">
                  {Object.entries(domains).map(([domain, domainEntities]) => (
                    <VStack key={`${gatewayName}-${domain}`} space="sm">
                      <Text className="text-md capitalize text-typography-500">{domain}</Text>
                      <VStack space="sm" className="ml-2">
                        {domainEntities.map((entity) => (
                          <EntityCard
                            key={entity.entity_name}
                            entity={entity}
                            isSelected={false}
                            bulkMode={false}
                            showUnlinkButton={false}
                            showLinkButton={false}
                            onSelect={() => {}}
                            onUnlink={() => {}}
                            onLink={() => {}}
                          />
                        ))}
                      </VStack>
                    </VStack>
                  ))}
                </VStack>
              </VStack>
            ))}
          </VStack>
        </ScrollView>
      )}
    </VStack>
  );
};
