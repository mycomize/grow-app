import React, { useState, useEffect } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Box } from '~/components/ui/box';
import { Icon } from '~/components/ui/icon';
import { Input, InputField } from '~/components/ui/input';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from '~/components/ui/checkbox';
import { InfoBadge } from '~/components/ui/info-badge';
import { CheckIcon, CheckCircle, AlertTriangle, ArrowRight, Info } from 'lucide-react-native';

interface SeedConfirmationStepProps {
  seedWords?: string[]; // For confirmation of generated seed
  isRecovery?: boolean; // For recovery flow
  onBack: () => void;
  onNext: (seedWords: string[], password?: string) => void;
}

export function SeedConfirmationStep({
  seedWords = [],
  isRecovery = false,
  onBack,
  onNext,
}: SeedConfirmationStepProps) {
  // Confirmation state
  const [confirmationInput, setConfirmationInput] = useState('');
  const [confirmationWords, setConfirmationWords] = useState<string[]>([]);
  const [isConfirmationValid, setIsConfirmationValid] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Password state
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);

  // Validate confirmation input in real-time
  useEffect(() => {
    const inputWords = confirmationInput
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setConfirmationWords(inputWords);

    if (inputWords.length === 0) {
      setIsConfirmationValid(false);
      setShowValidation(false);
      return;
    }

    if (inputWords.length > 12) {
      setIsConfirmationValid(false);
      setShowValidation(true);
      return;
    }

    // For recovery mode, we don't have seedWords to compare against
    // So we just check if we have 12 valid-looking words
    if (isRecovery) {
      const isValid = inputWords.length === 12;
      setIsConfirmationValid(isValid);
      setShowValidation(inputWords.length > 0);
    } else {
      // For confirmation mode, check against provided seedWords
      const isValid = inputWords.every((word, index) => {
        return index < seedWords.length && word === seedWords[index].toLowerCase();
      });
      setIsConfirmationValid(isValid && inputWords.length === 12);
      setShowValidation(inputWords.length > 0);
    }
  }, [confirmationInput, isRecovery, seedWords.join('|')]);

  // Validate password confirmation in real-time
  useEffect(() => {
    if (!usePassword) {
      setPasswordsMatch(false);
      setShowPasswordValidation(false);
      return;
    }

    const hasPassword = encryptionPassword.length > 0;
    const hasConfirmation = confirmPassword.length > 0;

    if (!hasPassword && !hasConfirmation) {
      setPasswordsMatch(false);
      setShowPasswordValidation(false);
      return;
    }

    if (hasConfirmation) {
      const match = encryptionPassword === confirmPassword;
      setPasswordsMatch(match);
      setShowPasswordValidation(true);
    } else {
      setShowPasswordValidation(false);
    }
  }, [encryptionPassword, confirmPassword, usePassword]);

  const getWordValidationColor = (index: number): 'success' | 'error' | 'default' => {
    if (!showValidation || index >= confirmationWords.length) return 'default';

    if (isRecovery) {
      // In recovery mode, we can't validate individual words
      // Just show them as entered
      return 'default';
    }

    const isCorrect = confirmationWords[index] === seedWords[index]?.toLowerCase();
    return isCorrect ? 'success' : 'error';
  };

  const handleNext = () => {
    if (!isConfirmationValid || (usePassword && (!encryptionPassword || !passwordsMatch))) {
      return;
    }

    const finalSeedWords = isRecovery ? confirmationWords : seedWords;
    onNext(finalSeedWords, usePassword ? encryptionPassword : undefined);
  };

  return (
    <VStack space="lg" className="px-4">
      <Card className="bg-background-0 p-6">
        <VStack space="lg" className="mb-4">
          <VStack space="sm">
            <Text size="lg" className="font-semibold text-typography-800">
              {isRecovery ? 'Enter Seed Phrase' : 'Verify Seed Phrase'}
            </Text>
            <Text size="md" className="text-typography-600">
              {isRecovery
                ? 'Enter all 12 words in order separated by spaces to recover your data'
                : 'Enter all 12 words in order separated by spaces'}
            </Text>
          </VStack>

          <Textarea size="lg" className="min-h-32">
            <TextareaInput
              value={confirmationInput}
              onChangeText={setConfirmationInput}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
            />
          </Textarea>

          {showValidation && (
            <Box className="mt-2">
              <HStack space="sm" className="items-center">
                <Text size="md" className="mb-2 flex-1 font-semibold text-typography-600">
                  Word validation
                </Text>
                {isConfirmationValid && <Icon as={CheckCircle} className="mb-2 text-green-600" />}
                <InfoBadge
                  key="word-validation"
                  text={`${confirmationWords.length} / 12`}
                  variant="default"
                  size="sm"
                  className="mb-2"
                />
              </HStack>
              <Box className="mt-2 flex-row flex-wrap gap-1">
                {Array.from({ length: 12 }, (_, index) => {
                  const isEntered = index < confirmationWords.length;
                  const variant = isEntered ? getWordValidationColor(index) : 'default';

                  return (
                    <InfoBadge
                      key={index}
                      text={`${index + 1}: ${confirmationWords[index] || '...'}`}
                      variant={variant}
                      size="sm"
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Seed Password Section */}
          <VStack space="lg" className="mt-4">
            <HStack className="items-start justify-between">
              <VStack space="xs" className="mr-4 flex-1">
                <HStack space="sm" className="items-center">
                  <Text size="lg" className="font-semibold text-typography-800">
                    Seed Password
                  </Text>
                  <Text italic className="text-typography-400">
                    Optional
                  </Text>
                  <Checkbox
                    value="use-password"
                    isChecked={usePassword}
                    onChange={() => {
                      const newUsePassword = !usePassword;
                      setUsePassword(newUsePassword);

                      // Reset password fields when deselecting password option
                      if (!newUsePassword) {
                        setEncryptionPassword('');
                        setConfirmPassword('');
                      }
                    }}
                    size="md"
                    className="ml-auto">
                    <CheckboxIndicator>
                      <CheckboxIcon as={CheckIcon} />
                    </CheckboxIndicator>
                  </Checkbox>
                </HStack>
                <HStack className="items-center" space="sm">
                  <Icon as={Info} size="md" className="text-typography-400" />
                  <Text size="md" className="mt-2 text-typography-600">
                    Second factor that protects your data in case your seed phrase is compromised
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            {usePassword && (
              <VStack space="md">
                <Input size="lg">
                  <InputField
                    placeholder="Enter seed password"
                    value={encryptionPassword}
                    onChangeText={setEncryptionPassword}
                    autoCapitalize="none"
                    type="password"
                  />
                </Input>

                <VStack space="xs">
                  <HStack className="items-center" space="sm">
                    <Input size="lg" className="flex-1">
                      <InputField
                        placeholder="Confirm seed password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        autoCapitalize="none"
                        type="password"
                      />
                    </Input>
                    {showPasswordValidation && (
                      <Icon
                        as={passwordsMatch ? CheckCircle : AlertTriangle}
                        size="md"
                        className={passwordsMatch ? 'text-green-600' : 'text-red-600'}
                      />
                    )}
                  </HStack>

                  {showPasswordValidation && (
                    <Text
                      size="sm"
                      className={`ml-1 ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  )}
                </VStack>

                <HStack className="mb-2 mt-3 items-center gap-2">
                  <Icon as={AlertTriangle} size="md" className="text-amber-600" />
                  <Text size="md" className="text-typography-600">
                    <Text className="font-semibold">Critical:</Text> If you forget this password,
                    you cannot recover your data even with the seed phrase
                  </Text>
                </HStack>
              </VStack>
            )}
          </VStack>
        </VStack>
      </Card>

      <HStack className="w-full gap-4">
        <Button size="lg" variant="outline" className="flex-1" onPress={onBack}>
          <Text>Back</Text>
        </Button>
        <Button
          size="lg"
          className={`flex-1 ${
            !isConfirmationValid || (usePassword && (!encryptionPassword || !passwordsMatch))
              ? 'bg-background-300'
              : 'bg-blue-600'
          }`}
          disabled={
            !isConfirmationValid || (usePassword && (!encryptionPassword || !passwordsMatch))
          }
          onPress={handleNext}>
          {!isConfirmationValid || (usePassword && (!encryptionPassword || !passwordsMatch)) ? (
            <Text className="font-semibold text-typography-500">Continue</Text>
          ) : (
            <HStack space="sm" className="items-center">
              <Text className="font-semibold text-white">
                {isRecovery ? 'Recover Data' : 'Complete'}
              </Text>
              <Icon as={ArrowRight} size="sm" className="text-white" />
            </HStack>
          )}
        </Button>
      </HStack>
    </VStack>
  );
}
