import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { ScrollView } from '~/components/ui/scroll-view';
import { Pressable } from '~/components/ui/pressable';
import { Input, InputField, InputSlot } from '~/components/ui/input';
import {
  CircuitBoard,
  Plus,
  Unlink2,
  Activity,
  Calculator,
  Bot,
  ToggleRight,
  Search,
  X,
} from 'lucide-react-native';
import { CountBadge } from '~/components/ui/count-badge';
import { IoTEntity } from '~/lib/iot';

interface StageIoTControlsProps {
  stageId: string;
  stageName: string;
  growId?: number;
  linkedControls?: IoTEntity[];
  availableControls?: IoTEntity[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onLinkControl?: (controlId: number) => void;
  onUnlinkControl?: (controlId: number) => void;
  onRefresh?: () => void;
}

export const StageIoTControls: React.FC<StageIoTControlsProps> = ({
  stageId,
  stageName,
  growId,
  linkedControls = [],
  availableControls = [],
  searchQuery = '',
  onSearchChange,
  onLinkControl,
  onUnlinkControl,
  onRefresh,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  // Get domain icon matching ControlPanelSection
  const getDomainIcon = (domain: string) => {
    switch (domain.toLowerCase()) {
      case 'sensor':
        return Activity;
      case 'number':
        return Calculator;
      case 'automation':
        return Bot;
      case 'switch':
        return ToggleRight;
      default:
        return CircuitBoard;
    }
  };

  // Group controls by domain
  const groupControlsByDomain = (controls: IoTEntity[]) => {
    return controls.reduce(
      (acc, control) => {
        const domain = control.entity_type.toLowerCase();
        if (!acc[domain]) {
          acc[domain] = [];
        }
        acc[domain].push(control);
        return acc;
      },
      {} as Record<string, IoTEntity[]>
    );
  };

  // Filter available controls by search query
  const filteredAvailableControls = availableControls.filter((control) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const friendlyName = control.friendly_name?.toLowerCase() || '';
    const entityName = control.entity_name.toLowerCase();
    const deviceClass = control.last_attributes?.device_class?.toLowerCase() || '';

    return (
      friendlyName.includes(query) || entityName.includes(query) || deviceClass.includes(query)
    );
  });

  const linkedControlsByDomain = groupControlsByDomain(linkedControls);
  const availableControlsByDomain = groupControlsByDomain(filteredAvailableControls);

  // Render control item for linking/unlinking
  const renderControlItem = (control: IoTEntity, isLinked: boolean) => {
    const DomainIcon = getDomainIcon(control.entity_type);

    return (
      <Card key={control.id} variant="outline" className="p-3">
        <HStack className="items-center justify-between">
          <HStack className="flex-1 items-center" space="sm">
            <Icon as={DomainIcon} className="text-typography-500" />
            <VStack className="flex-1">
              <Text className="font-medium text-typography-700" numberOfLines={1}>
                {control.friendly_name || control.entity_name}
              </Text>
              {control.last_attributes?.device_class && (
                <Text className="text-sm capitalize text-typography-500">
                  {control.last_attributes.device_class}
                </Text>
              )}
              <Text className="text-xs capitalize text-typography-400">{control.entity_type}</Text>
            </VStack>
          </HStack>

          {/* Link/Unlink button */}
          <Pressable
            onPress={() => {
              if (isLinked) {
                onUnlinkControl?.(control.id);
              } else {
                onLinkControl?.(control.id);
              }
            }}
            className="p-2">
            {isLinked ? (
              <Icon as={Unlink2} size="md" className="text-error-500" />
            ) : (
              <Icon as={Plus} size="md" className="text-success-500" />
            )}
          </Pressable>
        </HStack>
      </Card>
    );
  };

  // Render domain section
  const renderDomainSection = (domain: string, controls: IoTEntity[], isLinkedSection: boolean) => {
    const DomainIcon = getDomainIcon(domain);

    return (
      <VStack key={domain} space="sm">
        {/* Domain header */}
        <HStack className="mt-4">
          <Icon as={DomainIcon} className="text-typography-500" />
          <Text className="text-md ml-2 font-semibold capitalize text-typography-600">
            {domain}
          </Text>
          <CountBadge
            count={controls.length}
            label={controls.length === 1 ? 'control' : 'controls'}
            variant="success"
            size="sm"
            className="ml-auto"
          />
        </HStack>

        {/* Domain controls */}
        <VStack space="xs">
          {controls.map((control) => renderControlItem(control, isLinkedSection))}
        </VStack>
      </VStack>
    );
  };

  return (
    <VStack space="md">
      {/* Header with controls count and actions */}
      <HStack className="items-center justify-between">
        <HStack className="items-center" space="sm">
          <Icon as={CircuitBoard} className="text-typography-600" />
          <Text className="font-semibold text-typography-600">{stageName} Controls</Text>
          <CountBadge
            count={linkedControls.length}
            label={linkedControls.length === 1 ? 'linked' : 'linked'}
            variant="success"
            size="sm"
          />
        </HStack>

        <HStack space="sm">
          {onRefresh && (
            <Button variant="outline" size="sm" onPress={handleRefresh} disabled={refreshing}>
              <ButtonText>{refreshing ? 'Refreshing...' : 'Refresh'}</ButtonText>
            </Button>
          )}
        </HStack>
      </HStack>

      {/* Linked Controls Section */}
      <VStack space="md">
        <Text className="text-md font-medium text-typography-600">Linked Controls</Text>

        {linkedControls.length === 0 ? (
          <VStack
            className="items-center rounded-lg border border-dashed border-typography-300 p-6"
            space="md">
            <Icon as={CircuitBoard} size="xl" className="text-typography-400" />
            <VStack className="items-center" space="sm">
              <Text className="text-center font-semibold text-typography-600">
                No Controls Linked
              </Text>
              <Text className="text-center text-typography-500">
                Link IoT controls to monitor and control devices for the {stageName} stage.
              </Text>
            </VStack>
            <Button
              variant="outline"
              action="primary"
              onPress={() => setShowAvailable(!showAvailable)}>
              <Icon as={Plus} className="mr-2" />
              <ButtonText>{showAvailable ? 'Hide' : 'Show'} Available Controls</ButtonText>
            </Button>
          </VStack>
        ) : (
          <VStack space="sm">
            {Object.entries(linkedControlsByDomain).map(([domain, controls]) =>
              renderDomainSection(domain, controls, true)
            )}
            <Button
              variant="outline"
              action="secondary"
              size="sm"
              onPress={() => setShowAvailable(!showAvailable)}
              className="mt-4">
              <Icon as={Plus} size="sm" className="mr-1" />
              <ButtonText>{showAvailable ? 'Hide' : 'Link More'} Controls</ButtonText>
            </Button>
          </VStack>
        )}
      </VStack>

      {/* Available Controls Section */}
      {showAvailable && (
        <VStack space="md">
          <Text className="text-md font-medium text-typography-600">Available Controls</Text>

          {/* Search Input */}
          {onSearchChange && (
            <Input className="mb-4">
              <Icon as={Search} className="ml-3 text-typography-500" />
              <InputField
                placeholder="Search controls..."
                value={searchQuery}
                onChangeText={onSearchChange}
              />
              {searchQuery && (
                <InputSlot className="pr-3">
                  <Pressable onPress={() => onSearchChange('')}>
                    <Icon as={X} size="sm" className="text-typography-500" />
                  </Pressable>
                </InputSlot>
              )}
            </Input>
          )}

          {filteredAvailableControls.length === 0 ? (
            <VStack
              className="items-center rounded-lg border border-dashed border-typography-300 p-6"
              space="sm">
              <Icon as={Search} size="xl" className="text-typography-400" />
              <Text className="text-center text-typography-500">
                {searchQuery ? 'No controls match your search' : 'No available controls'}
              </Text>
            </VStack>
          ) : (
            <ScrollView className="max-h-80">
              <VStack space="sm">
                {Object.entries(availableControlsByDomain).map(([domain, controls]) =>
                  renderDomainSection(domain, controls, false)
                )}
              </VStack>
            </ScrollView>
          )}
        </VStack>
      )}
    </VStack>
  );
};
