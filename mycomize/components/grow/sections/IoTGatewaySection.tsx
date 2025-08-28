import React, { useState, useCallback } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { ScrollView } from '~/components/ui/scroll-view';
import { Icon } from '~/components/ui/icon';
import { ListX, Wifi, RadioTower, PowerOff, WifiOff } from 'lucide-react-native';
import { useEntityStore } from '~/lib/stores/iot/entityStore';
import { useGatewayStore } from '~/lib/stores/iot/gatewayStore';
import { InfoBadge, InfoBadgeVariant } from '~/components/ui/info-badge';
import { ConnectionStatus, DEFAULT_IOT_DOMAINS } from '~/lib/types/iotTypes';
import { IoTEntity, IoTGateway } from '~/lib/iot/iot';
import { HAEntityState } from '~/lib/stores/iot/entity/types';
import { AutomationControl } from '~/components/iot/controls/hass/AutomationControl';
import { NumberControl } from '~/components/iot/controls/hass/NumberControl';
import { SensorControl } from '~/components/iot/controls/hass/SensorControl';
import { SwitchControl } from '~/components/iot/controls/hass/SwitchControl';
import { HAServiceManager } from '~/lib/iot/haServiceManager';
import { bulkGrowStages } from '~/lib/types/growTypes';

export interface IoTGatewaySectionProps {
  growId: number;
  stage?: string;
}

export interface EntityWithState {
  entity: IoTEntity;
  state?: HAEntityState;
}

