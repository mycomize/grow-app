import React from 'react';
import { useToast, Toast } from '~/components/ui/toast';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react-native';

export type UnifiedToastType = 'error' | 'success' | 'info' | 'warning';

interface UnifiedToastOptions {
  type: UnifiedToastType;
  message: string;
  title?: string;
  description?: string;
  duration?: number;
  placement?: 'top' | 'bottom';
}

const getToastIcon = (type: UnifiedToastType) => {
  switch (type) {
    case 'error':
      return AlertCircle;
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
    default:
      return Info;
  }
};

const getToastTitle = (type: UnifiedToastType) => {
  switch (type) {
    case 'error':
      return 'Error';
    case 'success':
      return 'Success';
    case 'warning':
      return 'Warning';
    case 'info':
    default:
      return 'Info';
  }
};

const UnifiedToastComponent: React.FC<{
  type: UnifiedToastType;
  message: string;
  title?: string;
  description?: string;
}> = ({ type, message, title, description }) => {
  const { theme } = useTheme();

  const bgColor = 'bg-background-0';

  const getTextColor = () => {
    switch (type) {
      case 'error':
        return theme === 'dark' ? 'text-error-600' : 'text-error-700';
      case 'success':
        return theme === 'dark' ? 'text-green-600' : 'text-green-700';
      case 'warning':
        return theme === 'dark' ? 'text-orange-600' : 'text-orange-700';
      case 'info':
      default:
        return theme === 'dark' ? 'text-blue-600' : 'text-blue-700';
    }
  };

  const textColor = getTextColor();
  const descColor = 'text-typography-300';
  const displayTitle = title || getToastTitle(type);

  return (
    <Toast variant="outline" className={`mx-auto mt-36 w-full p-4 ${bgColor}`}>
      <VStack space="xs" className="w-full">
        <HStack className="flex-row gap-2">
          <Icon as={getToastIcon(type)} className={`mt-0.5 ${textColor}`} />
          <Text className={`font-semibold ${textColor}`}>{displayTitle}</Text>
        </HStack>
        <Text className={descColor}>{message}</Text>
        {description && <Text className={`${descColor} text-sm`}>{description}</Text>}
      </VStack>
    </Toast>
  );
};

export const useUnifiedToast = () => {
  const toast = useToast();

  const showToast = ({
    type,
    message,
    title,
    description,
    duration = 3000,
    placement = 'top',
  }: UnifiedToastOptions) => {
    const toastId = Math.random().toString();

    toast.show({
      id: `${type}-toast-${toastId}`,
      placement,
      duration,
      render: () => (
        <UnifiedToastComponent
          type={type}
          message={message}
          title={title}
          description={description}
        />
      ),
    });
  };

  // Convenience methods for common use cases
  const showSuccess = (message: string, title?: string, description?: string) =>
    showToast({ type: 'success', message, title, description });

  const showError = (message: string, title?: string, description?: string) =>
    showToast({ type: 'error', message, title, description });

  const showInfo = (message: string, title?: string, description?: string) =>
    showToast({ type: 'info', message, title, description });

  const showWarning = (message: string, title?: string, description?: string) =>
    showToast({ type: 'warning', message, title, description });

  return {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
};
