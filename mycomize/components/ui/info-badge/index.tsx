import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';

export type InfoBadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type InfoBadgeSize = 'sm' | 'md' | 'lg';

interface InfoBadgeProps {
  text: string;
  icon?: any; // Lucide icon component
  variant?: InfoBadgeVariant;
  size?: InfoBadgeSize;
  className?: string;
}

export const InfoBadge: React.FC<InfoBadgeProps> = ({
  text,
  icon,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border border-success-300 bg-success-50';
      case 'warning':
        return 'border border-warning-300 bg-warning-50';
      case 'error':
        return 'border border-error-300 bg-error-50';
      case 'info':
        return 'border border-info-300 bg-info-50';
      case 'default':
      default:
        return 'border border-background-200 bg-background-50';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'success':
        return 'text-success-700';
      case 'warning':
        return 'text-warning-700';
      case 'error':
        return 'text-error-700';
      case 'info':
        return 'text-info-700';
      case 'default':
      default:
        return 'text-typography-700';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-success-700';
      case 'warning':
        return 'text-warning-700';
      case 'error':
        return 'text-error-700';
      case 'info':
        return 'text-info-700';
      case 'default':
      default:
        return 'text-typography-700';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      case 'md':
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
      case 'md':
      default:
        return 'px-2 py-1';
    }
  };

  const getIconSize = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xs' => {
    switch (size) {
      case 'sm':
        return 'xs';
      case 'lg':
        return 'md';
      case 'md':
      default:
        return 'sm';
    }
  };

  const getSpacing = () => {
    switch (size) {
      case 'sm':
        return 'xs';
      case 'lg':
        return 'md';
      case 'md':
      default:
        return 'xs';
    }
  };

  return (
    <HStack
      space={getSpacing()}
      className={`items-center rounded-sm ${getVariantStyles()} ${getPadding()} ${className}`}>
      {icon && <Icon as={icon} size={getIconSize()} className={getIconColor()} />}
      <Text className={`font-medium ${getTextColor()} ${getTextSize()}`}>{text}</Text>
    </HStack>
  );
};
