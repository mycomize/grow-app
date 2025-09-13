import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Check, Crown, Zap, Layers, CreditCard, ArrowLeft } from 'lucide-react-native';
import { Heading } from '~/components/ui/heading';
import { View } from '~/components/ui/view';
import OpenTekLogo from '~/assets/opentek-logo.svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Entypo from '@expo/vector-icons/Entypo';
import { paymentService } from '~/lib/services/PaymentService';
import useAuthEncryptionStore from '~/lib/stores/authEncryptionStore';
import { PaymentPlan, PriceResponse } from '~/lib/types/paymentTypes';

interface PaymentPlanSelectorProps {
  onPlanSelected: () => void;
  onBack: () => void;
  disabled?: boolean;
}

export function PaymentPlanSelector({ onPlanSelected, onBack, disabled = false }: PaymentPlanSelectorProps) {
  // Get payment plan data from the store
  const selectedPlan = useAuthEncryptionStore((state) => state.selectedPlan);
  const availablePlans = useAuthEncryptionStore((state) => state.availablePlans);
  const selectPaymentPlan = useAuthEncryptionStore((state) => state.selectPaymentPlan);

  // Format the price for display
  const formatPrice = (amountCents: number) => {
    const formatted = paymentService.formatPaymentAmount(amountCents);
    // Split on decimal point and remove $ symbol
    const parts = formatted.replace('$', '').split('.');
    return { dollars: parts[0], cents: parts[1] || '00' };
  };

  const priceFormatted = selectedPlan ? formatPrice(selectedPlan.price) : null;

  const handlePlanSelection = () => {
    if (selectedPlan) {
      // The plan is already selected in the store, just proceed
      onPlanSelected();
    }
  };

  return (
    <>
    <VStack className="flex-1 h-full">
      {/* Header with bg-background-50 background */}
      <VStack space="md" className="bg-background-50 pt-12 pb-6">
        <HStack className="mx-4 mt-8 items-center" space="sm">
          <Icon as={CreditCard} size="xl" className="text-typography-500" />
          <Heading size="xl" className="text-center text-typography-800">
            Choose Your Plan
          </Heading>
          <View className="flex-1" />
          <OpenTekLogo height={50} width={50} />
        </HStack>
      </VStack>

      {/* Main Content - Centered */}
        <VStack space="lg" className="flex-1 h-full items-center mx-auto w-full">
          {/* Main Plan Card - Portrait orientation */}
          <Card 
            size="lg" 
            variant="elevated"
            className="w-10/12 bg-background-0 border-2 border-success-400 rounded-2xl shadow-lg mt-24"
          >
            <VStack space="md" className="items-center py-8 px-0">
              {/* Plan Badge */}
              <HStack space="xs" className="items-center bg-success-300 rounded-full px-3 py-1">
                <Icon as={Crown} size="md" className="text-typography-900" />
                <Text className="text-typography-900 font-semibold text-lg mt-0.5">LIFETIME</Text>
              </HStack>
              
              {/* Price Display - Prominent in middle */}
              <VStack space="xs" className="items-center mt-6 mb-3">
                {priceFormatted ? (
                  <HStack space="xs" className="items-baseline">
                    <Text className="text-4xl font-bold text-green-400">${priceFormatted.dollars}</Text>
                    <Text className="text-xl text-typography-600">.{priceFormatted.cents}</Text>
                  </HStack>
                ) : (
                  <Text className="text-lg text-typography-500">Loading price...</Text>
                )}
                <Text className="text-typography-500 text-sm">One-time payment</Text>
              </VStack>
              
              {/* Plan Description */}
              <Text className="text-typography-900 font-medium text-center text-lg">
                Full OpenTek Access
              </Text>
              
              {/* Feature highlights */}
              <VStack space="md" className="mt-2 w-full pl-10">
                <HStack space="sm" className="items-center">
                  <MaterialCommunityIcons name="mushroom" color="#57F481" size={20}/>
                  <Text className="text-typography-700 text-md flex-1">Unlimited grow tracking</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <MaterialCommunityIcons name="home-assistant" color="#57F481" size={20}/>
                  <Text className="text-typography-700 text-md flex-1">Home Assistant integration for automated grow monitoring and control</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <Entypo name="share" size={20} color="#57F481" />
                  <Text className="text-typography-700 text-md flex-1">Tek template creation and sharing</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <MaterialCommunityIcons name="update" color="#57F481" size={20}/>
                  <Text className="text-typography-700 text-md flex-1">All future updates included</Text>
                </HStack>
              </VStack>
              
              {/* Select Plan Button */}
              <Button 
                size="lg" 
                className="w-full mt-6 bg-success-300 border-success-300 active:bg-success-700" 
                onPress={onPlanSelected}
                disabled={disabled}
              >
                <ButtonText className="text-typography-900 font-semibold text-lg">
                  Get Lifetime Access
                </ButtonText>
              </Button>
            </VStack>
          </Card>
          <Button 
            size="lg" 
            variant="outline" 
            className="w-10/12 border-outline-200 mt-4 mx-auto" 
            onPress={onBack}
            disabled={disabled}
          >
            <ButtonIcon as={ArrowLeft} size="md" className="text-typography-500" />
            <ButtonText className="text-lg text-typography-600">Back</ButtonText>
          </Button>
        </VStack>
    </VStack>
    </>
  );
}
