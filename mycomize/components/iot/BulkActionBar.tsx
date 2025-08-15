import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Link, Unlink, X } from 'lucide-react-native';

interface BulkActionBarProps {
  selectedCount: number;
  bulkMode: boolean;
  actionType: 'link' | 'unlink';
  onEnterBulkMode: () => void;
  onExitBulkMode: () => void;
  onBulkAction: () => void;
}

/**
 * Shared bulk operation toolbar component
 * Used for both linking and unlinking operations
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  bulkMode,
  actionType,
  onEnterBulkMode,
  onExitBulkMode,
  onBulkAction,
}) => {
  const isLinkAction = actionType === 'link';
  const ActionIcon = isLinkAction ? Link : Unlink;
  const actionText = isLinkAction ? 'Link' : 'Unlink';
  const buttonText = isLinkAction ? 'Bulk Link' : 'Bulk Unlink';

  const handleBulkAction = () => {
    if (selectedCount > 0) {
      onBulkAction();
    }
  };

  return (
    <HStack className="justify-start">
      {!bulkMode ? (
        <Button variant="solid" action="positive" size="sm" onPress={onEnterBulkMode}>
          <ButtonIcon
            as={ActionIcon}
            size="sm"
            className={isLinkAction ? 'text-typography-900' : 'text-white'}
          />
          <ButtonText className={isLinkAction ? 'text-typography-900' : 'text-white'}>
            {buttonText}
          </ButtonText>
        </Button>
      ) : (
        <HStack className="items-center gap-2">
          <Button variant="solid" action="positive" size="sm" onPress={handleBulkAction}>
            <ButtonIcon
              as={ActionIcon}
              size="sm"
              className={isLinkAction ? 'text-typography-900' : 'text-white'}
            />
            <ButtonText className={isLinkAction ? 'text-typography-900' : 'text-white'}>
              {actionText} ({selectedCount})
            </ButtonText>
          </Button>
          <Pressable onPress={onExitBulkMode}>
            <Icon as={X} size="md" className="text-typography-500" />
          </Pressable>
        </HStack>
      )}
    </HStack>
  );
};
