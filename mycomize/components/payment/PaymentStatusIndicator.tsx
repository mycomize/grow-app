import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Alert, AlertIcon, AlertText } from '~/components/ui/alert';
import { Spinner } from '~/components/ui/spinner';
import { CheckIcon, InfoIcon, AlertCircleIcon } from '~/components/ui/icon';
import { PaymentStatus } from '~/lib/types/paymentTypes';

interface PaymentStatusIndicatorProps {
  status: PaymentStatus;
  message?: string;
  showSpinner?: boolean;
}

export const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  status,
  message,
  showSpinner = false,
}) => {
  const getStatusContent = () => {
    switch (status) {
      case 'loading':
        return {
          icon: showSpinner ? <Spinner size="small" /> : <InfoIcon />,
          variant: 'info' as const,
          title: 'Processing Payment',
          defaultMessage: 'Please wait while we process your payment...',
          bgColor: 'bg-info-50',
          borderColor: 'border-info-200',
        };

      case 'paid':
        return {
          icon: <CheckIcon />,
          variant: 'success' as const,
          title: 'Payment Successful',
          defaultMessage: 'Your payment has been processed successfully!',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
        };

      case 'failed':
        return {
          icon: <AlertCircleIcon />,
          variant: 'error' as const,
          title: 'Payment Failed',
          defaultMessage: 'There was an issue processing your payment. Please try again.',
          bgColor: 'bg-error-50',
          borderColor: 'border-error-200',
        };

      case 'unpaid':
      default:
        return {
          icon: <InfoIcon />,
          variant: 'info' as const,
          title: 'Payment Required',
          defaultMessage: 'Please complete your payment to access all features.',
          bgColor: 'bg-info-50',
          borderColor: 'border-info-200',
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <VStack space="md" className="w-full">
      <Alert 
        action={statusContent.variant} 
        variant="outline" 
        className={`${statusContent.bgColor} ${statusContent.borderColor}`}
      >
        <AlertIcon as={() => statusContent.icon} />
        <VStack space="xs" className="flex-1">
          <AlertText className="font-semibold text-base">
            {statusContent.title}
          </AlertText>
          <AlertText className="text-sm">
            {message || statusContent.defaultMessage}
          </AlertText>
        </VStack>
      </Alert>
    </VStack>
  );
};

// Additional component for inline status display
interface InlinePaymentStatusProps {
  status: PaymentStatus;
  size?: 'sm' | 'md';
}

export const InlinePaymentStatus: React.FC<InlinePaymentStatusProps> = ({
  status,
  size = 'md',
}) => {
  const getStatusStyle = () => {
    const baseClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
    
    switch (status) {
      case 'paid':
        return {
          className: `${baseClasses} bg-success-100 text-success-800 rounded-full font-medium`,
          label: 'Paid',
          icon: <CheckIcon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
        };
      
      case 'failed':
        return {
          className: `${baseClasses} bg-error-100 text-error-800 rounded-full font-medium`,
          label: 'Failed',
          icon: <AlertCircleIcon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
        };
      
      case 'loading':
        return {
          className: `${baseClasses} bg-info-100 text-info-800 rounded-full font-medium`,
          label: 'Processing',
          icon: <Spinner size={size === 'sm' ? 'small' : 'small'} />,
        };
      
      case 'unpaid':
      default:
        return {
          className: `${baseClasses} bg-warning-100 text-warning-800 rounded-full font-medium`,
          label: 'Unpaid',
          icon: <InfoIcon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <HStack space="xs" className={statusStyle.className}>
      {statusStyle.icon}
      <Text className={size === 'sm' ? 'text-xs' : 'text-sm'}>
        {statusStyle.label}
      </Text>
    </HStack>
  );
};
