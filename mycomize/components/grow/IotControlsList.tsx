import React, { useState, useMemo } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Switch } from '~/components/ui/switch';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import { Pressable } from '~/components/ui/pressable';
import { Divider } from '~/components/ui/divider';
import { ScrollView } from '~/components/ui/scroll-view';
import { getSwitchColors } from '~/lib/switchUtils';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import {
  ListX,
  WifiOff,
  Activity,
  Bot,
  Calculator,
  ToggleRight,
  Loader2,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  SlidersHorizontal,
} from 'lucide-react-native';
import { IoTEntity, IoTGateway } from '~/lib/iot';
import { IoTFilterPreferences } from '~/lib/iotTypes';
import { InfoBadge } from '~/components/ui/info-badge';
import { getConnectionBadgeProps } from '~/lib/iot-gateway/connectionUtils';
import { stageLabels, BulkGrowComplete } from '~/lib/growTypes';

// Import our shared hooks and components
import { useIoTEntitySelection } from '~/lib/iot/useIoTEntitySelection';
import { useIoTOperations } from '~/lib/iot/useIoTOperations';
import { useEntitySearch } from '~/lib/iot/useEntitySearch';
import { EntityCard } from '~/components/iot/EntityCard';
import { BulkActionBar } from '~/components/iot/BulkActionBar';
import { IoTLinkingModal } from '~/components/modals/IoTLinkingModal';
import { IoTUnlinkConfirmationModal } from '~/components/modals/IoTUnlinkConfirmationModal';

interface IotControlsListProps {
  entities: IoTEntity[];
  gateways: IoTGateway[];
  entityStates: Record<string, string>;
  loading: boolean;

  // New props for linking functionality
  grow: BulkGrowComplete;
  growId: number;
  stageName: string;
  linkableEntities: IoTEntity[];
  onRefreshData: () => void;

  // Filter preferences and handlers
  filterPreferences: IoTFilterPreferences;
  showDomainFilters: boolean;
  showDeviceClassFilters: boolean;
  onToggleShowDomainFilters: () => void;
  onToggleShowDeviceClassFilters: () => void;
  onToggleDomainFilter: (domain: string) => void;
  onToggleDeviceClassFilter: (deviceClass: string) => void;
}

interface EntityWithState extends IoTEntity {
  state?: string;
}

