import { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import { Card } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Icon } from '~/components/ui/icon';
import { Switch } from '~/components/ui/switch';
import { Spinner } from '~/components/ui/spinner';
import { Pressable } from '~/components/ui/pressable';
import { Divider } from '~/components/ui/divider';
import {
  Activity,
  Bot,
  Calculator,
  ToggleRight,
  Search,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  ListX,
  X,
  Zap,
  ZapOff,
  Thermometer,
  Droplet,
  CirclePlus,
  CircleMinus,
  Save,
} from 'lucide-react-native';
import { CountBadge } from '~/components/ui/count-badge';
import { IoTGateway, IoTEntity, HAState } from '~/lib/iot';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getSwitchColors } from '~/lib/switchUtils';
import { IoTFilterPreferences } from '~/lib/userPreferences';

interface ControlPanelSectionProps {
  gateway: IoTGateway | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'unknown';
  enabledStates: string[];
  currentStates: HAState[];
  states: HAState[];
  enabledEntities: IoTEntity[];
  enabledEntitiesSet: Set<string>;
  isControlling: Set<string>;
  pendingValues: Record<string, string>;
  searchQuery: string;
  filterEnabled: boolean;
  filterPreferences: IoTFilterPreferences;
  showFilters: boolean;
  onSearchQueryChange: (query: string) => void;
  onFilterEnabledChange: (enabled: boolean) => void;
  onToggleShowFilters: () => void;
  onToggleDomainFilter: (domain: string) => void;
  onHandleToggle: (entityId: string, domain: string, currentState: string) => void;
  onHandleNumberChange: (entityId: string, value: string) => void;
  onAdjustNumberValue: (entityId: string, increment: boolean, currentValue: string) => void;
  onSaveNumberValue: (entityId: string, pendingValue: string) => void;
  onHandleEntityToggle: (
    entityId: string,
    entityType: string,
    friendlyName: string,
    enabled: boolean
  ) => void;
}

