import React, { useState } from 'react';
import { View } from 'react-native';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Alert, AlertIcon, AlertText } from '~/components/ui/alert';
import { Spinner } from '~/components/ui/spinner';
import { InfoIcon, CheckIcon } from '~/components/ui/icon';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Card } from '~/components/ui/card';
import { Center } from '~/components/ui/center';

interface StripeCardFormProps {
  onPaymentSuccess: (paymentMethodId: string) => void;
  onPaymentError: (error: string) => void;
  clientSecret?: string;
  isProcessing?: boolean;
  disabled?: boolean;
}

export const StripeCardForm: React.FC<StripeCardFormProps> = ({
  onPaymentSuccess,
  onPaymentError,
  clientSecret,
  isProcessing = false,
  disabled = false,
}) => {
  const { confirmPayment, createPaymentMethod } = useStripe();
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCardChange = (cardDetails: any) => {
    setIsCardComplete(cardDetails.complete);
    setCardError(cardDetails.error?.message || null);
  };

  const handleSubmit = async () => {
    if (!isCardComplete || !clientSecret) {
      onPaymentError('Please complete the card information');
      return;
    }

    setIsSubmitting(true);
    setCardError(null);

    try {
      // Confirm the payment with the client secret
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        onPaymentError(error.message || 'Payment failed');
      } else if (paymentIntent) {
        console.log('Payment succeeded:', paymentIntent.id);
        onPaymentSuccess(paymentIntent.id);
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      onPaymentError('An unexpected error occurred during payment processing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isProcessing || isSubmitting;

  return (
      <VStack space="lg" className="items-center w-full ">


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
              borderRadius: 10
            }}
            style={{
              height: 55,
              width: 350,
              marginHorizontal: 15
            }}
            onCardChange={handleCardChange}
            disabled={disabled || isLoading}
          />
        
        {cardError && (
          <Alert action="error" variant="outline" className="mt-2">
            <AlertIcon as={InfoIcon} />
            <AlertText className="text-sm">
              {cardError}
            </AlertText>
          </Alert>
        )}

      {/* Submit Button */}
      <Button
        onPress={handleSubmit}
        isDisabled={!isCardComplete || !clientSecret || disabled || isLoading}
        className="mt-4 bg-success-400 border-success-400 "
        size="lg"
      >
        {isLoading ? (
          <HStack space="sm" className="items-center">
            <Spinner size="small" color="white" />
            <ButtonText className="text-typography-900">Processing Payment...</ButtonText>
          </HStack>
        ) : (
          <ButtonText className="text-typography-900 font-semibold">Complete Payment</ButtonText>
        )}
      </Button>
    </VStack>
  );
};