export const IoTGatewaySection: React.FC<IoTGatewaySectionProps> = ({ growId, stage }) => {
  // Get data from stores
  const linkedEntities = useEntityStore((state) => state.linkedEntities);
  const entityStates = useEntityStore((state) => state.entityStates);
  const gateways = useGatewayStore((state) => state.gateways);
  const connectionStatuses = useGatewayStore((state) => state.connectionStatuses);

  // Debug logging
  console.log(`[IoTGatewaySection] Debug - growId: ${growId}, stage: "${stage}"`);
  console.log(`[IoTGatewaySection] Debug - linkedEntities count: ${linkedEntities.length}`);
  console.log(`[IoTGatewaySection] Debug - entityStates count: ${Object.keys(entityStates).length}`);
  console.log(`[IoTGatewaySection] Debug - linkedEntities:`, linkedEntities.map(e => ({
    name: e.entity_name,
    domain: e.domain,
    linked_grow_id: e.linked_grow_id,
    linked_stage: e.linked_stage
  })));

  // Local state for control operations
  const [controllingEntities, setControllingEntities] = useState<Set<string>>(new Set());
  const [pendingNumberValues, setPendingNumberValues] = useState<Record<string, string>>({});

  // Helper function to update entity state optimistically
  const updateEntityStateOptimistically = useCallback((entityId: string, newState: string) => {
    const entityStore = useEntityStore.getState();
    const currentStates = entityStore.entityStates;
    const updatedStates = {
      ...currentStates,
      [entityId]: {
        ...currentStates[entityId],
        state: newState,
      }
    };
    
    // Update the entity states in the store
    useEntityStore.setState({ entityStates: updatedStates });
  }, []);

  // Toggle callback for switch and automation entities
  const handleToggle = useCallback(async (entityId: string, domain: string, currentState: string) => {
    console.log(`[IoTGatewaySection] Toggle requested for ${entityId}, current state: ${currentState}`);
    
    // Find the gateway for this entity
    const entityData = linkedEntities.find(e => e.entity_name === entityId);
    if (!entityData) {
      console.error(`[IoTGatewaySection] Entity not found: ${entityId}`);
      return;
    }

    const gateway = gateways.find(g => g.id === entityData.gateway_id);
    if (!gateway) {
      console.error(`[IoTGatewaySection] Gateway not found for entity: ${entityId}`);
      return;
    }

    // Check connection status
    const connectionStatus = connectionStatuses[gateway.id];
    if (connectionStatus !== 'connected') {
      console.warn(`[IoTGatewaySection] Gateway ${gateway.name} is not connected (${connectionStatus})`);
      return;
    }

    // Set controlling state
    setControllingEntities(prev => new Set([...prev, entityId]));

    try {
      // Update state optimistically
      const newState = currentState === 'on' ? 'off' : 'on';
      updateEntityStateOptimistically(entityId, newState);

      // Call Home Assistant service
      const success = await HAServiceManager.toggleEntity(gateway, entityId, currentState);
      
      if (!success) {
        // Revert optimistic update on failure
        updateEntityStateOptimistically(entityId, currentState);
        console.error(`[IoTGatewaySection] Failed to toggle ${entityId}`);
      } else {
        console.log(`[IoTGatewaySection] Successfully toggled ${entityId} to ${newState}`);
      }
    } catch (error) {
      // Revert optimistic update on error
      updateEntityStateOptimistically(entityId, currentState);
      console.error(`[IoTGatewaySection] Error toggling ${entityId}:`, error);
    } finally {
      // Remove controlling state
      setControllingEntities(prev => {
        const newSet = new Set(prev);
        newSet.delete(entityId);
        return newSet;
      });
    }
  }, [linkedEntities, gateways, connectionStatuses, updateEntityStateOptimistically]);

  // Number value change callback
  const handleNumberValueChange = useCallback((entityId: string, value: string) => {
    setPendingNumberValues(prev => ({ ...prev, [entityId]: value }));
  }, []);

  // Number value adjust callback
  const handleNumberAdjust = useCallback((entityId: string, increment: boolean, currentValue: string) => {
    const numValue = parseFloat(currentValue) || 0;
    const step = 1; // Default step, could be made configurable
    const newValue = increment ? numValue + step : numValue - step;
    setPendingNumberValues(prev => ({ ...prev, [entityId]: newValue.toString() }));
  }, []);

  // Number value save callback
  const handleNumberSave = useCallback(async (entityId: string, pendingValue: string) => {
    console.log(`[IoTGatewaySection] Save number value requested for ${entityId}: ${pendingValue}`);
    
    // Find the gateway for this entity
    const entityData = linkedEntities.find(e => e.entity_name === entityId);
    if (!entityData) {
      console.error(`[IoTGatewaySection] Entity not found: ${entityId}`);
      return;
    }

    const gateway = gateways.find(g => g.id === entityData.gateway_id);
    if (!gateway) {
      console.error(`[IoTGatewaySection] Gateway not found for entity: ${entityId}`);
      return;
    }

    // Check connection status
    const connectionStatus = connectionStatuses[gateway.id];
    if (connectionStatus !== 'connected') {
      console.warn(`[IoTGatewaySection] Gateway ${gateway.name} is not connected (${connectionStatus})`);
      return;
    }

    // Validate number
    const numValue = parseFloat(pendingValue);
    if (isNaN(numValue)) {
      console.error(`[IoTGatewaySection] Invalid number value: ${pendingValue}`);
      return;
    }

    // Set controlling state
    setControllingEntities(prev => new Set([...prev, entityId]));

    try {
      // Update state optimistically
      updateEntityStateOptimistically(entityId, pendingValue);

      // Call Home Assistant service
      const success = await HAServiceManager.setNumberValue(gateway, entityId, numValue);
      
      if (success) {
        // Clear pending value on success
        setPendingNumberValues(prev => {
          const newValues = { ...prev };
          delete newValues[entityId];
          return newValues;
        });
        console.log(`[IoTGatewaySection] Successfully set ${entityId} to ${numValue}`);
      } else {
        // Revert optimistic update on failure
        const currentState = entityStates[entityId]?.state || '0';
        updateEntityStateOptimistically(entityId, currentState);
        console.error(`[IoTGatewaySection] Failed to set number value for ${entityId}`);
      }
    } catch (error) {
      // Revert optimistic update on error
      const currentState = entityStates[entityId]?.state || '0';
      updateEntityStateOptimistically(entityId, currentState);
      console.error(`[IoTGatewaySection] Error setting number value for ${entityId}:`, error);
    } finally {
      // Remove controlling state
      setControllingEntities(prev => {
        const newSet = new Set(prev);
        newSet.delete(entityId);
        return newSet;
      });
    }
  }, [linkedEntities, gateways, connectionStatuses, entityStates, updateEntityStateOptimistically]);

  // Filter entities for this specific grow and stage
  const stageLinkedEntities = linkedEntities.filter((entity) => {
    console.log(`[IoTGatewaySection] Filtering entity ${entity.entity_name}: linked_grow_id=${entity.linked_grow_id}, target_growId=${growId}, linked_stage="${entity.linked_stage}", target_stage="${stage}"`);
    
    if (entity.linked_grow_id !== growId) {
      return false;
    }
    
    // If no stage is specified or stage is empty, show all entities for this grow
    if (!stage || stage === "") {
      console.log(`[IoTGatewaySection] Entity ${entity.entity_name} accepted - empty stage filter`);
      return true;
    }
    
    // Otherwise, filter by specific stage
    const matches = entity.linked_stage === stage;
    console.log(`[IoTGatewaySection] Entity ${entity.entity_name} ${matches ? 'accepted' : 'filtered out'} - stage match: ${matches}`);
    return matches;
  });

  console.log(`[IoTGatewaySection] After filtering: ${stageLinkedEntities.length} entities`);
  console.log(`[IoTGatewaySection] Filtered entities:`, stageLinkedEntities.map(e => ({
    name: e.entity_name,
    domain: e.domain
  })));

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

  // Combine entities with their states
  const getEntitiesWithStates = (entities: IoTEntity[]): EntityWithState[] => {
    return entities.map((entity) => ({
      entity,
      state: entityStates[entity.entity_name],
    }));
  };

  // Group entities by gateway and domain
  const groupEntitiesByGatewayAndDomain = (entitiesWithState: EntityWithState[]) => {
    console.log(`[IoTGatewaySection] Grouping ${entitiesWithState.length} entities with states`);
    console.log(`[IoTGatewaySection] DEFAULT_IOT_DOMAINS:`, DEFAULT_IOT_DOMAINS);
    
    const grouped: Record<
      string,
      {
        gateway: { id: number; name: string; connectionStatus: ConnectionStatus };
        domains: Record<string, EntityWithState[]>;
      }
    > = {};

    entitiesWithState.forEach(({ entity, state }) => {
      // Filter by allowed domains
      const domain = entity.domain;
      console.log(`[IoTGatewaySection] Processing entity ${entity.entity_name} (domain: ${domain})`);
      
      if (!DEFAULT_IOT_DOMAINS.includes(domain)) {
        console.log(`[IoTGatewaySection] Entity ${entity.entity_name} filtered out - domain ${domain} not in allowed list`);
        return;
      }
      
      console.log(`[IoTGatewaySection] Entity ${entity.entity_name} domain accepted`);

      const gateway = gateways.find((g) => g.id === entity.gateway_id);
      const gatewayName = gateway?.name || 'Unknown Gateway';
      const gatewayId = entity.gateway_id;
      const connectionStatus = connectionStatuses[gatewayId] || 'unknown';

      if (!grouped[gatewayName]) {
        grouped[gatewayName] = {
          gateway: { id: gatewayId, name: gatewayName, connectionStatus },
          domains: {},
        };
      }

      if (!grouped[gatewayName].domains[domain]) {
        grouped[gatewayName].domains[domain] = [];
      }

      grouped[gatewayName].domains[domain].push({ entity, state });
      console.log(`[IoTGatewaySection] Entity ${entity.entity_name} added to group ${gatewayName}/${domain}`);
    });

    console.log(`[IoTGatewaySection] Final grouped entities:`, Object.keys(grouped).map(gw => ({
      gateway: gw,
      domainCounts: Object.keys(grouped[gw].domains).map(d => `${d}:${grouped[gw].domains[d].length}`).join(', ')
    })));

    return grouped;
  };

  // Group entities by stage
  const groupEntitiesByStage = (entitiesWithState: EntityWithState[]): Record<string, EntityWithState[]> => {
    const grouped: Record<string, EntityWithState[]> = {};
    
    entitiesWithState.forEach(({ entity, state }) => {
      const stage = entity.linked_stage || 'unassigned';
      
      if (!grouped[stage]) {
        grouped[stage] = [];
      }
      
      grouped[stage].push({ entity, state });
    });
    
    return grouped;
  };

  // Render entity control based on domain
  const renderEntityControl = ({ entity, state }: EntityWithState) => {
    if (!state) {
      return (
        <VStack key={entity.entity_name} className="p-0 bg-background-50 rounded-lg">
          <Text className="text-typography-400">State unavailable</Text>
          <Text className="text-sm text-typography-500">{entity.friendly_name}</Text>
        </VStack>
      );
    }

    const isControlling = controllingEntities.has(entity.entity_name);
    const pendingValue = pendingNumberValues[entity.entity_name];

    // Convert HAEntityState to HAEntity format expected by controls
    const haEntity = {
      entity_id: state.entity_id,
      state: state.state,
      attributes: state.attributes,
      last_changed: state.last_changed,
      last_updated: state.last_updated,
      context: {
        id: '',
        parent_id: null,
        user_id: null,
      },
    };

    switch (entity.domain) {
      case 'automation':
        return (
          <AutomationControl
            key={entity.entity_name}
            state={haEntity}
            entity={entity}
            showCard={true}
            isControlling={isControlling}
            onToggle={handleToggle}
          />
        );
      case 'number':
        return (
          <NumberControl
            key={entity.entity_name}
            state={haEntity}
            entity={entity}
            showCard={true}
            isControlling={isControlling}
            pendingValue={pendingValue}
            onValueChange={handleNumberValueChange}
            onAdjustValue={handleNumberAdjust}
            onSaveValue={handleNumberSave}
          />
        );
      case 'sensor':
        return (
          <SensorControl
            key={entity.entity_name}
            state={haEntity}
            entity={entity}
            showCard={true}
          />
        );
      case 'switch':
        return (
          <SwitchControl
            key={entity.entity_name}
            state={haEntity}
            entity={entity}
            showCard={true}
            isControlling={isControlling}
            onToggle={handleToggle}
          />
        );
      default:
        return (
          <VStack key={entity.entity_name} className="p-0 bg-background-50 rounded-lg">
            <Text className="text-typography-400">Unsupported domain: {entity.domain}</Text>
            <Text className="text-sm text-typography-500">{entity.friendly_name}</Text>
          </VStack>
        );
    }
  };

  // Get entities with states and filter by allowed domains
  const entitiesWithState = getEntitiesWithStates(stageLinkedEntities);
  const allowedDomainEntities = entitiesWithState.filter(({ entity }) =>
    DEFAULT_IOT_DOMAINS.includes(entity.domain)
  );

  // Group entities by stage first, then sort by domain within each stage
  const groupedByStage = groupEntitiesByStage(allowedDomainEntities);

  // Get unique gateways that have linked entities
  const linkedGateways = Array.from(
    new Set(allowedDomainEntities.map(({ entity }) => entity.gateway_id))
  ).map(gatewayId => {
    const gateway = gateways.find(g => g.id === gatewayId);
    return {
      id: gatewayId,
      name: gateway?.name || 'Unknown Gateway',
      api_url: gateway?.api_url || '',
      connectionStatus: connectionStatuses[gatewayId] || 'unknown'
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Define stage order for mushroom cultivation using correct grow stages
  const STAGE_ORDER = [
    bulkGrowStages.INOCULATION,
    bulkGrowStages.SPAWN_COLONIZATION,
    bulkGrowStages.BULK_COLONIZATION,
    bulkGrowStages.FRUITING,
    bulkGrowStages.HARVEST,
  ];

  const getSortedStages = (groupedStages: Record<string, EntityWithState[]>): string[] => {
    const stages = Object.keys(groupedStages);
    
    // Sort stages by the predefined order, with unknown stages at the end
    return stages.sort((a: string, b: string) => {
      const indexA = STAGE_ORDER.findIndex(stage => stage === a.toLowerCase());
      const indexB = STAGE_ORDER.findIndex(stage => stage === b.toLowerCase());
      
      // If both stages are in the predefined order, sort by their order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only one is in the predefined order, it goes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // If neither is in the predefined order, sort alphabetically
      return a.localeCompare(b);
    });
  };

  // Format stage name for display
  const formatStageForDisplay = (stage: string): string => {
    return stage
      .split('_') // Split by underscores
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
      .join(' '); // Join with spaces
  };

  return (
    <VStack space="md" className="px-0 py-2">
      {/* Gateway Summary */}
      <VStack space="sm">
        {linkedGateways.map((gateway) => (
          <HStack key={gateway.id} className="items-center justify-between">
            <VStack space="xs" className="flex-1">
              <Text className="text-lg font-semibold text-typography-700">{gateway.name}</Text>
              <Text className="text-xs text-typography-500">{gateway.api_url}</Text>
            </VStack>
            <InfoBadge {...getConnectionBadgeProps(gateway.connectionStatus)} size="sm" />
          </HStack>
        ))}
      </VStack>

      {allowedDomainEntities.length === 0 ? (
        <VStack
          className="items-center rounded-lg border border-dashed border-typography-300 p-8"
          space="md"
        >
          <Icon as={ListX} size="xl" className="text-typography-400" />
          <VStack space="sm" className="items-center">
            <Text className="text-center text-typography-500">
              No IoT entities available for this grow in the allowed domains ({DEFAULT_IOT_DOMAINS.join(', ')})
            </Text>
          </VStack>
        </VStack>
      ) : (
        <ScrollView
          className="max-h-96 rounded-md border border-outline-50 pt-3 px-2"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <VStack space="lg" className="pb-6">
            {getSortedStages(groupedByStage).map((stage) => (
              <VStack key={stage} space="sm">
                {/* Stage Header */}
                <Text className="text-md font-semibold text-typography-500">{formatStageForDisplay(stage)}</Text>
                
                {/* Entities for this stage, sorted by domain */}
                <VStack space="md">
                  {groupedByStage[stage]
                    .sort((a, b) => {
                      // Sort by domain order from DEFAULT_IOT_DOMAINS
                      const indexA = DEFAULT_IOT_DOMAINS.indexOf(a.entity.domain);
                      const indexB = DEFAULT_IOT_DOMAINS.indexOf(b.entity.domain);
                      return indexA - indexB;
                    })
                    .map((entityWithState) => renderEntityControl(entityWithState))}
                </VStack>
              </VStack>
            ))}
          </VStack>
        </ScrollView>
      )}
    </VStack>
  );
};
