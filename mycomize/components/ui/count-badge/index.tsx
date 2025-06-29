import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';

export type CountBadgeVariant = 'success' | 'green-dark' | 'warning' | 'error';
export type CountBadgeSize = 'sm' | 'md';

interface CountBadgeProps {
  count: number;
  label: string;
  variant?: CountBadgeVariant;
  size?: CountBadgeSize;
  className?: string;
  icon?: any; // Lucide icon component
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  label,
  variant = 'success',
  size = 'md',
  className = '',
  icon,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-success-200 text-success-700';
      case 'green-dark':
        return 'border border-green-800 bg-green-900 text-green-100';
      case 'warning':
        return 'bg-yellow-200 text-yellow-700';
      case 'error':
        return 'bg-error-200 text-error-700';
      default:
        return 'bg-success-200 text-success-700';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      default:
        return 'text-sm';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1';
      case 'md':
        return 'px-3 py-1';
      default:
        return 'px-3 py-1';
    }
  };

  const getIconSize = (): 'sm' | 'md' | 'xs' | 'lg' | 'xl' | '2xs' => {
    switch (size) {
      case 'sm':
        return 'sm';
      case 'md':
        return 'sm';
      default:
        return 'sm';
    }
  };

  return (
    <HStack
      className={`items-center rounded-sm ${getVariantStyles()} ${getPadding()} ${className}`}>
      {icon && (
        <Icon
          as={icon}
          size={getIconSize()}
          className={`mr-2 ${
            variant === 'green-dark'
              ? 'text-green-100'
              : variant === 'warning'
                ? 'text-yellow-700'
                : variant === 'error'
                  ? 'text-error-700'
                  : 'text-success-700'
          }`}
        />
      )}
      <Text className={`font-medium ${getTextSize()}`}>
        {count} {label}
      </Text>
    </HStack>
  );
};
