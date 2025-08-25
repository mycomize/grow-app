import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Checkbox, CheckboxIcon, CheckboxIndicator } from '~/components/ui/checkbox';
import { Activity, Bot, Calculator, ToggleRight, Link, Unlink, Check } from 'lucide-react-native';
import { IoTEntity } from '~/lib/iot/iot';

interface EntityCardProps {
  entity: IoTEntity;
  entityState?: string;
  isSelected?: boolean;
  bulkMode?: boolean;
  showLinkButton?: boolean;
  showUnlinkButton?: boolean;
  onSelect?: (entityId: string) => void;
  onLink?: (entityId: string) => void;
  onUnlink?: (entityId: string) => void;
}

/**
 * Reusable entity card component for displaying IoT entities
 * Used in both IoT control panel and grow stage IoT controls
 */
export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  entityState,
  isSelected = false,
  bulkMode = false,
  showLinkButton = false,
  showUnlinkButton = false,
  onSelect,
  onLink,
  onUnlink,
}) => {
  const friendlyName = entity.friendly_name || entity.entity_name;

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

  const DomainIcon = getDomainIcon(entity.domain);

  return (
    <Card className="bg-background-0 p-0.5">
      <HStack className="items-center" space="sm">
        {/* Domain Icon - Only show if we have an icon for this domain */}
        {DomainIcon && <Icon as={DomainIcon} size="sm" className="ml-0 text-typography-500" />}

        {/* Entity Information */}
        <VStack className={!DomainIcon ? 'ml-6 flex-1' : 'flex-1'}>
          <Text className="text-sm font-medium text-typography-600">{friendlyName}</Text>
          {entity.device_class && (
            <Text className="text-xs capitalize text-typography-400">{entity.device_class}</Text>
          )}
        </VStack>

        {/* Entity State (if provided) */}
        {entityState && (
          <VStack className="items-end">
            <Text className="text-sm font-medium text-typography-500">{entityState}</Text>
          </VStack>
        )}

        {/* Action Buttons/Checkboxes */}
        <HStack className="items-center" space="xs">
          {/* Individual Link Button - Show only when NOT in bulk mode */}
          {showLinkButton && !bulkMode && onLink && (
            <Pressable onPress={() => onLink(entity.entity_name)} className="p-1">
              <Icon as={Link} size="sm" className="text-typography-500" />
            </Pressable>
          )}

          {/* Individual Unlink Button - Show only when NOT in bulk mode */}
          {showUnlinkButton && !bulkMode && onUnlink && (
            <Pressable onPress={() => onUnlink(entity.entity_name)} className="p-1">
              <Icon as={Unlink} size="sm" className="text-typography-500" />
            </Pressable>
          )}

          {/* Selection Checkbox - Show when in bulk mode */}
          {bulkMode && onSelect && (
            <Checkbox
              value={isSelected ? 'checked' : 'unchecked'}
              isChecked={isSelected}
              onChange={() => onSelect(entity.entity_name)}
              isDisabled={false}>
              <CheckboxIndicator>
                <CheckboxIcon as={Check} />
              </CheckboxIndicator>
            </Checkbox>
          )}
        </HStack>
      </HStack>
    </Card>
  );
};
