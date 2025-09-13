import React from 'react';
import { View, Pressable } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Heading } from '~/components/ui/heading';
import { Button, ButtonText } from '~/components/ui/button';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import useAuthEncryptionStore from '~/lib/stores/authEncryptionStore';
import OpenTekLogo from '~/assets/opentek-logo.svg';
import { CheckCircle, CreditCard, Copy } from 'lucide-react-native';
import Foundation from '@expo/vector-icons/Foundation';


interface PaymentConfirmationProps {
  confirmationCode: string;
  onContinue: () => void;
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  confirmationCode,
  onContinue,
}) => {
  const { showSuccess, showError } = useUnifiedToast();
  
  // Get selected plan from the zustand store
  const selectedPlan = useAuthEncryptionStore((state) => state.selectedPlan);
  
  // Format price from cents to dollars
  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setString(confirmationCode);
      showSuccess('Confirmation code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy confirmation code:', error);
      showError('Failed to copy confirmation code');
    }
  };

  return (
    <VStack className="flex-1 min-h-full">
      {/* Header with bg-background-50 background */}
      <VStack space="md" className="bg-background-50 pt-12 pb-0">
        <HStack className="mx-4 mt-8 items-center" space="sm">
          <Icon as={CreditCard} size="xl" className="text-typography-500" />
          <Heading size="xl" className="text-center text-typography-800">
            Payment Confirmation
          </Heading>
          <View className="flex-1" />
          <OpenTekLogo height={50} width={50} />
        </HStack>
      </VStack>

      {/* Main Content */}
      <VStack className="flex-1 px-6 pb-6 justify-center">
        <VStack space="lg" className="items-center">
          {/* Success Icon */}
          <CheckCircle size={70} color="#22c55e" />
          
          {/* Success Message */}
          <VStack space="sm" className="items-center mt-8">
            <Text className="text-center text-typography-900 text-2xl font-bold">
              Welcome to OpenTek!
            </Text>
            <Text className="text-center text-typography-600 text-base">
              Your payment has been processed successfully.
            </Text>
          </VStack>

          {/* Order Details Card */}
          <Card size="lg" variant="elevated" className="w-full bg-background-0 border border-outline-200 rounded-xl mt-6">
            <VStack space="md" className="py-0 px-4">
              <Text className="text-center text-typography-800 font-semibold text-xl">
                Order Details
              </Text>
              
              <VStack space="sm" className="w-full">
                {/* Plan Name */}
                <HStack className="w-full">
                  <Text className="text-typography-600 text-lg">
                    Plan: <Text className="text-typography-900 font-semibold">{selectedPlan?.name || 'N/A'}</Text>
                  </Text>
                </HStack>
                
                {/* Amount */}
                <HStack className="w-full">
                  <Text className="text-typography-600 text-lg">
                    Amount: <Text className="text-typography-900 font-semibold">{selectedPlan ? formatPrice(selectedPlan.price) : 'N/A'}</Text>
                  </Text>
                </HStack>
                
                {/* Confirmation Code */}
                <HStack className="w-full items-center gap-2">
                  <Text className="text-typography-600 text-lg">
                    Confirmation Code:
                  </Text>
                  <HStack className="items-center gap-2">
                    <Text className="text-typography-900 font-mono text-xl font-bold tracking-wider">
                      {confirmationCode}
                    </Text>
                    <Pressable onPress={handleCopyCode} className="ml-3">
                      <Icon 
                        as={Copy} 
                        size="xl" 
                        className="text-typography-900" 
                      />
                    </Pressable>
                  </HStack>
                </HStack>
              </VStack>

              <VStack space="xs" className="mt-2">
                <HStack className="items-center " space="md">
                <Foundation name="alert" size={24} color="yellow" />
                <Text className="text-typography-800 text-lg font-semibold">
                  Important: Save this confirmation code
                </Text>
                </HStack>
                <Text className="text-typography-700 text-md mt-3">
                  This code is your receipt and proof of payment. Please take a screenshot or write it down for your records.
                </Text>
              </VStack>
            </VStack>
          </Card>
        </VStack>
      </VStack>

      {/* Continue Button */}
      <VStack className="px-6 pb-6">
        <Button
          size="lg"
          className="w-full bg-success-300 border-success-300"
          onPress={onContinue}
        >
          <ButtonText className="text-typography-900 font-semibold">
            Continue to App
          </ButtonText>
        </Button>
      </VStack>
    </VStack>
  );
};
