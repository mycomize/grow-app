import React, { useState } from 'react';
import { router } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { ScrollView } from '~/components/ui/scroll-view';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { HStack } from '~/components/ui/hstack';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { Icon } from '~/components/ui/icon';
import { useEncryption } from '~/lib/EncryptionContext';
import { CheckCircle, CircleX } from 'lucide-react-native';
import {
  IntroductionStep,
  SeedGenerationStep,
  SeedConfirmationStep,
  EncryptionHeader,
} from '~/components/crypto';

type EncryptionSetupStep = 'introduction' | 'seed-generation' | 'seed-confirmation';
type EncryptionSetupFlow = 'create' | 'recover';

export default function EncryptionEncryptionSetupScreen() {
  const { initializeEncryption } = useEncryption();
  const { showError, showSuccess } = useUnifiedToast();

  // Step and flow management
  const [currentStep, setCurrentStep] = useState<EncryptionSetupStep>('introduction');
  const [setupFlow, setEncryptionSetupFlow] = useState<EncryptionSetupFlow>('create');

  // Seed phrase state
  const [seedWords, setSeedWords] = useState<string[]>([]);

  // Final setup state
  const [isSettingUp, setIsSettingUp] = useState(false);

  const performEncryptionSetup = async (finalSeedWords: string[], password?: string) => {
    setIsSettingUp(true);

    try {
      const success = await initializeEncryption(finalSeedWords, password);

      if (success) {
        showSuccess('Encryption configured successfully');
        router.replace('/');
      } else {
        showError('Failed to set up encryption');
      }
    } catch (error) {
      console.error('Encryption setup failed:', error);
      showError('An error occurred during setup');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleCreateSeed = () => {
    setEncryptionSetupFlow('create');
    setCurrentStep('seed-generation');
  };

  const handleRecoverData = () => {
    setEncryptionSetupFlow('recover');
    setCurrentStep('seed-confirmation');
  };

  const handleSeedGenerated = (generatedSeedWords: string[]) => {
    setSeedWords(generatedSeedWords);
    setCurrentStep('seed-confirmation');
  };

  const handleSeedConfirmed = (confirmedSeedWords: string[], password?: string) => {
    performEncryptionSetup(confirmedSeedWords, password);
  };

  const handleBackToIntroduction = () => {
    setCurrentStep('introduction');
    setSeedWords([]);
  };

  const handleBackToSeedGeneration = () => {
    if (setupFlow === 'create') {
      setCurrentStep('seed-generation');
    } else {
      setCurrentStep('introduction');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <VStack className="mt-4 min-h-full py-8">
          <EncryptionHeader currentStep={currentStep} totalSteps={3} />

          {currentStep === 'introduction' && (
            <IntroductionStep onCreateSeed={handleCreateSeed} onRecoverData={handleRecoverData} />
          )}

          {currentStep === 'seed-generation' && (
            <SeedGenerationStep onBack={handleBackToIntroduction} onNext={handleSeedGenerated} />
          )}

          {currentStep === 'seed-confirmation' && (
            <SeedConfirmationStep
              seedWords={setupFlow === 'create' ? seedWords : undefined}
              isRecovery={setupFlow === 'recover'}
              onBack={handleBackToSeedGeneration}
              onNext={handleSeedConfirmed}
            />
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
