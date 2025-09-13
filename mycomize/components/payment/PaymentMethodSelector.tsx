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
import { useStripeErrorHandler } from '~/lib/utils/stripeErrorHandler';
import { PaymentMethodType, PriceResponse } from '~/lib/types/paymentTypes';
import { Crown, CreditCard, ArrowLeft, XCircle } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Heading } from '~/components/ui/heading';
import OpenTekLogo from '~/assets/opentek-logo.svg';
import { paymentService } from '~/lib/services/PaymentService';
import { usePaymentFlow } from '~/lib/stores/authEncryptionStore';
import useAuthEncryptionStore from '~/lib/stores/authEncryptionStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

interface PaymentMethodSelectorProps {
  selectedMethod: 'stripe' | 'bitcoin' | null;
  onMethodChange: (method: 'stripe' | 'bitcoin') => void;
  onPaymentConfirmed: (confirmationCode: string) => void;
  onBackToPlan: () => void;
  clientSecret?: string;
  paymentIntentId?: string;
  disabled?: boolean;
  priceData?: PriceResponse | null;
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
  onBackToPlan,
  clientSecret,
  disabled = false,
}) => {
  const { confirmPayment } = useStripe();
  const { showError, showSuccess } = useUnifiedToast();
  const { handleStripeErrorWithReset } = useStripeErrorHandler();
  const [isCardComplete, setIsCardComplete] = useState(false);
  const paymentFlow = usePaymentFlow();
  
  // Get selected plan from the zustand store
  const selectedPlan = useAuthEncryptionStore((state) => state.selectedPlan);

  const handleCardChange = (cardDetails: any) => {
    setIsCardComplete(cardDetails.complete);
    if (cardDetails.error) {
      // Use unified Stripe error handling for card validation errors
      handleStripeErrorWithReset(
        cardDetails.error,
        () => {
          // No processing state to reset for card validation errors
        },
        {
          title: 'Card Validation Error',
          fallbackMessage: 'Please check your card information.',
        }
      );
    }
  };

  const handlePayment = async () => {
    if (!isCardComplete || !clientSecret) {
      showError('Please complete the card information');
      return;
    }

    try {
      // Start payment processing in the store
      await paymentFlow.processPayment(clientSecret);

      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        // Use unified Stripe error handling with processing state reset
        handleStripeErrorWithReset(
          error,
          () => {
            // Reset payment flow processing states
            paymentFlow.reset();
          },
          {
            title: 'Payment Failed',
            fallbackMessage: 'Payment failed. Please check your card details and try again.',
          }
        );
      } else if (paymentIntent) {
        console.log('Payment succeeded:', paymentIntent.id);
        // SSE will handle the payment completion via the auth store
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      // Use unified Stripe error handling with processing state reset
      handleStripeErrorWithReset(
        error,
        () => {
          // Reset payment flow processing states
          paymentFlow.reset();
        },
        {
          title: 'Payment Error',
          fallbackMessage: 'An unexpected error occurred during payment processing. Please try again.',
        }
      );
    }
  };

  // Format the price for display
  const formatPrice = (amountCents: number) => {
    const formatted = paymentService.formatPaymentAmount(amountCents);
    // Split on decimal point and remove $ symbol
    const parts = formatted.replace('$', '').split('.');
    return { dollars: parts[0], cents: parts[1] || '00' };
  };

  // Use selected plan price instead of priceData
  const priceFormatted = selectedPlan ? formatPrice(selectedPlan.price) : null;
  const priceString = selectedPlan ? paymentService.formatPaymentAmount(selectedPlan.price) : null;

  const isLoading = paymentFlow.isProcessing || paymentFlow.isSubmitting;

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
            <VStack space="sm" className="py-2 px-2">
              <HStack space="xs" className="items-center justify-center px-3 py-1">
                <Icon as={Crown} size="lg" className="text-typography-900" />
                <Text className="text-2xl text-typography-900 font-semibold mt-0.5">
                  {selectedPlan?.name || 'Loading...'}
                </Text>
              </HStack>
              
              {priceFormatted ? (
                <HStack space="xs" className="items-baseline justify-center my-3">
                  <Text className="text-2xl font-bold text-green-400">${priceFormatted.dollars}</Text>
                  <Text className="text-lg text-typography-600">.{priceFormatted.cents}</Text>
                </HStack>
              ) : (
                <Text className="text-lg text-typography-500 text-center my-3">Loading price...</Text>
              )}
              
              <VStack space="xs" className="items-start pl-2 mx-auto">
                <HStack space="sm" className="items-center">
                  <MaterialCommunityIcons name="mushroom" color="#57F481" size={16}/>
                  <Text className="text-typography-700 text-md">Unlimited grow tracking</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <MaterialCommunityIcons name="home-assistant" color="#57F481" size={16}/>
                  <Text className="text-typography-700 text-md">Home Assistant integration</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <Entypo name="share" size={16} color="#57F481" />
                  <Text className="text-typography-700 text-md">Tek template creation & sharing</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <MaterialCommunityIcons name="update" color="#57F481" size={16}/>
                  <Text className="text-typography-700 text-md">All future updates included</Text>
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
            <HStack className="items-center mx-auto gap-2 ">
              <Text className="text-center text-typography-500">Secure payments powered by</Text>
              <FontAwesome5 name="stripe" size={30} color="white" />
            </HStack>
          </VStack>
        )}
      </VStack>

      <VStack className="px-6" space="md">
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
              className="flex-1 bg-success-300 border-success-300"
              onPress={handlePayment}
              isDisabled={!isCardComplete || !clientSecret || disabled || isLoading}
            >
              {isLoading ? (
                <HStack space="sm" className="items-center">
                  <ButtonText className="text-typography-900">Processing...</ButtonText>
                </HStack>
              ) : (
                <ButtonText className="text-typography-900 font-semibold">
                  {priceString ? `Pay ${priceString}` : 'Pay'}
                </ButtonText>
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
        
        {/* Inline processing status UI */}
        {isLoading && (
          <VStack space="sm" className="items-center py-6">
            <Spinner size="large" color="white" />
            <Text className="text-center text-typography-600 text-md">
              {paymentFlow.isSubmitting ? 'Processing your payment...' : paymentFlow.isProcessing ? 'Waiting for payment confirmation...' : 'Preparing payment...'}
            </Text>
          </VStack>
        )}

        {/* Payment Error Display */}
        {paymentFlow.error && (
          <VStack space="sm" className="items-center py-4">
            <VStack space="sm" className="items-center">
              <XCircle size={48} className="text-error-500" />
              <Text className="text-center text-typography-900 text-lg font-semibold">
                Payment Failed
              </Text>
              <Text className="text-center text-typography-600 text-sm">
                {paymentFlow.error}
              </Text>
            </VStack>
          </VStack>
        )}
      </VStack>
    </VStack>
  );
}
