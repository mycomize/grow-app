import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Wifi, WifiOff, PowerOff, RadioTower } from 'lucide-react-native';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'unknown';

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const getConnectionIcon = () => {
    const iconSize = size === 'sm' ? 'xs' : 'sm';

    switch (status) {
      case 'connected':
        return <Icon as={Wifi} size={iconSize} className="text-success-700" />;
      case 'connecting':
        return <Icon as={RadioTower} size={iconSize} className="text-purple-300" />;
      case 'disconnected':
        return <Icon as={PowerOff} size={iconSize} className="text-error-900" />;
      default:
        return <Icon as={WifiOff} size={iconSize} className="text-error-900" />;
    }
  };

  const getConnectionText = () => {
    switch (status) {
      case 'connected':
        return 'CONNECTED';
      case 'connecting':
        return 'CONNECTING';
      case 'disconnected':
        return 'DISCONNECTED';
      default:
        return 'UNKNOWN';
    }
  };

  const getConnectionTextColor = () => {
    switch (status) {
      case 'connected':
        return 'text-success-700';
      case 'connecting':
        return 'text-purple-300';
      case 'disconnected':
        return 'text-error-900';
      default:
        return 'text-error-900';
    }
  };

  const getConnectionBoxStyle = () => {
    switch (status) {
      case 'connected':
        return 'bg-success-50';
      case 'connecting':
        return 'bg-purple-800';
      case 'disconnected':
        return 'bg-error-50';
      default:
        return 'bg-background-200';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1';
      case 'lg':
        return 'px-4 py-2';
      default:
        return 'px-3 py-1';
    }
  };

  const getSpacing = () => {
    switch (size) {
      case 'sm':
        return 'xs';
      case 'lg':
        return 'md';
      default:
        return 'sm';
    }
  };

  return (
    <HStack
      space={getSpacing()}
      className={`items-center rounded-sm ${getConnectionBoxStyle()} ${getPadding()} ${className}`}>
      {getConnectionIcon()}
      <Text className={`font-medium ${getConnectionTextColor()} ${getTextSize()}`}>
        {getConnectionText()}
      </Text>
    </HStack>
  );
};
