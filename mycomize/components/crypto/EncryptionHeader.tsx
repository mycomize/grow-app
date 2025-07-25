import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { View } from '~/components/ui/view';
import { Heading } from '~/components/ui/heading';
import { Box } from '~/components/ui/box';
import { Icon } from '~/components/ui/icon';
import { Shield } from 'lucide-react-native';
import MycomizeLogo from '~/assets/mycomize-logo.svg';

interface EncryptionHeaderProps {
  currentStep: string;
  totalSteps: number;
}

export function EncryptionHeader({ currentStep, totalSteps }: EncryptionHeaderProps) {
  const getStepNumber = (step: string): number => {
    const steps = ['introduction', 'seed-generation', 'seed-confirmation'];
    return steps.indexOf(step) + 1;
  };

  const getStepProgress = (): number => {
    return (getStepNumber(currentStep) / totalSteps) * 100;
  };

  return (
    <VStack space="md" className="mb-6">
      {/* Progress Bar */}
      <Box className="h-3 w-full rounded-full bg-background-100">
        <Box
          className="h-3 rounded-full bg-green-600 transition-all duration-500"
          style={{ width: `${getStepProgress()}%` }}
        />
      </Box>

      {/* Header */}
      <HStack className="mx-4 items-center" space="sm">
        <Icon as={Shield} size="xl" className="text-typography-500" />
        <Heading size="xl" className="text-center text-typography-800">
          Encryption Setup
        </Heading>
        <View className="flex-1" />
        <MycomizeLogo height={50} width={50} />
      </HStack>
    </VStack>
  );
}
