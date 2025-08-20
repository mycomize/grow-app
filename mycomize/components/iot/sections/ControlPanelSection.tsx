import { useState, useMemo, useContext } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Switch } from '~/components/ui/switch';
import { Pressable } from '~/components/ui/pressable';
import { Divider } from '~/components/ui/divider';
import { ScrollView } from '~/components/ui/scroll-view';
import { Icon } from '~/components/ui/icon';
import { getSwitchColors } from '~/lib/switchUtils';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  ListX,
  X,
  WifiOff,
} from 'lucide-react-native';
import { InfoBadge } from '~/components/ui/info-badge';
import { IoTEntity } from '~/lib/iot';
import { IoTLinkingModal } from '~/components/modals/IoTLinkingModal';
import { IoTUnlinkConfirmationModal } from '~/components/modals/IoTUnlinkConfirmationModal';
import { stageLabels } from '~/lib/growTypes';
import { Input, InputField, InputSlot } from '~/components/ui/input';

// Zustand stores
import {
  useGatewayById,
  useCurrentGateway,
  useCurrentGatewayConnectionStatus,
} from '~/lib/stores/iot/gatewayStore';

import { useEntityStore, useGatewayEntities } from '~/lib/stores/iot/entityStore';

import { AuthContext } from '~/lib/AuthContext';
import { EntityCard } from '~/components/iot/EntityCard';
import { BulkActionBar } from '~/components/iot/BulkActionBar';

interface ControlPanelSectionProps {
  gatewayId: string;
}

