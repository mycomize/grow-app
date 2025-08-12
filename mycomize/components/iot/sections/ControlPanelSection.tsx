import { useState, useMemo } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import { Card } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Switch } from '~/components/ui/switch';
import { Pressable } from '~/components/ui/pressable';
import { Divider } from '~/components/ui/divider';
import { Checkbox, CheckboxIcon, CheckboxIndicator } from '~/components/ui/checkbox';
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
  Check,
  Link,
  Unlink,
  WifiOff,
} from 'lucide-react-native';
import { InfoBadge } from '~/components/ui/info-badge';
import { IoTGateway, IoTEntity } from '~/lib/iot';
import { IoTFilterPreferences } from '~/lib/iotTypes';
import { IoTLinkingModal } from '~/components/modals/IoTLinkingModal';
import { ConfirmationModal } from '~/components/modals/ConfirmationModal';
import { BulkGrow } from '~/lib/growTypes';

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

  // Separate state for link and unlink operations
  const [selectedLinkEntities, setSelectedLinkEntities] = useState<Set<string>>(new Set());
  const [selectedUnlinkEntities, setSelectedUnlinkEntities] = useState<Set<string>>(new Set());

  // Link modal state
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [linkingMode, setLinkingMode] = useState<'bulk' | 'individual'>('bulk');
  const [currentLinkEntityId, setCurrentLinkEntityId] = useState<string | null>(null);
  const [bulkLinkMode, setBulkLinkMode] = useState(false);

  // Unlink modal state
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [unlinkMode, setUnlinkMode] = useState<'bulk' | 'individual'>('bulk');
  const [currentUnlinkEntityId, setCurrentUnlinkEntityId] = useState<string | null>(null);
  const [bulkUnlinkMode, setBulkUnlinkMode] = useState(false);

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState('');

  // Section expansion state
  const [linkedControlsExpanded, setLinkedControlsExpanded] = useState(true);
  const [linkableControlsExpanded, setLinkableControlsExpanded] = useState(true);

  /**
   * Filtered linkable entities based on domain filters, device class filters, and search query
   * Uses useMemo for performance optimization to prevent unnecessary recalculations
   */
  const filteredLinkableEntities = useMemo(() => {
    let filtered = linkableEntities;

    // Apply domain filter - only show entities from selected domains
    if (filterPreferences.domains.length > 0) {
      filtered = filtered.filter((entity) => filterPreferences.domains.includes(entity.domain));
    }

    // Apply device class filter - only show entities with selected device classes
    // Note: entities without device_class are always included if no device class filters are active
    if (filterPreferences.deviceClasses.length > 0) {
      filtered = filtered.filter(
        (entity) =>
          // Include entities that have a device_class matching the filter
          (entity.device_class && filterPreferences.deviceClasses.includes(entity.device_class)) ||
          // Also include entities without device_class (null/undefined) to avoid hiding them
          !entity.device_class
      );
    }

    // Apply search query filter - search in friendly_name and entity_name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((entity) => {
        const friendlyName = (entity.friendly_name || '').toLowerCase();
        const entityName = (entity.entity_name || '').toLowerCase();

        return friendlyName.includes(query) || entityName.includes(query);
      });
    }

    return filtered;
  }, [linkableEntities, filterPreferences.domains, filterPreferences.deviceClasses, searchQuery]);

  /**
   * Group linked entities by domain for organized display
   * Converts the linkedEntities array into domain-grouped object
   */
  const groupedLinkedEntities = useMemo(() => {
    return linkedEntities.reduce(
      (acc, entity) => {
        const domain = entity.domain;
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(entity);
        return acc;
      },
      {} as Record<string, IoTEntity[]>
    );
  }, [linkedEntities]);

  /**
   * Handler for search query changes
   * Updates the search state which triggers filteredLinkableEntities recalculation
   */
  const onSearchQueryChange = (text: string) => {
    setSearchQuery(text);
  };

  // Handler functions for linking
  const handleLinkEntityCheckboxToggle = (entityId: string) => {
    const newSelected = new Set(selectedLinkEntities);
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId);
    } else {
      newSelected.add(entityId);
    }
    setSelectedLinkEntities(newSelected);
  };

  const handleEnterBulkLinkMode = () => {
    setBulkLinkMode(true);
    setSelectedLinkEntities(new Set());
  };

  const handleExitBulkLinkMode = () => {
    setBulkLinkMode(false);
    setSelectedLinkEntities(new Set());
  };

  const handleBulkLinkClick = () => {
    setLinkingMode('bulk');
    setShowLinkingModal(true);
  };

  const handleIndividualLinkClick = (entityId: string) => {
    setCurrentLinkEntityId(entityId);
    setSelectedLinkEntities(new Set([entityId]));
    setLinkingMode('individual');
    setShowLinkingModal(true);
  };

  const handleLinkingSubmit = (growId: number, stage: string) => {
    if (linkingMode === 'bulk') {
      onBulkLink(Array.from(selectedLinkEntities), growId, stage);
      setBulkLinkMode(false); // Exit bulk link mode after successful linking
    } else if (currentLinkEntityId) {
      onIndividualLink(currentLinkEntityId, growId, stage);
    }
    setShowLinkingModal(false);
    setSelectedLinkEntities(new Set());
    setCurrentLinkEntityId(null);
  };

  const handleLinkingModalClose = () => {
    setShowLinkingModal(false);
    setSelectedLinkEntities(new Set());
    setCurrentLinkEntityId(null);
  };

  // Handler functions for unlinking
  const handleUnlinkEntityCheckboxToggle = (entityId: string) => {
    const newSelected = new Set(selectedUnlinkEntities);
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId);
    } else {
      newSelected.add(entityId);
    }
    setSelectedUnlinkEntities(newSelected);
  };

  const handleEnterBulkUnlinkMode = () => {
    setBulkUnlinkMode(true);
    setSelectedUnlinkEntities(new Set());
  };

  const handleExitBulkUnlinkMode = () => {
    setBulkUnlinkMode(false);
    setSelectedUnlinkEntities(new Set());
  };

  const handleBulkUnlinkClick = () => {
    setUnlinkMode('bulk');
    setShowUnlinkModal(true);
  };

  const handleIndividualUnlinkClick = (entityId: string) => {
    setCurrentUnlinkEntityId(entityId);
    setSelectedUnlinkEntities(new Set([entityId]));
    setUnlinkMode('individual');
    setShowUnlinkModal(true);
  };

  const handleUnlinkConfirm = () => {
    if (unlinkMode === 'bulk') {
      onBulkUnlink(Array.from(selectedUnlinkEntities));
      setBulkUnlinkMode(false);
    } else if (currentUnlinkEntityId) {
      onIndividualUnlink(currentUnlinkEntityId);
    }
    setShowUnlinkModal(false);
    setSelectedUnlinkEntities(new Set());
    setCurrentUnlinkEntityId(null);
  };

  const handleUnlinkModalClose = () => {
    setShowUnlinkModal(false);
    setSelectedUnlinkEntities(new Set());
    setCurrentUnlinkEntityId(null);
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

        {/* Bulk Unlink Button or Bulk Unlink Interface - Show below header when there are linked entities */}
        {linkedEntities.length > 0 && linkedControlsExpanded && (
          <HStack className="justify-end">
            {!bulkUnlinkMode ? (
              <Button
                variant="solid"
                action="positive"
                size="sm"
                onPress={handleEnterBulkUnlinkMode}>
                <ButtonIcon as={Unlink} size="sm" className="text-white" />
                <ButtonText className="text-white">Bulk Unlink</ButtonText>
              </Button>
            ) : (
              <HStack className="items-center gap-2">
                <Button
                  variant="solid"
                  action="positive"
                  size="sm"
                  onPress={handleBulkUnlinkClick}
                  disabled={selectedUnlinkEntities.size === 0}>
                  <ButtonIcon as={Unlink} size="sm" className="text-white" />
                  <ButtonText className="text-white">
                    Unlink ({selectedUnlinkEntities.size})
                  </ButtonText>
                </Button>
                <Pressable onPress={handleExitBulkUnlinkMode}>
                  <Icon as={X} size="md" className="text-typography-500" />
                </Pressable>
              </HStack>
            )}
          </HStack>
        )}
      </VStack>

      {linkedControlsExpanded && (
        <>
          {/* Linked Controls Content. Each entry here should have a linked grow id */}
          {linkedEntities.length === 0 ? (
            <VStack
              className="items-center rounded-lg border border-dashed border-typography-300 p-6"
              space="sm">
              <Icon as={ListX} size="xl" className="text-typography-400" />
              <Text className="text-center text-typography-500">
                {grows.length === 0
                  ? 'No grows available. Add a grow to link controls'
                  : 'No linked controls'}
              </Text>
            </VStack>
          ) : (
            <VStack space="sm">
              {/* Group linked entities by domain */}
              {Object.entries(groupedLinkedEntities).map(
                ([domain, linkedDomainEntities], index) => (
                  <VStack key={domain} space="md">
                    <HStack className={index === 0 ? 'mt-2' : 'mt-6'}>
                      {domain === 'sensor' && (
                        <Icon as={Activity} className="text-typography-500" />
                      )}
                      {domain === 'number' && (
                        <Icon as={Calculator} className="text-typography-500" />
                      )}
                      {domain === 'automation' && <Icon as={Bot} className="text-typography-500" />}
                      {domain === 'switch' && (
                        <Icon as={ToggleRight} className="text-typography-500" />
                      )}
                      <Text className="text-md ml-2 font-semibold capitalize text-typography-600">
                        {domain}
                      </Text>
                    </HStack>
                    {linkedDomainEntities.map((entity) => {
                      const friendlyName = entity.friendly_name || entity.entity_name;

                      return (
                        <Card key={entity.entity_name} className="bg-background-0 p-0.5">
                          <HStack className="items-center" space="sm">
                            {/* Entity Name */}
                            <VStack className="flex-1">
                              <Text className="ml-3">{friendlyName}</Text>
                            </VStack>

                            {/* Individual Unlink Icon - Show when NOT in bulk unlink mode */}
                            {!bulkUnlinkMode && (
                              <Pressable
                                onPress={() => handleIndividualUnlinkClick(entity.entity_name)}
                                className="p-1">
                                <Icon as={Unlink} size="md" className="text-typography-500" />
                              </Pressable>
                            )}

                            {/* Selection Checkbox - Show when in bulk unlink mode */}
                            {bulkUnlinkMode && (
                              <Checkbox
                                value={
                                  selectedUnlinkEntities.has(entity.entity_name)
                                    ? 'checked'
                                    : 'unchecked'
                                }
                                isChecked={selectedUnlinkEntities.has(entity.entity_name)}
                                onChange={() =>
                                  handleUnlinkEntityCheckboxToggle(entity.entity_name)
                                }
                                isDisabled={false}>
                                <CheckboxIndicator>
                                  <CheckboxIcon as={Check} />
                                </CheckboxIndicator>
                              </Checkbox>
                            )}
                          </HStack>
                        </Card>
                      );
                    })}
                  </VStack>
                )
              )}
            </VStack>
          )}
        </>
      )}

      {/* Linkable Controls Section. All of these entries have no linked grow */}
      <VStack space="xl" className="mt-4">
        <Divider />

        <HStack className="items-center justify-between">
          <Text className="text-lg font-semibold text-typography-700">Linkable Controls</Text>
          <HStack className="items-center" space="md">
            {/* filteredLinkableEntities are a subset of linkableEntities based on the domain and device 
                class filters active at the time */}
            <InfoBadge
              text={`${filteredLinkableEntities.length} CONTROLS`}
              variant="default"
              size="sm"
            />
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
            <Input className="mb-4 mt-2">
              <Icon as={Search} className="ml-3 text-typography-500" />
              <InputField
                placeholder="Search controls..."
                value={searchQuery}
                onChangeText={onSearchQueryChange}
              />
              {searchQuery && (
                <InputSlot className="pr-3">
                  <Pressable onPress={() => onSearchQueryChange('')}>
                    <Icon as={X} size="sm" className="text-typography-500" />
                  </Pressable>
                </InputSlot>
              )}
            </Input>

            {/* Domain Filters */}
            <HStack className="mt-1 items-center">
              <Icon as={Filter} size="lg" className="text-typography-500" />
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
            <HStack className="mt-3 items-center">
              <Icon as={Filter} size="lg" className="text-typography-500" />
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

            {/* Enter Bulk Link Mode Button */}
            {!bulkLinkMode && filteredLinkableEntities.length > 0 && (
              <HStack className="mt-4 justify-end">
                <Button
                  variant="solid"
                  action="positive"
                  size="sm"
                  onPress={handleEnterBulkLinkMode}>
                  <ButtonIcon as={Link} size="sm" className="text-typography-900" />
                  <ButtonText className="text-typography-900">Bulk Link</ButtonText>
                </Button>
              </HStack>
            )}

            {/* Bulk Linking Interface - When in bulk link mode */}
            {bulkLinkMode && (
              <HStack className="mt-4 items-center justify-end gap-2">
                <Button
                  variant="solid"
                  action="positive"
                  size="sm"
                  onPress={handleBulkLinkClick}
                  disabled={selectedLinkEntities.size === 0}>
                  <ButtonIcon as={Link} size="sm" className="text-typography-900" />
                  <ButtonText className="text-typography-900">
                    Link ({selectedLinkEntities.size})
                  </ButtonText>
                </Button>
                <Pressable onPress={handleExitBulkLinkMode}>
                  <Icon as={X} size="md" className="text-typography-500" />
                </Pressable>
              </HStack>
            )}

            {/* Grouped Linkable Entities for Selection */}
            {Object.entries(
              filteredLinkableEntities.reduce(
                (acc, entity) => {
                  const domain = entity.domain;
                  if (!acc[domain]) acc[domain] = [];
                  acc[domain].push(entity);
                  return acc;
                },
                {} as Record<string, IoTEntity[]>
              )
            ).map(([domain, linkableDomainEntities]) => (
              <VStack key={domain} className="p-0" space="sm">
                <HStack className="mt-4 items-center">
                  {domain === 'sensor' && (
                    <Icon as={Activity} size="lg" className="text-typography-500" />
                  )}
                  {domain === 'automation' && (
                    <Icon as={Bot} size="xl" className="text-typography-500" />
                  )}
                  {domain === 'number' && (
                    <Icon as={Calculator} size="lg" className="text-typography-500" />
                  )}
                  {domain === 'switch' && (
                    <Icon as={ToggleRight} size="lg" className="text-typography-500" />
                  )}
                  <Text className="ml-2 text-lg font-semibold capitalize">{domain}</Text>
                </HStack>

                {linkableDomainEntities.map((entity) => {
                  const friendlyName = entity.friendly_name || entity.entity_name;

                  return (
                    <HStack key={entity.entity_name} className="items-center" space="xs">
                      {/* Linkable Entity Card */}
                      <Card className="flex-1 bg-background-0 p-0.5">
                        <HStack className="items-center justify-between">
                          <VStack className="mx-3 flex-1">
                            <Text className="">{friendlyName}</Text>
                            {entity.device_class && (
                              <HStack>
                                <Text className="ml-2 text-typography-400">Device Class: </Text>
                                <Text className="capitalize italic text-typography-400">
                                  {entity.device_class}
                                </Text>
                              </HStack>
                            )}
                          </VStack>
                          {/* Link Icon - Show only when NOT in bulk link mode */}
                          {!bulkLinkMode && (
                            <Pressable
                              onPress={() => handleIndividualLinkClick(entity.entity_name)}
                              className="p-1">
                              <Icon as={Link} size="md" className="text-typography-500" />
                            </Pressable>
                          )}
                          {/* Selection Checkbox - Show when in bulk link mode */}
                          {bulkLinkMode && (
                            <VStack className="p-1">
                              <Checkbox
                                value={
                                  selectedLinkEntities.has(entity.entity_name)
                                    ? 'checked'
                                    : 'unchecked'
                                }
                                isChecked={selectedLinkEntities.has(entity.entity_name)}
                                onChange={() => handleLinkEntityCheckboxToggle(entity.entity_name)}
                                isDisabled={false}>
                                <CheckboxIndicator>
                                  <CheckboxIcon as={Check} />
                                </CheckboxIndicator>
                              </Checkbox>
                            </VStack>
                          )}
                        </HStack>
                      </Card>
                    </HStack>
                  );
                })}
              </VStack>
            ))}
          </VStack>
        )}
      </VStack>

      {/* Linking Modal */}
      <IoTLinkingModal
        isVisible={showLinkingModal}
        mode={linkingMode}
        selectedEntities={Array.from(selectedLinkEntities)}
        entityNames={linkableEntityNames}
        grows={grows}
        onAssign={handleLinkingSubmit}
        onClose={handleLinkingModalClose}
      />

      {/* Unlink Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUnlinkModal}
        onClose={handleUnlinkModalClose}
        onConfirm={handleUnlinkConfirm}
        type="unlink"
        title="Unlink Confirmation"
        message={
          unlinkMode === 'bulk'
            ? `Are you sure you want to unlink ${selectedUnlinkEntities.size} IoT control${selectedUnlinkEntities.size === 1 ? '' : 's'} from their grow${selectedUnlinkEntities.size === 1 ? '' : 's'}?`
            : 'Are you sure you want to unlink this IoT control from its grow?'
        }
        itemName={
          unlinkMode === 'individual' && currentUnlinkEntityId
            ? linkedEntities.find((e) => e.entity_name === currentUnlinkEntityId)?.friendly_name ||
              currentUnlinkEntityId
            : undefined
        }
      />
    </VStack>
  );
}
