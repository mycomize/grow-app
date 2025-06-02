import React from 'react';
import { View } from 'react-native';
import { HStack } from '~/components/ui/hstack';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Center } from '~/components/ui/center';
import { Pressable } from '~/components/ui/pressable';
import { Check, Pencil } from 'lucide-react-native';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

export type GrowWizardStep = 'basics' | 'syringe' | 'spawn' | 'bulk' | 'fruiting' | 'harvest';

interface GrowTimelineProps {
  currentStep: GrowWizardStep;
  growId?: string | null;
  editable?: boolean;
  onStepPress?: (step: GrowWizardStep) => void;
}

export const GrowTimeline: React.FC<GrowTimelineProps> = ({
  currentStep,
  growId = null,
  editable = true,
  onStepPress,
}) => {
  const { theme } = useTheme();

  const steps: { key: GrowWizardStep; label: string }[] = [
    { key: 'basics', label: 'Basics' },
    { key: 'syringe', label: 'Syringe' },
    { key: 'spawn', label: 'Spawn' },
    { key: 'bulk', label: 'Bulk' },
    { key: 'fruiting', label: 'Fruiting' },
    { key: 'harvest', label: 'Harvest' },
  ];

  const navigateToStep = (step: GrowWizardStep) => {
    if (!editable) return;

    // Call the callback if provided
    if (onStepPress) {
      onStepPress(step);
    }
  };

  // Calculate the current step index
  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <View className="mx-5 mt-3 text-background-50">
      <HStack className="relative z-10 items-center justify-between px-2 py-4">
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isPast = currentStepIndex > index;
          const isFuture = !isActive && !isPast;
          let circleColor = '';

          // Determine styles based on state
          if (isActive || isPast) {
            circleColor = 'bg-success-300';
          }

          const textColor = isActive
            ? 'text-typography-900 font-bold'
            : isPast
              ? 'text-typography-600'
              : 'text-typography-500';

          return (
            <VStack key={step.key} className="items-center">
              {isActive && (
                <Pressable onPress={() => navigateToStep(step.key)}>
                  <Center className={`ml-1 mt-0.5 h-7 w-7 rounded-full ${circleColor}`}>
                    <Icon as={Pencil} size="sm" className="text-white" />
                  </Center>
                </Pressable>
              )}
              {isPast && (
                <Pressable onPress={() => navigateToStep(step.key)}>
                  <Center className={`ml-1 mt-0.5 h-7 w-7 rounded-full ${circleColor}`}>
                    <Icon as={Check} size="sm" className="text-white" />
                  </Center>
                </Pressable>
              )}
              {isFuture && (
                <Pressable onPress={() => navigateToStep(step.key)}>
                  <Center
                    className={`ml-1 mt-0.5 h-7 w-7 rounded-full border-2 border-background-600 bg-background-0`}
                  />
                </Pressable>
              )}
              <Text className={`ml-1 mt-1 text-sm ${textColor}`}>{step.label}</Text>
            </VStack>
          );
        })}
      </HStack>
    </View>
  );
};