export function ControlPanelSection({ gatewayId }: ControlPanelSectionProps) {
  const { token } = useContext(AuthContext);
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);

  const gateway = useGatewayById(gatewayId === 'new' ? '' : gatewayId);
  const { status: connectionStatus } = useCurrentGatewayConnectionStatus();

  // Use optimized gateway-scoped selector to get all entities in one call
  const gatewayNumericId = gatewayId === 'new' ? -1 : gateway?.id || -1; // for new gateways
  const { linkableEntities, filteredLinkableEntities, linkedEntities } =
    useGatewayEntities(gatewayNumericId);

  // Optional debug logging (can be enabled for troubleshooting)
  // console.log(`[ControlPanelSection] Using gateway ID ${gatewayNumericId} for entity filtering`);
  // console.log(
  //   `[ControlPanelSection] Gateway-scoped entities: ${linkableEntities.length} linkable, ${filteredLinkableEntities.length} filtered, ${linkedEntities.length} linked`
  // );

  const grows = useEntityStore((state) => state.grows);
  const filterPreferences = useEntityStore((state) => state.filterPreferences);
  const linkEntity = useEntityStore((state) => state.linkEntity);
  const unlinkEntity = useEntityStore((state) => state.unlinkEntity);
  const bulkLinkEntities = useEntityStore((state) => state.bulkLinkEntities);
  const bulkUnlinkEntities = useEntityStore((state) => state.bulkUnlinkEntities);
  const toggleDomainFilter = useEntityStore((state) => state.toggleDomainFilter);
  const toggleDeviceClassFilter = useEntityStore((state) => state.toggleDeviceClassFilter);

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showDomainFilters, setShowDomainFilters] = useState(false);
  const [showDeviceClassFilters, setShowDeviceClassFilters] = useState(false);
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [modalMode, setModalMode] = useState<'bulk' | 'individual'>('bulk');
  const [linkedControlsExpanded, setLinkedControlsExpanded] = useState(true);
  const [linkableControlsExpanded, setLinkableControlsExpanded] = useState(true);

  // Separate selections for linking and unlinking
  const [linkSelection, setLinkSelection] = useState<Set<string>>(new Set());
  const [unlinkSelection, setUnlinkSelection] = useState<Set<string>>(new Set());
  const [linkBulkMode, setLinkBulkMode] = useState(false);
  const [unlinkBulkMode, setUnlinkBulkMode] = useState(false);

  // Filter entities based on search query on top of store's domain/device class filters
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredLinkableEntities;
    }

    const searchLower = searchQuery.toLowerCase();
    return filteredLinkableEntities.filter(
      (entity) =>
        entity.friendly_name?.toLowerCase().includes(searchLower) ||
        entity.entity_name.toLowerCase().includes(searchLower) ||
        entity.domain.toLowerCase().includes(searchLower)
    );
  }, [filteredLinkableEntities, searchQuery]);

  /**
   * Group linked entities by grow name, then sort by stage within each grow
   * Optimized to prevent unnecessary re-renders
   */
  const groupedLinkedEntities = useMemo(() => {
    if (linkedEntities.length === 0 || grows.length === 0) {
      return {};
    }

    // Create a stable mapping from grow ID to grow name
    const growIdToName = grows.reduce(
      (acc, grow) => {
        acc[grow.id] = grow.name;
        return acc;
      },
      {} as Record<number, string>
    );

    // Group by grow name first
    const grouped = linkedEntities.reduce(
      (acc, entity) => {
        const growName = entity.linked_grow_id
          ? growIdToName[entity.linked_grow_id] || 'Unknown Grow'
          : 'No Grow';
        if (!acc[growName]) acc[growName] = [];
        acc[growName].push(entity);
        return acc;
      },
      {} as Record<string, IoTEntity[]>
    );

    // Sort entities within each grow by stage (static stage order)
    const stageOrder = [
      'inoculation',
      'spawn_colonization',
      'bulk_colonization',
      'fruiting',
      'harvest',
    ];

    Object.keys(grouped).forEach((growName) => {
      grouped[growName].sort((a, b) => {
        const stageA = a.linked_stage || '';
        const stageB = b.linked_stage || '';

        const indexA = stageOrder.indexOf(stageA);
        const indexB = stageOrder.indexOf(stageB);

        // If stage not found in order, put it at the end
        const orderA = indexA === -1 ? 999 : indexA;
        const orderB = indexB === -1 ? 999 : indexB;

        return orderA - orderB;
      });
    });

    return grouped;
  }, [linkedEntities, grows]);

  // Memoize entity names mapping to prevent unnecessary recalculation
  const linkableEntityNames = useMemo(() => {
    return linkableEntities.reduce(
      (acc, entity) => {
        acc[entity.entity_name] = entity.friendly_name || entity.entity_name;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [linkableEntities]);

  // Handler functions for linking
  const handleIndividualLink = async (entityId: string) => {
    setModalMode('individual');
    setLinkSelection(new Set([entityId]));
    setShowLinkingModal(true);
  };

  const handleBulkLinkClick = () => {
    setModalMode('bulk');
    setShowLinkingModal(true);
  };

  const handleLinkingSubmit = async (growId: number, stage: string) => {
    const entityIds = Array.from(linkSelection);
    if (entityIds.length === 0) return;

    if (!token) return;

    // For new gateways, use -1 as the gateway ID; for existing gateways, require the gateway object
    const effectiveGatewayId = gatewayId === 'new' ? '-1' : gateway?.id.toString() || '';
    if (!effectiveGatewayId) return;

    if (modalMode === 'bulk') {
      await bulkLinkEntities(token, effectiveGatewayId, entityIds, growId, stage);
      setLinkBulkMode(false);
      setLinkSelection(new Set());
    } else if (entityIds.length === 1) {
      await linkEntity(token, effectiveGatewayId, entityIds[0], growId, stage);
    }

    setShowLinkingModal(false);
  };

  // Handler functions for unlinking
  const handleIndividualUnlink = async (entityId: string) => {
    setModalMode('individual');
    setUnlinkSelection(new Set([entityId]));
    setShowUnlinkModal(true);
  };

  const handleBulkUnlinkClick = () => {
    setModalMode('bulk');
    setShowUnlinkModal(true);
  };

  const handleUnlinkConfirm = async () => {
    const entityIds = Array.from(unlinkSelection);
    if (entityIds.length === 0) return;

    if (!token) return;

    // For new gateways, use -1 as the gateway ID; for existing gateways, require the gateway object
    const effectiveGatewayId = gatewayId === 'new' ? '-1' : gateway?.id.toString() || '';
    if (!effectiveGatewayId) return;

    if (modalMode === 'bulk') {
      await bulkUnlinkEntities(token, effectiveGatewayId, entityIds);
      setUnlinkBulkMode(false);
      setUnlinkSelection(new Set());
    } else if (entityIds.length === 1) {
      await unlinkEntity(token, effectiveGatewayId, entityIds[0]);
    }

    setShowUnlinkModal(false);
  };

  // Selection handlers for linking
  const handleLinkToggle = (entityId: string) => {
    setLinkSelection((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  // Selection handlers for unlinking
  const handleUnlinkToggle = (entityId: string) => {
    setUnlinkSelection((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  // Show content if connected, even without a saved gateway
  if (!gateway && connectionStatus !== 'connected') {
    return (
      <VStack className="items-center justify-center p-8" space="md">
        <Icon as={WifiOff} size="xl" className="text-typography-400" />
        <Text className="text-center text-typography-500">
          Gateway data not available. Connect the gateway to get started
        </Text>
      </VStack>
    );
  }

  return (
    <VStack space="md" className="p-2">
      {/* Linked Controls/Entities Section */}
      <VStack space="md">
        <HStack className="items-center justify-between">
          <Text className="text-lg font-semibold text-typography-700">Linked Controls</Text>
          <HStack className="items-center" space="md">
            <InfoBadge text={`${linkedEntities.length} LINKED`} variant="default" size="sm" />
            <Pressable onPress={() => setLinkedControlsExpanded(!linkedControlsExpanded)}>
              <Icon
                as={linkedControlsExpanded ? ChevronDown : ChevronRight}
                className="text-typography-500"
                size="lg"
              />
            </Pressable>
          </HStack>
        </HStack>

        {/* Bulk Unlink Action Bar */}
        {linkedEntities.length > 0 && linkedControlsExpanded && (
          <BulkActionBar
            selectedCount={unlinkSelection.size}
            bulkMode={unlinkBulkMode}
            actionType="unlink"
            onEnterBulkMode={() => setUnlinkBulkMode(true)}
            onExitBulkMode={() => {
              setUnlinkBulkMode(false);
              setUnlinkSelection(new Set());
            }}
            onBulkAction={handleBulkUnlinkClick}
          />
        )}
      </VStack>

      {linkedControlsExpanded && (
        <>
          {/* Linked Controls Content */}
          {linkedEntities.length === 0 ? (
            <VStack
              className="mb-1 mt-2 items-center rounded-lg border border-dashed border-typography-300 p-6"
              space="sm">
              <Icon as={ListX} size="xl" className="text-typography-400" />
              <Text className="text-center text-typography-500">
                {grows.length === 0
                  ? 'No grows available. Add a grow to link controls'
                  : 'No linked controls'}
              </Text>
            </VStack>
          ) : (
            <ScrollView
              className="mt-2 max-h-96 rounded-md border border-outline-50 pl-3 pt-2"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}>
              <VStack space="sm" className="pb-3 pr-4">
                {/* Group linked entities by grow name, then by stage within each grow */}
                {Object.entries(groupedLinkedEntities).map(
                  ([growName, linkedGrowEntities], index) => {
                    // Group entities by stage within this grow
                    const entitiesByStage = linkedGrowEntities.reduce(
                      (acc, entity) => {
                        const stageName = entity.linked_stage
                          ? stageLabels[entity.linked_stage as keyof typeof stageLabels] ||
                            entity.linked_stage
                          : 'Unknown Stage';
                        if (!acc[stageName]) acc[stageName] = [];
                        acc[stageName].push(entity);
                        return acc;
                      },
                      {} as Record<string, IoTEntity[]>
                    );

                    return (
                      <VStack key={growName} space="sm">
                        <HStack className={index === 0 ? 'mt-2' : 'mt-4'}>
                          <Text className="text-md font-semibold italic text-typography-600">
                            {growName}
                          </Text>
                        </HStack>
                        {Object.entries(entitiesByStage).map(([stageName, stageEntities]) => (
                          <VStack key={`${growName}-${stageName}`} space="sm">
                            <Text className="text-typography-500">{stageName}</Text>
                            {stageEntities.map((entity) => (
                              <EntityCard
                                key={entity.entity_name}
                                entity={entity}
                                isSelected={unlinkSelection.has(entity.entity_name)}
                                bulkMode={unlinkBulkMode}
                                showUnlinkButton={true}
                                onSelect={handleUnlinkToggle}
                                onUnlink={handleIndividualUnlink}
                              />
                            ))}
                          </VStack>
                        ))}
                      </VStack>
                    );
                  }
                )}
              </VStack>
            </ScrollView>
          )}
        </>
      )}

      {/* Linkable Controls Section */}
      <VStack space="xl" className="mt-1">
        <Divider />

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
            <HStack className="mt-1 items-center">
              <Icon as={Filter} size="sm" className="text-typography-500" />
              <Text className="ml-2">Domain Filter</Text>
              <Pressable
                className="ml-auto p-2"
                onPress={() => setShowDomainFilters(!showDomainFilters)}>
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
                        <Text className="text-md mb-2 capitalize">{domain}</Text>
                        <Switch
                          trackColor={{ false: trackFalse, true: trackTrue }}
                          thumbColor={thumbColor}
                          ios_backgroundColor={trackFalse}
                          value={filterPreferences.domains.includes(domain)}
                          onValueChange={() => toggleDomainFilter(domain)}
                          className="mb-2"
                        />
                      </HStack>
                    ))}
                </VStack>
              </VStack>
            )}

            {/* Device Class Filters */}
            <HStack className="mb-1 items-center">
              <Icon as={Filter} size="sm" className="text-typography-500" />
              <Text className="ml-2">Device Class Filter</Text>
              <Pressable
                className="ml-auto p-2"
                onPress={() => setShowDeviceClassFilters(!showDeviceClassFilters)}>
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
                      <HStack key={deviceClass} className="my-1 items-center justify-between ">
                        <Text className="text-md mb-2 capitalize">{deviceClass}</Text>
                        <Switch
                          trackColor={{ false: trackFalse, true: trackTrue }}
                          thumbColor={thumbColor}
                          ios_backgroundColor={trackFalse}
                          value={filterPreferences.deviceClasses.includes(deviceClass)}
                          onValueChange={() => toggleDeviceClassFilter(deviceClass)}
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
                selectedCount={linkSelection.size}
                bulkMode={linkBulkMode}
                actionType="link"
                onEnterBulkMode={() => setLinkBulkMode(true)}
                onExitBulkMode={() => {
                  setLinkBulkMode(false);
                  setLinkSelection(new Set());
                }}
                onBulkAction={handleBulkLinkClick}
              />
            )}

            {/* Grouped Linkable Entities */}
            {Object.entries(
              filteredEntities.reduce(
                (acc, entity) => {
                  const domain = entity.domain;
                  if (!acc[domain]) acc[domain] = [];
                  acc[domain].push(entity);
                  return acc;
                },
                {} as Record<string, IoTEntity[]>
              )
            ).length === 0 ? (
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
                className="mt-3 max-h-96 rounded-md border border-outline-50 pl-3 pt-2"
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}>
                <VStack space="sm" className="pb-4 pr-4">
                  {Object.entries(
                    filteredEntities.reduce(
                      (acc, entity) => {
                        const domain = entity.domain;
                        if (!acc[domain]) acc[domain] = [];
                        acc[domain].push(entity);
                        return acc;
                      },
                      {} as Record<string, IoTEntity[]>
                    )
                  ).map(([domain, domainEntities]) => (
                    <VStack key={domain} space="xs">
                      <HStack className="items-center">
                        <Text className="text-md capitalize text-typography-500">{domain}</Text>
                      </HStack>

                      <VStack space="sm">
                        {domainEntities.map((entity) => (
                          <EntityCard
                            key={entity.entity_name}
                            entity={entity}
                            isSelected={linkSelection.has(entity.entity_name)}
                            bulkMode={linkBulkMode}
                            showLinkButton={true}
                            onSelect={handleLinkToggle}
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
        isVisible={showLinkingModal}
        mode={modalMode}
        selectedEntities={Array.from(linkSelection)}
        entityNames={linkableEntityNames}
        grows={grows}
        onAssign={handleLinkingSubmit}
        onClose={() => setShowLinkingModal(false)}
      />

      {/* Unlink Confirmation Modal */}
      <IoTUnlinkConfirmationModal
        isOpen={showUnlinkModal}
        onClose={() => setShowUnlinkModal(false)}
        onConfirm={handleUnlinkConfirm}
        mode={modalMode}
        selectedEntities={linkedEntities.filter((entity) =>
          unlinkSelection.has(entity.entity_name)
        )}
        grows={grows}
      />
    </VStack>
  );
}
