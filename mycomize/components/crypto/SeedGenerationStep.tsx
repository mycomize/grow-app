import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Spinner } from '~/components/ui/spinner';
import { getEncryptionService } from '~/lib/EncryptionService';
import { Lock, Dices, CheckCircle } from 'lucide-react-native';

interface SeedGenerationStepProps {
  onBack: () => void;
  onNext: (seedWords: string[]) => void;
}

export function SeedGenerationStep({ onBack, onNext }: SeedGenerationStepProps) {
  const [seedWords, setSeedWords] = useState<string[]>([]);
  const [seedPhraseDisplay, setSeedPhraseDisplay] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Clear seed data when component mounts (restart scenario)
  useEffect(() => {
    setSeedWords([]);
    setSeedPhraseDisplay('');
    setHasGenerated(false);
  }, []);

  const generateSeedPhrase = async () => {
    setIsGenerating(true);
    try {
      const encryptionService = getEncryptionService();
      const words = await encryptionService.generateSeedPhrase();
      setSeedWords(words);
      setSeedPhraseDisplay(words.join(' '));
      setHasGenerated(true);
    } catch (error) {
      console.error('Failed to generate seed phrase:', error);
      Alert.alert('Error', 'Failed to generate seed phrase. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSeedPhraseChange = (text: string) => {
    setSeedPhraseDisplay(text);
    // Parse the text into words and update seedWords
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setSeedWords(words);
    // If user has typed something, consider it as having a phrase
    setHasGenerated(words.length > 0);
  };

  const handleNext = () => {
    if (hasGenerated && seedWords.length === 12) {
      onNext(seedWords);
    }
  };

  return (
    <VStack space="lg" className="px-4">
      <Card className="bg-background-0 p-6">
        <VStack space="lg" className="pb-5">
          <VStack space="sm">
            <HStack space="sm" className="items-center justify-between">
              <HStack space="sm" className="items-center">
                <Text size="lg" className="font-semibold text-typography-700">
                  Seed Phrase
                </Text>
              </HStack>
              {hasGenerated && (
                <Button
                  onPress={generateSeedPhrase}
                  disabled={isGenerating}
                  size="md"
                  className="bg-blue-600">
                  {isGenerating ? (
                    <HStack space="sm" className="items-center">
                      <Spinner size="small" />
                      <Text className="text-white">Generating...</Text>
                    </HStack>
                  ) : (
                    <HStack space="sm" className="items-center">
                      <Icon as={Dices} size="md" className="text-white" />
                      <Text className="font-semibold text-white">Generate</Text>
                    </HStack>
                  )}
                </Button>
              )}
            </HStack>
            <Text className="mt-1">
              Enter your 12-word seed phrase. This is the secret used to derive your encryption key.
              You can generate one below or, if you know what you are doing, you can enter one your
              self.
            </Text>
          </VStack>

          <Textarea size="lg" className="font-mono mb-3 mt-2 min-h-32 text-base">
            <TextareaInput
              value={seedPhraseDisplay}
              onChangeText={handleSeedPhraseChange}
              editable={true}
              multiline
              textContentType="username"
              textAlignVertical="top"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              className="font-semibold"
            />
          </Textarea>

          {hasGenerated && (
            <VStack space="sm">
              <HStack className="items-center gap-2">
                <Icon as={Lock} size="sm" className="text-typography-600" />
                <Text size="lg" className="font-semibold text-typography-800">
                  Security Reminder
                </Text>
              </HStack>
              <Text size="md" className="text-typography-700">
                • Treat this phrase as a secret password
              </Text>
              <Text size="md" className="text-typography-700">
                • The order and capitalization of the words matter
              </Text>
              <Text size="md" className="text-typography-700">
                • Never share it with anyone
              </Text>
            </VStack>
          )}
        </VStack>
      </Card>
      {!hasGenerated ? (
        <HStack className="mt-3 w-full gap-4">
          <Button size="lg" variant="outline" className="flex-1" onPress={onBack}>
            <Text>Back</Text>
          </Button>
          <Button
            onPress={generateSeedPhrase}
            disabled={isGenerating}
            size="lg"
            className="flex-1 bg-blue-600">
            {isGenerating ? (
              <HStack space="sm" className="items-center">
                <Spinner size="small" />
                <Text>Generating...</Text>
              </HStack>
            ) : (
              <HStack space="sm" className="items-center">
                <Icon as={Dices} size="md" className="text-white" />
                <Text className="font-semibold text-white">Generate</Text>
              </HStack>
            )}
          </Button>
        </HStack>
      ) : (
        <HStack className="mt-3 w-full gap-4">
          <Button size="lg" variant="outline" className="flex-1" onPress={onBack}>
            <Text>Back</Text>
          </Button>
          <Button size="lg" className="flex-1 bg-blue-600" onPress={handleNext}>
            <Icon as={CheckCircle} size="sm" className="mr-0 text-white" />
            <Text className="font-semibold text-white">I've Saved My Phrase</Text>
          </Button>
        </HStack>
      )}
    </VStack>
  );
}
