import React, { useState } from 'react';
import { View } from 'react-native';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '~/components/ui/radio';
import { CircleIcon } from '~/components/ui/icon';
import { Card } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { PaymentMethodType } from '~/lib/types/paymentTypes';
import { Crown, Check, CreditCard, ArrowLeft } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Heading } from '~/components/ui/heading';
import OpenTekLogo from '~/assets/opentek-logo.svg';

interface PaymentMethodSelectorProps {
  selectedMethod: 'stripe' | 'bitcoin' | null;
  onMethodChange: (method: 'stripe' | 'bitcoin') => void;
  onPaymentSuccess: (paymentMethodId: string) => void;
  onBackToPlan: () => void;
  clientSecret?: string;
  disabled?: boolean;
  isProcessing?: boolean;
}

const paymentMethods: PaymentMethodType[] = [
  {
    id: 'stripe',
    name: 'Credit Card',
    description: 'Pay securely with your credit or debit card',
    enabled: true,
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    description: 'Pay with Bitcoin (Coming Soon)',
    enabled: false,
  },
];

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  onPaymentSuccess,
  onBackToPlan,
  clientSecret,
  disabled = false,
  isProcessing = false,
}) => {
  const { confirmPayment } = useStripe();
  const { showError } = useUnifiedToast();
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCardChange = (cardDetails: any) => {
    setIsCardComplete(cardDetails.complete);
    if (cardDetails.error?.message) {
      showError(cardDetails.error.message);
    }
  };

  const handlePayment = async () => {
    if (!isCardComplete || !clientSecret) {
      showError('Please complete the card information');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        showError(error.message || 'Payment failed');
      } else if (paymentIntent) {
        console.log('Payment succeeded:', paymentIntent.id);
        onPaymentSuccess(paymentIntent.id);
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      showError('An unexpected error occurred during payment processing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isProcessing || isSubmitting;

  return (
    <VStack className="flex-1 min-h-full">
      {/* Header with bg-background-50 background */}
      <VStack space="md" className="bg-background-50 pt-12 pb-6">
        <HStack className="mx-4 mt-8 items-center" space="sm">
          <Icon as={CreditCard} size="xl" className="text-typography-500" />
          <Heading size="xl" className="text-center text-typography-800">
            Payment Method
          </Heading>
          <View className="flex-1" />
          <OpenTekLogo height={50} width={50} />
        </HStack>
      </VStack>

      {/* Main Content */}
      <VStack className="flex-1 px-6 py-6">
        {/* Selected Plan Summary Card */}
        <VStack space="lg" className="mb-6">
          <Text className="text-typography-800 font-medium text-lg">Selected Plan:</Text>
          <Card size="md" variant="elevated" className="w-full bg-background-0 border border-outline-200 rounded-xl">
            <VStack space="sm" className="py-4 px-4">
              <HStack space="xs" className="items-center justify-center">
                <Icon as={Crown} size="lg" className="text-success-400" />
                <Text className="text-typography-900 font-semibold text-base">Lifetime Access</Text>
              </HStack>
              
              <HStack space="xs" className="items-baseline justify-center">
                <Text className="text-2xl font-bold text-green-400">$19</Text>
                <Text className="text-lg text-typography-600">.99</Text>
              </HStack>
              
              <VStack space="xs" className="items-start pl-2 mx-auto">
                <HStack space="xs" className="items-center">
                  <Icon as={Check} size="xs" className="text-success-400" />
                  <Text className="text-typography-700 text-sm">Unlimited grow tracking</Text>
                </HStack>
                <HStack space="xs" className="items-center">
                  <Icon as={Check} size="xs" className="text-success-400" />
                  <Text className="text-typography-700 text-sm">IoT device integration</Text>
                </HStack>
                <HStack space="xs" className="items-center">
                  <Icon as={Check} size="xs" className="text-success-400" />
                  <Text className="text-typography-700 text-sm">Complete tek library access</Text>
                </HStack>
              </VStack>
            </VStack>
          </Card>
        </VStack>

        {/* Payment Methods */}
        <RadioGroup
          value={selectedMethod || ''}
          onChange={onMethodChange}
          className="w-full mb-6"
        >
          <VStack space="md" className="w-full">
            {paymentMethods.map((method) => (
              <Radio
                key={method.id}
                value={method.id}
                isDisabled={disabled || !method.enabled}
                className={`
                  w-full p-4 border-2 rounded-lg
                  ${selectedMethod === method.id 
                    ? 'border-success-400 bg-background-0' 
                    : 'border-outline-200 bg-background-0'
                  }
                  ${!method.enabled ? 'opacity-50' : ''}
                `}
              >
                <HStack space="md" className="flex-1 items-center">
                  <RadioIndicator>
                    <RadioIcon as={CircleIcon} />
                  </RadioIndicator>
                  
                  <VStack space="xs" className="flex-1">
                    <RadioLabel className="text-base font-medium text-typography-900">
                      {method.name}
                    </RadioLabel>
                    <Text className="text-sm text-typography-700">
                      {method.description}
                    </Text>
                  </VStack>
                </HStack>
              </Radio>
            ))}
          </VStack>
        </RadioGroup>

        {/* Card field when credit card is selected */}
        {selectedMethod === 'stripe' && (
          <VStack space="lg" className="w-full mb-6">
            <View className="w-full">
              <CardField
                postalCodeEnabled={true}
                cardStyle={{
                  backgroundColor: '#1f1f1f',
                  textColor: '#ffffff',
                  textErrorColor: '#FF6b6b',
                  fontSize: 16,
                  placeholderColor: '#cccccc',
                  borderColor: '#999999',
                  borderWidth: 1,
                  borderRadius: 8
                }}
                style={{
                  height: 50,
                  width: '100%',
                  marginHorizontal: 0
                }}
                onCardChange={handleCardChange}
                disabled={disabled || isLoading}
              />
            </View>
          </VStack>
        )}
      </VStack>

      <VStack className="px-6">
        {selectedMethod === 'stripe' ? (
          <HStack space="md" className="w-full">
            <Button 
              size="lg" 
              variant="outline" 
              className="flex-1 border-outline-200" 
              onPress={onBackToPlan}
              disabled={disabled || isLoading}
            >
              <ButtonIcon as={ArrowLeft} size="md" className="text-typography-500" />
              <ButtonText className="text-lg text-typography-600">Back</ButtonText>
            </Button>
            
            <Button
              size="lg"
              className="flex-1 bg-success-400 border-success-400"
              onPress={handlePayment}
              isDisabled={!isCardComplete || !clientSecret || disabled || isLoading}
            >
              {isLoading ? (
                <HStack space="sm" className="items-center">
                  <Spinner size="small" color="white" />
                  <ButtonText className="text-typography-900">Processing...</ButtonText>
                </HStack>
              ) : (
                <ButtonText className="text-typography-900 font-semibold">Pay $19.99</ButtonText>
              )}
            </Button>
          </HStack>
        ) : (
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full border-outline-200" 
            onPress={onBackToPlan}
            disabled={disabled}
          >
            <ButtonIcon as={ArrowLeft} size="md" className="text-typography-500" />
            <ButtonText className="text-lg text-typography-600">Back</ButtonText>
          </Button>
        )}
      </VStack>
    </VStack>
  );
}
