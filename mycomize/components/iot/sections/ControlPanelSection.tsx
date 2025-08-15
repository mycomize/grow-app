import { useState, useMemo } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Switch } from '~/components/ui/switch';
import { Pressable } from '~/components/ui/pressable';
import { Divider } from '~/components/ui/divider';
import { ScrollView } from '~/components/ui/scroll-view';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { getSwitchColors } from '~/lib/switchUtils';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import {
  Activity,
  Bot,
  Calculator,
  ToggleRight,
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
import { IoTGateway, IoTEntity } from '~/lib/iot';
import { IoTFilterPreferences } from '~/lib/iotTypes';
import { IoTLinkingModal } from '~/components/modals/IoTLinkingModal';
import { IoTUnlinkConfirmationModal } from '~/components/modals/IoTUnlinkConfirmationModal';
import { BulkGrow, stageLabels } from '~/lib/growTypes';
import { Input, InputField, InputSlot } from '~/components/ui/input';

// Import our shared hooks and components
import { useIoTEntitySelection } from '~/lib/iot/useIoTEntitySelection';
import { useIoTOperations } from '~/lib/iot/useIoTOperations';
import { useEntitySearch } from '~/lib/iot/useEntitySearch';
import { EntityCard } from '~/components/iot/EntityCard';
import { BulkActionBar } from '~/components/iot/BulkActionBar';

// This file uses "Controls" as the name in the UI for entities
interface ControlPanelSectionProps {
  gateway: IoTGateway | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'unknown';
  linkedEntities: IoTEntity[]; // See useHAEntityManager.tsx
  linkableEntities: IoTEntity[]; // See useHAEntityManager.tsx
  filterPreferences: IoTFilterPreferences;
  showDomainFilters: boolean;
  showDeviceClassFilters: boolean;
  grows: BulkGrow[];

  onToggleShowDomainFilters: () => void;
  onToggleShowDeviceClassFilters: () => void;
  onToggleDomainFilter: (domain: string) => void;
  onToggleDeviceClassFilter: (deviceClass: string) => void;
  onBulkLink: (entityIds: string[], growId: number, stage: string) => void;
  onIndividualLink: (entityId: string, growId: number, stage: string) => void;
  onBulkUnlink: (entityIds: string[]) => void;
  onIndividualUnlink: (entityId: string) => void;
}

export function ControlPanelSection({
  gateway,
  connectionStatus,
  linkedEntities,
  linkableEntities,
  filterPreferences,
  showDomainFilters,
  showDeviceClassFilters,
  grows,
  onToggleShowDomainFilters,
  onToggleShowDeviceClassFilters,
  onToggleDomainFilter,
  onToggleDeviceClassFilter,
  onBulkLink,
  onIndividualLink,
  onBulkUnlink,
  onIndividualUnlink,
}: ControlPanelSectionProps) {
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);

  // Use shared hooks for selection and operations
  const linkSelection = useIoTEntitySelection();
  const unlinkSelection = useIoTEntitySelection();
  const operations = useIoTOperations(); // No context for control panel
  const { searchQuery, setSearchQuery, filteredEntities } = useEntitySearch(
    linkableEntities,
    filterPreferences
  );

  // Modal state
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [modalMode, setModalMode] = useState<'bulk' | 'individual'>('bulk');

  // Section expansion state
  const [linkedControlsExpanded, setLinkedControlsExpanded] = useState(true);
  const [linkableControlsExpanded, setLinkableControlsExpanded] = useState(true);

  /**
   * Group linked entities by grow name, then sort by stage within each grow
   * Converts the linkedEntities array into grow name-grouped object with stage sorting
   */
  const groupedLinkedEntities = useMemo(() => {
    // Create a mapping from grow ID to grow name for quick lookup
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

    // Sort entities within each grow by stage
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

  // Handler functions for linking
  const handleIndividualLink = async (entityId: string) => {
    setModalMode('individual');
    linkSelection.clearSelection();
    linkSelection.toggleEntitySelection(entityId);
    setShowLinkingModal(true);
  };

  const handleBulkLinkClick = () => {
    setModalMode('bulk');
    setShowLinkingModal(true);
  };

  const handleLinkingSubmit = async (growId: number, stage: string) => {
    const entityIds = Array.from(linkSelection.selectedEntities);
    if (entityIds.length === 0) return;

    if (modalMode === 'bulk') {
      onBulkLink(entityIds, growId, stage);
      linkSelection.exitBulkMode();
    } else if (entityIds.length === 1) {
      onIndividualLink(entityIds[0], growId, stage);
    }

    setShowLinkingModal(false);
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

    if (modalMode === 'bulk') {
      onBulkUnlink(entityIds);
      unlinkSelection.exitBulkMode();
    } else if (entityIds.length === 1) {
      onIndividualUnlink(entityIds[0]);
    }

    setShowUnlinkModal(false);
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

  // Create entity names mapping for modal
  const linkableEntityNames = linkableEntities.reduce(
    (acc, entity) => {
      acc[entity.entity_name] = entity.friendly_name || entity.entity_name;
      return acc;
    },
    {} as Record<string, string>
  );

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
            <InfoBadge
              text={`${gateway ? linkedEntities.length : 0} LINKED`}
              variant="default"
              size="sm"
            />
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
            selectedCount={unlinkSelection.selectedEntities.size}
            bulkMode={unlinkSelection.bulkMode}
            actionType="unlink"
            onEnterBulkMode={unlinkSelection.enterBulkMode}
            onExitBulkMode={unlinkSelection.exitBulkMode}
            onBulkAction={handleBulkUnlinkClick}
          />
        )}
      </VStack>

      {linkedControlsExpanded && (
        <>
          {/* Linked Controls Content. Each entry here should have a linked grow id */}
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
              className="max-h-96 rounded-md border border-outline-50 pl-3"
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
                          <VStack key={`${growName}-${stageName}`} space="xs">
                            <Text className="text-typography-500">{stageName}</Text>
                            {stageEntities.map((entity) => (
                              <EntityCard
                                key={entity.entity_name}
                                entity={entity}
                                isSelected={unlinkSelection.selectedEntities.has(
                                  entity.entity_name
                                )}
                                bulkMode={unlinkSelection.bulkMode}
                                showUnlinkButton={true}
                                onSelect={unlinkSelection.toggleEntitySelection}
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

      {/* Linkable Controls Section. All of these entries have no linked grow */}
      <VStack space="xl" className="mt-1">
        <Divider />

        <HStack className="items-center justify-between">
          <Text className="text-lg font-semibold text-typography-700">Linkable Controls</Text>
          <HStack className="items-center" space="md">
            {/* filteredEntities are a subset of linkableEntities based on the domain and device 
                class filters active at the time */}
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
                        <Text className="text-md mb-2 capitalize">{domain}</Text>
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
            <HStack className="mb-1 items-center">
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
                      <HStack key={deviceClass} className="my-1 items-center justify-between ">
                        <Text className="text-md mb-2 capitalize">{deviceClass}</Text>
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
                className="max-h-96 rounded-md border border-outline-50 pl-3"
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
                      <HStack className="mt-2 items-center">
                        <Text className="text-md capitalize text-typography-500">{domain}</Text>
                      </HStack>

                      <VStack space="xs">
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
        isVisible={showLinkingModal}
        mode={modalMode}
        selectedEntities={Array.from(linkSelection.selectedEntities)}
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
          unlinkSelection.selectedEntities.has(entity.entity_name)
        )}
        grows={grows}
      />
    </VStack>
  );
}