export const IotControlsList: React.FC<IotControlsListProps> = ({
  entities,
  gateways,
  entityStates,
  loading,
  grow,
  growId,
  stageName,
  linkableEntities,
  onRefreshData,
  filterPreferences,
  showDomainFilters,
  showDeviceClassFilters,
  onToggleShowDomainFilters,
  onToggleShowDeviceClassFilters,
  onToggleDomainFilter,
  onToggleDeviceClassFilter,
}) => {
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);

  // Use shared hooks for selection and operations
  const linkSelection = useIoTEntitySelection();
  const unlinkSelection = useIoTEntitySelection();
  const operations = useIoTOperations(growId, stageName);
  const { searchQuery, setSearchQuery, filteredEntities } = useEntitySearch(
    linkableEntities,
    filterPreferences
  );

  // Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [modalMode, setModalMode] = useState<'bulk' | 'individual'>('bulk');

  // Section expansion state
  const [linkedControlsExpanded, setLinkedControlsExpanded] = useState(true);
  const [linkableControlsExpanded, setLinkableControlsExpanded] = useState(true);

  // Group linked entities by gateway, then by domain
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
            entitiesByDomain: {},
          };
        }

        const domain = entity.domain;
        if (!acc[gatewayName].entitiesByDomain[domain]) {
          acc[gatewayName].entitiesByDomain[domain] = [];
        }

        acc[gatewayName].entitiesByDomain[domain].push({
          ...entity,
          state: entityStates[entity.entity_name],
        });

        return acc;
      },
      {} as Record<
        string,
        { gateway: IoTGateway | undefined; entitiesByDomain: Record<string, EntityWithState[]> }
      >
    );
  }, [entities, gateways, entityStates]);

  // Group linkable entities by domain
  const groupedLinkableEntities = useMemo(() => {
    return filteredEntities.reduce(
      (acc, entity) => {
        const domain = entity.domain;
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(entity);
        return acc;
      },
      {} as Record<string, IoTEntity[]>
    );
  }, [filteredEntities]);

  // Create entity names mapping for modal
  const linkableEntityNames = useMemo(
    () =>
      linkableEntities.reduce(
        (acc, entity) => {
          acc[entity.entity_name] = entity.friendly_name || entity.entity_name;
          return acc;
        },
        {} as Record<string, string>
      ),
    [linkableEntities]
  );

  // Handler functions for linking
  const handleIndividualLink = async (entityId: string) => {
    setModalMode('individual');
    linkSelection.clearSelection();
    linkSelection.toggleEntitySelection(entityId);
    setShowLinkModal(true);
  };

  const handleBulkLinkClick = () => {
    setModalMode('bulk');
    setShowLinkModal(true);
  };

  const handleLinkConfirm = async () => {
    const entityIds = Array.from(linkSelection.selectedEntities);
    if (entityIds.length === 0) return;

    let success = false;
    if (modalMode === 'bulk') {
      success = await operations.bulkLinkEntities(entityIds);
    } else if (entityIds.length === 1) {
      success = await operations.linkEntity(entityIds[0]);
    }

    if (success) {
      linkSelection.exitBulkMode();
      setShowLinkModal(false);
      onRefreshData();
    }
  };

  // Handler functions for unlinking
  const handleIndividualUnlink = async (entityId: string) => {
    setModalMode('individual');
    unlinkSelection.clearSelection();
    unlinkSelection.toggleEntitySelection(entityId);
    setShowUnlinkModal(true);
  };

  const handleBulkUnlinkClick = () => {
    setModalMode('bulk');
    setShowUnlinkModal(true);
  };

  const handleUnlinkConfirm = async () => {
    const entityIds = Array.from(unlinkSelection.selectedEntities);
    if (entityIds.length === 0) return;

    let success = false;
    if (modalMode === 'bulk') {
      success = await operations.bulkUnlinkEntities(entityIds);
    } else if (entityIds.length === 1) {
      success = await operations.unlinkEntity(entityIds[0]);
    }

    if (success) {
      unlinkSelection.exitBulkMode();
      setShowUnlinkModal(false);
      onRefreshData();
    }
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
        return null; // No icon for unknown domains
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

  return (
    <VStack space="sm" className="p-1">
      {/* Linked Controls Section */}
      {/* Bulk Unlink Action Bar */}
      {entities.length > 0 && (
        <BulkActionBar
          selectedCount={unlinkSelection.selectedEntities.size}
          bulkMode={unlinkSelection.bulkMode}
          actionType="unlink"
          onEnterBulkMode={unlinkSelection.enterBulkMode}
          onExitBulkMode={unlinkSelection.exitBulkMode}
          onBulkAction={handleBulkUnlinkClick}
        />
      )}

      {entities.length === 0 ? (
        <VStack
          className="mb-1 items-center rounded-lg border border-dashed border-typography-300 p-6"
          space="sm">
          <Icon as={ListX} size="xl" className="text-typography-400" />
          <Text className="text-center text-typography-500">
            No IoT controls linked to this stage
          </Text>
          <Text className="text-center text-sm text-typography-400">
            Link controls below to monitor this grow stage
          </Text>
        </VStack>
      ) : (
        <ScrollView
          className="mb-2 mt-3 max-h-96 rounded-md border border-outline-50 pb-2 pl-3"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}>
          <VStack space="md" className="pb-2 pr-4">
            {Object.entries(groupedEntities).map(
              ([gatewayName, { gateway, entitiesByDomain }], index) => (
                <VStack key={gatewayName} space="sm">
                  {/* Gateway Header */}
                  <HStack
                    className={`items-center justify-between ${index === 0 ? 'mb-0 mt-3' : 'mt-3'}`}>
                    <Text className="text-md font-semibold italic text-typography-600">
                      {gatewayName}
                    </Text>
                    {gateway && <InfoBadge {...getConnectionBadgeProps('connected')} size="sm" />}
                  </HStack>

                  {/* Gateway Entities grouped by domain */}
                  <VStack space="sm">
                    {Object.entries(entitiesByDomain).map(([domain, domainEntities]) => (
                      <VStack key={domain} space="xs">
                        <HStack className="mt-1 items-center">
                          <Text className="text-md capitalize text-typography-500">{domain}</Text>
                        </HStack>

                        <VStack space="sm">
                          {domainEntities.map((entity: EntityWithState) => (
                            <EntityCard
                              key={entity.entity_name}
                              entity={entity}
                              entityState={entity.state}
                              isSelected={unlinkSelection.selectedEntities.has(entity.entity_name)}
                              bulkMode={unlinkSelection.bulkMode}
                              showUnlinkButton={true}
                              onSelect={unlinkSelection.toggleEntitySelection}
                              onUnlink={handleIndividualUnlink}
                            />
                          ))}
                        </VStack>
                      </VStack>
                    ))}
                  </VStack>
                </VStack>
              )
            )}
          </VStack>
        </ScrollView>
      )}

      <Divider className="mb-3 mt-1" />
      {/* Linkable Controls Section */}
      <VStack space="md">
        <HStack className="items-center justify-between">
          <Text className="text-lg font-semibold text-typography-700">Linkable Controls</Text>
          <HStack className="items-center" space="md">
            <InfoBadge text={`${filteredEntities.length} CONTROLS`} variant="default" size="sm" />
            <Pressable onPress={() => setLinkableControlsExpanded(!linkableControlsExpanded)}>
              <Icon
                as={linkableControlsExpanded ? ChevronDown : ChevronRight}
                className="text-typography-500"
                size="lg"
              />
            </Pressable>
          </HStack>
        </HStack>

        {linkableControlsExpanded && (
          <VStack space="sm">
            {/* Search Input */}
            <Input className="mb-2 mt-1">
              <Icon as={Search} className="ml-3 text-typography-500" />
              <InputField
                placeholder="Search controls..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery && (
                <InputSlot className="pr-3">
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Icon as={X} size="sm" className="text-typography-500" />
                  </Pressable>
                </InputSlot>
              )}
            </Input>

            {/* Domain Filters */}
            <HStack className="mt-0 items-center">
              <Icon as={Filter} size="sm" className="text-typography-500" />
              <Text className="ml-2">Domain Filter</Text>
              <Pressable className="ml-auto p-2" onPress={onToggleShowDomainFilters}>
                <Icon
                  as={showDomainFilters ? ChevronDown : SlidersHorizontal}
                  size="lg"
                  className="text-typography-500"
                />
              </Pressable>
            </HStack>

            {showDomainFilters && (
              <VStack space="xs">
                <Text className="text-typography-500">Select domains to display:</Text>
                <VStack space="xs" className="ml-4">
                  {Array.from(new Set(linkableEntities.map((entity) => entity.domain)))
                    .sort()
                    .map((domain) => (
                      <HStack key={domain} className="my-1 items-center justify-between">
                        <Text className="text-md mb-2 ml-2 capitalize">{domain}</Text>
                        <Switch
                          trackColor={{ false: trackFalse, true: trackTrue }}
                          thumbColor={thumbColor}
                          ios_backgroundColor={trackFalse}
                          value={filterPreferences.domains.includes(domain)}
                          onValueChange={() => onToggleDomainFilter(domain)}
                          className="mb-2"
                        />
                      </HStack>
                    ))}
                </VStack>
              </VStack>
            )}

            {/* Device Class Filters */}
            <HStack className="mb-0 mt-0 items-center">
              <Icon as={Filter} size="sm" className="text-typography-500" />
              <Text className="ml-2">Device Class Filter</Text>
              <Pressable className="ml-auto p-2" onPress={onToggleShowDeviceClassFilters}>
                <Icon
                  as={showDeviceClassFilters ? ChevronDown : SlidersHorizontal}
                  size="lg"
                  className="text-typography-500"
                />
              </Pressable>
            </HStack>

            {showDeviceClassFilters && (
              <VStack space="xs">
                <Text className="text-typography-500">Select device classes to display:</Text>
                <VStack space="xs" className="ml-4">
                  {Array.from(
                    new Set(linkableEntities.map((entity) => entity.device_class).filter(Boolean))
                  )
                    .sort()
                    .map((deviceClass) => (
                      <HStack key={deviceClass} className="my-0 items-center justify-between">
                        <Text className="text-md mb-2 ml-1 capitalize">{deviceClass}</Text>
                        <Switch
                          trackColor={{ false: trackFalse, true: trackTrue }}
                          thumbColor={thumbColor}
                          ios_backgroundColor={trackFalse}
                          value={filterPreferences.deviceClasses.includes(deviceClass)}
                          onValueChange={() => onToggleDeviceClassFilter(deviceClass)}
                          className="mb-2"
                        />
                      </HStack>
                    ))}
                </VStack>
              </VStack>
            )}

            {/* Bulk Link Action Bar */}
            {filteredEntities.length > 0 && (
              <BulkActionBar
                selectedCount={linkSelection.selectedEntities.size}
                bulkMode={linkSelection.bulkMode}
                actionType="link"
                onEnterBulkMode={linkSelection.enterBulkMode}
                onExitBulkMode={linkSelection.exitBulkMode}
                onBulkAction={handleBulkLinkClick}
              />
            )}

            {/* Grouped Linkable Entities */}
            {Object.entries(groupedLinkableEntities).length === 0 ? (
              <VStack
                className="mt-2 items-center rounded-lg border border-dashed border-typography-300 p-6"
                space="sm">
                <Icon as={ListX} size="xl" className="text-typography-400" />
                <Text className="text-center text-typography-500">
                  {linkableEntities.length === 0
                    ? 'No controls available to link'
                    : 'No controls match your search'}
                </Text>
                <Text className="text-center text-sm text-typography-400">
                  {linkableEntities.length === 0
                    ? 'Add IoT gateways and controls in the IoT section'
                    : 'Try adjusting your search terms'}
                </Text>
              </VStack>
            ) : (
              <ScrollView
                className="mt-3 max-h-96 rounded-md border border-outline-50 pl-3 pt-1"
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}>
                <VStack space="sm" className="pb-4 pr-4">
                  {Object.entries(groupedLinkableEntities).map(([domain, domainEntities]) => (
                    <VStack key={domain} space="xs">
                      <HStack className="mt-1 items-center">
                        <Text className="text-md capitalize text-typography-500">{domain}</Text>
                      </HStack>

                      <VStack space="sm">
                        {domainEntities.map((entity) => (
                          <EntityCard
                            key={entity.entity_name}
                            entity={entity}
                            isSelected={linkSelection.selectedEntities.has(entity.entity_name)}
                            bulkMode={linkSelection.bulkMode}
                            showLinkButton={true}
                            onSelect={linkSelection.toggleEntitySelection}
                            onLink={handleIndividualLink}
                          />
                        ))}
                      </VStack>
                    </VStack>
                  ))}
                </VStack>
              </ScrollView>
            )}
          </VStack>
        )}
      </VStack>

      {/* Linking Modal */}
      <IoTLinkingModal
        isVisible={showLinkModal}
        mode={modalMode}
        selectedEntities={Array.from(linkSelection.selectedEntities)}
        entityNames={linkableEntityNames}
        grows={[grow]} // Pass the grow object so it can be found by contextGrowId
        contextGrowId={growId}
        contextStageName={stageName}
        contextMode={true}
        onAssign={handleLinkConfirm}
        onClose={() => setShowLinkModal(false)}
      />

      {/* Unlink Confirmation Modal */}
      <IoTUnlinkConfirmationModal
        isOpen={showUnlinkModal}
        onClose={() => setShowUnlinkModal(false)}
        onConfirm={handleUnlinkConfirm}
        mode={modalMode}
        selectedEntities={entities.filter((entity) =>
          unlinkSelection.selectedEntities.has(entity.entity_name)
        )}
        grows={[grow]} // Pass the current grow so the modal can display the grow name
      />
    </VStack>
  );
};
