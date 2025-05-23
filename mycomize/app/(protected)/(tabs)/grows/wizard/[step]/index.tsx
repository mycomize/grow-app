import React, { useRef, useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Dimensions, View, Animated, FlatList } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
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

const { width: screenWidth } = Dimensions.get('window');

// This is the container component that renders the appropriate step
const GrowWizardStepContainer: React.FC = () => {
  const { step, id } = useLocalSearchParams<{ step: GrowWizardStep; id: string }>();
  const { isLoading, error, saveGrow, finalSaveGrow } = useGrowWizard();
  const router = useRouter();

  // Steps configuration
  const steps: GrowWizardStep[] = ['basics', 'syringe', 'spawn', 'bulk', 'fruiting', 'harvest'];
  const initialIndex = steps.indexOf(step || 'basics');
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const scrollRef = useRef<FlatList>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Step components array
  const stepComponents = [
    { key: 'basics', component: <BasicsStep /> },
    { key: 'syringe', component: <SyringeStep /> },
    { key: 'spawn', component: <SpawnStep /> },
    { key: 'bulk', component: <BulkStep /> },
    { key: 'fruiting', component: <FruitingStep /> },
    { key: 'harvest', component: <HarvestStep /> },
  ];

  const currentStep = steps[currentIndex];
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;

  // We don't update the URL anymore to avoid re-renders
  // The URL will stay at the initial step but the UI will scroll smoothly

  // Scroll to index
  const scrollToIndex = (index: number) => {
    if (scrollRef.current && index >= 0 && index < steps.length) {
      setIsScrolling(true);
      scrollRef.current.scrollToIndex({ index, animated: true });
      setTimeout(() => {
        setCurrentIndex(index);
        setIsScrolling(false);
      }, 300);
    }
  };

  // Handle next button click
  const handleNext = async () => {
    if (nextStep) {
      scrollToIndex(currentIndex + 1);
    } else {
      // If on last step, save and return to grows list
      try {
        await finalSaveGrow();
      } catch (err) {
        // Error is already set in context
      }
    }
  };

  // Handle back button click
  const handleBack = async () => {
    if (prevStep) {
      scrollToIndex(currentIndex - 1);
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

  // Render a single step
  const renderStep = ({ item }: { item: { key: string; component: React.ReactNode } }) => (
    <View style={{ width: screenWidth, backgroundColor: 'transparent' }}>
      <ScrollView className="flex-1 bg-transparent">
        <VStack className="flex-1 bg-transparent p-4">
          {error && (
            <Box className="mb-4 rounded-md bg-error-100 p-3">
              <Text className="text-error-600">{error}</Text>
            </Box>
          )}

          <Card className="mb-4 p-4">{item.component}</Card>

          {/* Navigation Buttons */}
          <HStack className="mt-4 justify-between">
            {currentIndex > 0 ? (
              <Button
                variant="outline"
                className="w-5/12 rounded-md border-success-300"
                onPress={handleBack}
                disabled={isScrolling}>
                <ButtonText>Back</ButtonText>
              </Button>
            ) : (
              <Box className="w-5/12" />
            )}

            <Button
              variant="solid"
              className="w-5/12 rounded-md bg-success-300"
              onPress={handleNext}
              disabled={isScrolling}>
              <HStack space="xs" className="items-center">
                <ButtonText className="text-white">
                  {currentIndex < steps.length - 1 ? 'Next' : 'Save'}
                </ButtonText>
                {currentIndex < steps.length - 1 && (
                  <ButtonIcon className="text-white" as={ArrowRight} />
                )}
                {currentIndex === steps.length - 1 && (
                  <ButtonIcon className="text-white" as={Check} />
                )}
              </HStack>
            </Button>
          </HStack>
        </VStack>
      </ScrollView>
    </View>
  );

  // Handle timeline step press
  const handleTimelineStepPress = (step: GrowWizardStep) => {
    const targetIndex = steps.indexOf(step);
    if (targetIndex >= 0 && targetIndex < steps.length) {
      scrollToIndex(targetIndex);
    }
  };

  return (
    <Box className="h-full w-full bg-background-50">
      {/* Timeline */}
      <GrowTimeline
        currentStep={currentStep}
        growId={id}
        editable={true}
        onStepPress={handleTimelineStepPress}
      />

      {/* Horizontal scroll view for steps */}
      <Box className="flex-1 bg-background-50">
        <FlatList
          ref={scrollRef}
          data={stepComponents}
          renderItem={renderStep}
          horizontal
          pagingEnabled
          scrollEnabled={!isScrolling}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            if (newIndex !== currentIndex && newIndex >= 0 && newIndex < steps.length) {
              setCurrentIndex(newIndex);
            }
          }}
          keyExtractor={(item) => item.key}
          style={{ backgroundColor: 'transparent' }}
          contentContainerStyle={{ backgroundColor: 'transparent' }}
        />
      </Box>
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
