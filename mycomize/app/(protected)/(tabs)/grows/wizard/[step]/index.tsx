import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Box } from '~/components/ui/box';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Center } from '~/components/ui/center';
import { Spinner } from '~/components/ui/spinner';
import { Check, ArrowRight } from 'lucide-react-native';

import { GrowTimeline, GrowWizardStep } from '~/components/grow/GrowTimeline';
import { GrowWizardProvider, useGrowWizard } from '~/lib/GrowWizardContext';

// Import all step screens
import { BasicsStep } from './BasicsStep';
import { SyringeStep } from './SyringeStep';
import { SpawnStep } from './SpawnStep';
import { BulkStep } from './BulkStep';
import { FruitingStep } from './FruitingStep';
import { HarvestStep } from './HarvestStep';

// This is the container component that renders the appropriate step
const GrowWizardStepContainer: React.FC = () => {
  const { step, id } = useLocalSearchParams<{ step: GrowWizardStep; id: string }>();
  const { isLoading, error, saveGrow } = useGrowWizard();

  const currentStep = step || 'basics';

  // Map step names to components
  const stepComponents: Record<GrowWizardStep, React.ReactNode> = {
    basics: <BasicsStep />,
    syringe: <SyringeStep />,
    spawn: <SpawnStep />,
    bulk: <BulkStep />,
    fruiting: <FruitingStep />,
    harvest: <HarvestStep />,
  };

  // Get next and previous steps
  const steps: GrowWizardStep[] = ['basics', 'syringe', 'spawn', 'bulk', 'fruiting', 'harvest'];
  const currentIndex = steps.indexOf(currentStep);
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;

  // Handle next button click
  const handleNext = async () => {
    if (nextStep) {
      await saveGrow(nextStep);
    } else {
      // If on last step, save and return to grows list
      await saveGrow();
    }
  };

  // Handle back button click
  const handleBack = async () => {
    if (prevStep) {
      await saveGrow(prevStep);
    }
  };

  // If loading, show spinner
  if (isLoading) {
    return (
      <Center className="h-full w-full bg-background-50">
        <Spinner size="large" />
      </Center>
    );
  }

  return (
    <Box className="h-full w-full bg-background-50">
      {/* Just the timeline and content */}
      <GrowTimeline currentStep={currentStep} growId={id} editable={true} />

      <ScrollView className="flex-1">
        <VStack className="flex-1 p-4">
          {error && (
            <Box className="mb-4 rounded-md bg-error-100 p-3">
              <Text className="text-error-600">{error}</Text>
            </Box>
          )}

          <Card className="mb-4 p-4">{stepComponents[currentStep]}</Card>

          {/* Navigation Buttons */}
          <HStack className="mt-4 justify-between">
            {prevStep ? (
              <Button
                variant="outline"
                className="w-5/12 rounded-md border-success-300"
                onPress={handleBack}>
                <ButtonText>Back</ButtonText>
              </Button>
            ) : (
              <Box className="w-5/12" />
            )}

            <Button
              variant="solid"
              className="w-5/12 rounded-md bg-success-300"
              onPress={handleNext}>
              <HStack space="xs" className="items-center">
                <ButtonText className="text-white">{nextStep ? 'Next' : 'Save'}</ButtonText>
                {nextStep && <ButtonIcon className="text-white" as={ArrowRight} />}
                {!nextStep && <ButtonIcon className="text-white" as={Check} />}
              </HStack>
            </Button>
          </HStack>
        </VStack>
      </ScrollView>
    </Box>
  );
};

// Wrapper component that provides the GrowWizardContext
export default function GrowWizardStepScreen() {
  return (
    <GrowWizardProvider>
      <GrowWizardStepContainer />
    </GrowWizardProvider>
  );
}
