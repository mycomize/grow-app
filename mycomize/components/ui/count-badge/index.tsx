import React from 'react';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';

export type CountBadgeVariant = 'success' | 'green-dark';
export type CountBadgeSize = 'sm' | 'md';

interface CountBadgeProps {
  count: number;
  label: string;
  variant?: CountBadgeVariant;
  size?: CountBadgeSize;
  className?: string;
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  label,
  variant = 'success',
  size = 'md',
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-success-200 text-success-700';
      case 'green-dark':
        return 'border border-green-800 bg-green-900 text-green-100';
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

  return (
    <HStack
      className={`items-center rounded-sm ${getVariantStyles()} ${getPadding()} ${className}`}>
      <Text className={`font-medium ${getTextSize()}`}>
        {count} {label}
      </Text>
    </HStack>
  );
};
