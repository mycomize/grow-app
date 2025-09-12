import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Center } from '~/components/ui/center';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Check, Crown, Zap, CreditCard, ArrowLeft } from 'lucide-react-native';
import { Heading } from '~/components/ui/heading';
import { View } from '~/components/ui/view';
import OpenTekLogo from '~/assets/opentek-logo.svg';

interface PaymentPlanSelectorProps {
  onPlanSelected: () => void;
  onBack: () => void;
  disabled?: boolean;
}

export function PaymentPlanSelector({ onPlanSelected, onBack, disabled = false }: PaymentPlanSelectorProps) {
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
        <VStack space="lg" className="flex-1 h-full items-center mx-auto w-full max-w-sm">
          {/* Main Plan Card - Portrait orientation */}
          <Card 
            size="lg" 
            variant="elevated"
            className="w-full bg-background-0 border-2 border-success-400 rounded-2xl shadow-lg mt-24"
          >
            <VStack space="md" className="items-center py-8 px-6">
              {/* Plan Badge */}
              <HStack space="xs" className="items-center bg-success-400 rounded-full px-3 py-1">
                <Icon as={Crown} size="md" className="text-typography-900" />
                <Text className="text-typography-900 font-semibold text-lg mt-0.5">LIFETIME</Text>
              </HStack>
              
              {/* Price Display - Prominent in middle */}
              <VStack space="xs" className="items-center my-6">
                <HStack space="xs" className="items-baseline">
                  <Text className="text-4xl font-bold text-green-400">$19</Text>
                  <Text className="text-xl text-typography-600">.99</Text>
                </HStack>
                <Text className="text-typography-500 text-sm">One-time payment</Text>
              </VStack>
              
              {/* Plan Description */}
              <VStack space="xs" className="items-center">
                <Text className="text-typography-900 font-medium text-center text-lg">
                  Full OpenTek Access
                </Text>
              </VStack>
              
              {/* Feature highlights */}
              <VStack space="md" className="mt-2 w-full pl-10">
                <HStack space="sm" className="items-center">
                  <Icon as={Check} size="sm" className="text-green-400" />
                  <Text className="text-typography-700 text-md flex-1">Unlimited grow tracking</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <Icon as={Check} size="sm" className="text-green-400" />
                  <Text className="text-typography-700 text-md flex-1">Home Assistant integration for automated grow monitoring and control</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <Icon as={Check} size="sm" className="text-green-400" />
                  <Text className="text-typography-700 text-md flex-1">Tek creation and social sharing</Text>
                </HStack>
                <HStack space="sm" className="items-center">
                  <Icon as={Check} size="sm" className="text-green-400" />
                  <Text className="text-typography-700 text-md flex-1">All future updates included</Text>
                </HStack>
              </VStack>
              
              {/* Select Plan Button */}
              <Button 
                size="lg" 
                className="w-full mt-6 bg-success-400 border-success-400 active:bg-success-700" 
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
            className="w-full border-outline-200 mt-4 mx-auto" 
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