export function ControlPanelSection({
  gateway,
  connectionStatus,
  enabledStates,
  currentStates,
  states,
  enabledEntities,
  enabledEntitiesSet,
  isControlling,
  pendingValues,
  searchQuery,
  filterEnabled,
  filterPreferences,
  showFilters,
  onSearchQueryChange,
  onFilterEnabledChange,
  onToggleShowFilters,
  onToggleDomainFilter,
  onHandleToggle,
  onHandleNumberChange,
  onAdjustNumberValue,
  onSaveNumberValue,
  onHandleEntityToggle,
}: ControlPanelSectionProps) {
  const { theme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);

  // Show content if connected, even without a saved gateway
  if (!gateway && connectionStatus !== 'connected') {
    return (
      <VStack className="items-center justify-center p-8" space="md">
        <Text className="text-center text-typography-500">Gateway data not available</Text>
        <Icon as={ListX} size="xl" className="text-typography-400" />
      </VStack>
    );
  }

  // Group current states by domain for display
  const groupedStates = currentStates.reduce(
    (acc, state) => {
      const domain = state.entity_id.split('.')[0];
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(state);
      return acc;
    },
    {} as Record<string, HAState[]>
  );

  // Filter states for selection interface
  const filteredStates = states.filter((state) => {
    const domain = state.entity_id.split('.')[0];
    const friendlyName = state.attributes.friendly_name || '';
    const searchLower = searchQuery.toLowerCase();
    const matchesDomain =
      filterPreferences.showAllDomains || filterPreferences.domains.includes(domain);
    const matchesSearch =
      searchQuery === '' ||
      state.entity_id.toLowerCase().includes(searchLower) ||
      friendlyName.toLowerCase().includes(searchLower) ||
      (state.attributes.device_class &&
        state.attributes.device_class.toLowerCase().includes(searchLower));
    const matchesEnabledFilter = !filterEnabled || enabledEntitiesSet.has(state.entity_id);
    return matchesDomain && matchesSearch && matchesEnabledFilter;
  });

  return (
    <VStack space="md" className="p-2">
      <HStack className="gap-2">
        <CountBadge count={enabledStates.length} label="ASSIGNED" variant="green-dark" size="md" />
        <CountBadge count={filteredStates.length} label="CONTROLS" variant="success" size="md" />
      </HStack>

      {/* Enabled Controls Section */}
      {enabledStates.length === 0 ? (
        <VStack className="items-center pt-6" space="md">
          <Text className="text-center text-typography-500">No controls assigned yet</Text>
          <Icon as={ListX} size="xl" className="text-typography-500" />
        </VStack>
      ) : (
        <VStack space="sm">
          {/* Group states by domain */}
          {Object.entries(groupedStates).map(([domain, domainStates]) => (
            <VStack key={domain} space="md">
              <HStack className="mt-4">
                {domain === 'sensor' && <Icon as={Activity} className="text-typography-500" />}
                {domain === 'number' && <Icon as={Calculator} className="text-typography-500" />}
                {domain === 'automation' && <Icon as={Bot} className="text-typography-500" />}
                {domain === 'switch' && <Icon as={ToggleRight} className="text-typography-500" />}
                <Text className="text-md ml-2 font-semibold capitalize text-typography-600">
                  {domain} ({domainStates.length})
                </Text>
              </HStack>
              {domainStates.map((state) => {
                const friendlyName = state.attributes.friendly_name || state.entity_id;
                const isEntityControlling = isControlling.has(state.entity_id);

                return (
                  <Card key={state.entity_id} className="bg-background-50 p-4">
                    <HStack className="items-center" space="sm">
                      {/* State Icon for switches and automations */}
                      {(domain === 'switch' || domain === 'automation') &&
                        (state.state === 'on' ? (
                          <Icon as={Zap} className="text-green-500" />
                        ) : (
                          <Icon as={ZapOff} className="text-typography-400" />
                        ))}

                      {/* Entity Name */}
                      <VStack className="flex-1">
                        {/* Sensor display with icon and value */}
                        {domain === 'sensor' && (
                          <HStack>
                            {state.attributes.device_class === 'temperature' && (
                              <Icon as={Thermometer} />
                            )}
                            {state.attributes.device_class === 'humidity' && <Icon as={Droplet} />}
                            <Text className="ml-3 font-medium">{friendlyName}</Text>
                            <Text className="text-md ml-auto text-typography-500">
                              {state.state}
                              {state.attributes.unit_of_measurement &&
                                ` ${state.attributes.unit_of_measurement}`}
                            </Text>
                          </HStack>
                        )}

                        {/* Other domains display friendly name */}
                        {domain !== 'sensor' && (
                          <>
                            <Text className="font-medium">{friendlyName}</Text>

                            {domain === 'number' && (
                              <Text className="text-md mt-1 text-typography-500">
                                Current: {state.state}
                                {state.attributes.unit_of_measurement &&
                                  ` ${state.attributes.unit_of_measurement}`}
                              </Text>
                            )}
                          </>
                        )}
                      </VStack>

                      {/* Domain-specific controls */}
                      <HStack className="items-center" space="sm">
                        {isEntityControlling && (
                          <Spinner size="small" className="mr-6 mt-2 text-success-500" />
                        )}

                        {/* Switch and Automation Toggle */}
                        {(domain === 'switch' || domain === 'automation') &&
                          !isEntityControlling && (
                            <Switch
                              trackColor={{ false: trackFalse, true: trackTrue }}
                              thumbColor={thumbColor}
                              ios_backgroundColor={trackFalse}
                              value={state.state === 'on'}
                              onValueChange={() =>
                                onHandleToggle(state.entity_id, domain, state.state)
                              }
                              disabled={isEntityControlling}
                            />
                          )}

                        {/* Number Input */}
                        {domain === 'number' && !isEntityControlling && (
                          <Input className="mt-4 w-20">
                            <InputField
                              value={pendingValues[state.entity_id] ?? state.state}
                              onChangeText={(value) => onHandleNumberChange(state.entity_id, value)}
                              keyboardType="numeric"
                              editable={!isEntityControlling}
                            />
                          </Input>
                        )}
                      </HStack>
                    </HStack>
                    {/* Number input controls */}
                    {domain === 'number' && (
                      <HStack className="mt-3 gap-9">
                        <Pressable
                          onPress={() =>
                            onAdjustNumberValue(
                              state.entity_id,
                              false,
                              pendingValues[state.entity_id] ?? state.state
                            )
                          }
                          disabled={isEntityControlling}>
                          <Icon as={CircleMinus} size="xl" className="text-typography-600" />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            onAdjustNumberValue(
                              state.entity_id,
                              true,
                              pendingValues[state.entity_id] ?? state.state
                            )
                          }
                          disabled={isEntityControlling}>
                          <Icon as={CirclePlus} size="xl" className="text-typography-600" />
                        </Pressable>
                        {pendingValues[state.entity_id] && (
                          <Pressable
                            className="ml-auto"
                            onPress={() =>
                              onSaveNumberValue(state.entity_id, pendingValues[state.entity_id])
                            }
                            disabled={isEntityControlling}>
                            <Icon as={Save} size="xl" className="text-typography-600" />
                          </Pressable>
                        )}
                      </HStack>
                    )}
                  </Card>
                );
              })}
            </VStack>
          ))}
        </VStack>
      )}

      {/* Control Selection Interface - Always Visible */}
      <VStack space="xl" className="mt-4">
        <Divider />

        {/* Search and Filter Controls */}
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

          <HStack className="items-center">
            <Icon as={Filter} size="lg" className="text-typography-500" />
            <Text className="ml-2">Show assigned only</Text>
            <Switch
              trackColor={{ false: trackFalse, true: trackTrue }}
              thumbColor={thumbColor}
              ios_backgroundColor={trackFalse}
              value={filterEnabled}
              onValueChange={onFilterEnabledChange}
              className="ml-auto"
            />
          </HStack>

          {/* Domain Filters */}
          <VStack space="sm">
            <HStack className="mt-1 items-center">
              <Icon as={Filter} size="lg" className="text-typography-500" />
              <Text className="ml-2">Domain Filter</Text>
              <Button
                className="ml-auto"
                variant="solid"
                action="primary"
                size="sm"
                onPress={onToggleShowFilters}>
                <ButtonText>Configure</ButtonText>
                <ButtonIcon as={showFilters ? ChevronDown : SlidersHorizontal} size="sm" />
              </Button>
            </HStack>

            {showFilters && (
              <VStack space="sm">
                <VStack space="xs">
                  <Text className="text-typography-500">Select domains to display:</Text>
                  <VStack space="xs">
                    {Array.from(new Set(states.map((state) => state.entity_id.split('.')[0])))
                      .sort()
                      .map((domain) => (
                        <HStack
                          key={domain}
                          className="my-1 ml-5 items-center justify-between border-b border-background-200">
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
              </VStack>
            )}
          </VStack>
        </VStack>

        {/* Grouped States for Selection */}
        {Object.entries(
          filteredStates.reduce(
            (acc, state) => {
              const domain = state.entity_id.split('.')[0];
              if (!acc[domain]) acc[domain] = [];
              acc[domain].push(state);
              return acc;
            },
            {} as Record<string, HAState[]>
          )
        ).map(([domain, domainStates]) => (
          <VStack key={domain} className="p-0" space="sm">
            <Divider className="mb-3" />
            <HStack className="mb-2 items-center">
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
              <Badge className="ml-auto" variant="outline" action="muted">
                <Text size="xs">{domainStates.length}</Text>
              </Badge>
            </HStack>

            {domainStates.map((state) => {
              const isEnabled = enabledEntitiesSet.has(state.entity_id);
              const friendlyName = state.attributes.friendly_name || state.entity_id;

              return (
                <Card key={state.entity_id} className="bg-background-0 p-2">
                  <VStack space="sm">
                    <HStack className="items-center justify-between">
                      <VStack className="mr-2 flex-1">
                        <Text className="font-semibold">{friendlyName}</Text>
                        {state.attributes.device_class && (
                          <HStack>
                            <Text className="ml-2 text-typography-400">Device Class: </Text>
                            <Text className="capitalize italic text-typography-400">
                              {state.attributes.device_class}
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                      <VStack className="items-end" space="xs">
                        <Switch
                          trackColor={{ false: trackFalse, true: trackTrue }}
                          thumbColor={thumbColor}
                          ios_backgroundColor={trackFalse}
                          value={isEnabled}
                          onValueChange={(value) => {
                            onHandleEntityToggle(state.entity_id, domain, friendlyName, value);
                          }}
                        />
                      </VStack>
                    </HStack>
                  </VStack>
                </Card>
              );
            })}
          </VStack>
        ))}
      </VStack>
    </VStack>
  );
}
