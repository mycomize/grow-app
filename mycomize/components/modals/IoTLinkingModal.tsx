import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '~/components/ui/modal';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '~/components/ui/radio';
import { Card } from '~/components/ui/card';
import { ScrollView } from '~/components/ui/scroll-view';
import { X, CircleIcon, CircleX, MoveRight } from 'lucide-react-native';
import MushroomIcon from '~/components/icons/MushroomIcon';
import { BulkGrow } from '~/lib/growTypes';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

interface IoTLinkingModalProps {
  isVisible: boolean;
  mode: 'bulk' | 'individual';
  selectedEntities: string[];
  entityNames: Record<string, string>;
  grows: BulkGrow[];
  onAssign: (growId: number, stage: string) => void;
  onClose: () => void;

  // NEW: Context-aware props
  contextGrowId?: number;
  contextStageName?: string;
  contextMode?: boolean; // Skip grow/stage selection
}

const stages = [
  { value: 'inoculation', label: 'Inoculation' },
  { value: 'spawn_colonization', label: 'Spawn Colonization' },
  { value: 'bulk_colonization', label: 'Bulk Colonization' },
  { value: 'fruiting', label: 'Fruiting' },
  { value: 'harvest', label: 'Harvest' },
];

export function IoTLinkingModal({
  isVisible,
  mode,
  selectedEntities,
  entityNames,
  grows,
  onAssign,
  onClose,
  contextGrowId,
  contextStageName,
  contextMode = false,
}: IoTLinkingModalProps) {
  const [selectedGrowId, setSelectedGrowId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [step, setStep] = useState<'grow' | 'stage'>('grow');
  const { theme } = useTheme();

  // Theme-aware color for mushroom icon
  const mushroomColor = theme === 'dark' ? '#a0a0a0' : '#374151';

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      if (contextMode && contextGrowId && contextStageName) {
        // In context mode, auto-set the values and skip selection
        setSelectedGrowId(contextGrowId.toString());
        setSelectedStage(contextStageName);
        setStep('stage'); // Skip to confirmation
      } else {
        setSelectedGrowId(null);
        setSelectedStage(null);
        setStep('grow');
      }
    }
  }, [isVisible, contextMode, contextGrowId, contextStageName]);

  const handleGrowSelect = (growId: string) => {
    setSelectedGrowId(growId);
  };

  const handleStageSelect = (stage: string) => {
    setSelectedStage(stage);
  };

  const handleAssign = () => {
    if (selectedGrowId && selectedStage) {
      onAssign(parseInt(selectedGrowId), selectedStage);
    }
  };

  const handleBack = () => {
    if (step === 'stage') {
      setStep('grow');
      setSelectedStage(null);
    }
  };

  return (
    <Modal isOpen={isVisible} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent className="max-h-[80%]">
        <ModalHeader>
          <HStack className="items-center" space="sm">
            <MushroomIcon height={20} width={20} color={mushroomColor} strokeWidth={2} />
            <Text className="font-bold text-typography-600" size="lg">
              {mode === 'bulk' ? 'Bulk Link IoT Controls' : 'Link IoT Control'}
            </Text>
          </HStack>
          <ModalCloseButton>
            <Icon as={X} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <VStack space="xl">
            {/* Linking Summary */}
            <VStack space="xs" className="mt-2">
              <Text className="font-semibold text-typography-500">
                {mode === 'bulk'
                  ? selectedEntities.length > 1
                    ? `Linking ${selectedEntities.length} controls:`
                    : `Linking control:`
                  : 'Linking control:'}
              </Text>
              <ScrollView className="max-h-72 min-h-20 rounded-md border border-outline-50 pl-3 pt-2">
                <VStack space="xs">
                  {selectedEntities.map((entityId) => (
                    <Text key={entityId} className="ml-2 text-sm text-typography-600">
                      • {entityNames[entityId] || entityId}
                    </Text>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>

            {/* Progress Indicator or Context Confirmation */}
            {contextMode && contextGrowId && contextStageName ? (
              <VStack space="xs">
                <Text className="font-semibold text-typography-500">Linking to:</Text>
                <HStack className="items-center justify-center" space="md">
                  <Text className="rounded-sm bg-success-300 px-2 py-1 text-center text-sm font-semibold text-typography-800">
                    {grows.find((grow) => Number(grow.id) === Number(contextGrowId))?.name ||
                      'Unknown Grow'}
                  </Text>
                  <Icon as={MoveRight} className="text-success-600" />
                  <Text className="rounded-sm bg-success-300 px-2 py-1 text-center text-sm font-semibold text-typography-800">
                    {stages.find((stage) => stage.value === contextStageName)?.label ||
                      contextStageName}
                  </Text>
                </HStack>
              </VStack>
            ) : (
              <HStack className="mb-3 items-center justify-center" space="md">
                <HStack className="items-center" space="sm">
                  {step === 'stage' && selectedGrowId ? (
                    <Text
                      className="rounded-sm bg-success-300 px-2 py-1 text-center text-sm font-semibold text-typography-800"
                      numberOfLines={1}>
                      {grows.find((grow) => grow.id.toString() === selectedGrowId)?.name}
                    </Text>
                  ) : (
                    <Text
                      className={`text-md ${step === 'grow' ? 'border-b-2 border-success-400 pb-0 font-semibold' : ''}`}>
                      1. Select Grow
                    </Text>
                  )}
                </HStack>
                <Icon as={MoveRight} className="text-typography-500" />
                <HStack className="items-center" space="sm">
                  {selectedStage ? (
                    <Text
                      className="rounded-sm bg-success-300 px-2 py-1 text-center text-sm font-semibold text-typography-800"
                      numberOfLines={1}>
                      {stages.find((stage) => stage.value === selectedStage)?.label}
                    </Text>
                  ) : (
                    <Text
                      className={`text-md ${step === 'stage' ? 'border-b-2 border-success-500 pb-0 font-semibold' : ''}`}>
                      2. Select Stage
                    </Text>
                  )}
                </HStack>
              </HStack>
            )}

            {/* Grow Selection - Hide in context mode */}
            {step === 'grow' && !contextMode && (
              <VStack space="md">
                <Text className="font-semibold text-typography-500">Select a Grow</Text>
                {grows.length === 0 ? (
                  <VStack
                    className="items-center rounded-lg border border-dashed border-typography-300 p-6"
                    space="sm">
                    <Icon as={CircleX} size="xl" className="text-typography-400" />
                    <Text className="text-center font-semibold text-typography-600">
                      No Grows Available
                    </Text>
                    <Text className="text-center text-typography-500">
                      You need to create a grow before linking IoT controls to it.
                    </Text>
                    <Text className="text-center text-sm text-typography-400">
                      Go to the Grow tab and tap the + button to add your first grow.
                    </Text>
                  </VStack>
                ) : (
                  <ScrollView className="max-h-64">
                    <RadioGroup value={selectedGrowId || ''} onChange={handleGrowSelect}>
                      <VStack space="md">
                        {grows.map((grow) => (
                          <Radio key={grow.id.toString()} value={grow.id.toString()} size="md">
                            <RadioIndicator>
                              <RadioIcon as={CircleIcon} />
                            </RadioIndicator>
                            <RadioLabel>
                              <HStack>
                                <VStack>
                                  <Text className="font-medium">{grow.name}</Text>
                                  <HStack space="sm">
                                    {grow.variant && grow.variant !== '' && (
                                      <Text className="text-sm text-typography-500">
                                        {grow.variant}
                                      </Text>
                                    )}
                                    <Text className="text-sm text-typography-400" italic>
                                      {grow.species}
                                    </Text>
                                  </HStack>
                                </VStack>
                              </HStack>
                            </RadioLabel>
                          </Radio>
                        ))}
                      </VStack>
                    </RadioGroup>
                  </ScrollView>
                )}
              </VStack>
            )}

            {/* Stage Selection */}
            {step === 'stage' && (
              <VStack space="md">
                <Text className="mt-2 font-semibold text-typography-500">Select a Stage</Text>
                <ScrollView className="max-h-64">
                  <RadioGroup value={selectedStage || ''} onChange={handleStageSelect}>
                    <VStack space="md">
                      {stages.map((stage) => (
                        <Radio key={stage.value} value={stage.value}>
                          <RadioIndicator>
                            <RadioIcon as={CircleIcon} />
                          </RadioIndicator>
                          <RadioLabel>
                            <Text className="text-typography-600">{stage.label}</Text>
                          </RadioLabel>
                        </Radio>
                      ))}
                    </VStack>
                  </RadioGroup>
                </ScrollView>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack className="w-full justify-between">
            {contextMode ? (
              // Context mode - Simple Cancel/Link buttons
              <>
                <Button variant="outline" action="secondary" onPress={onClose}>
                  <ButtonText>Cancel</ButtonText>
                </Button>
                <Button
                  variant="solid"
                  action="positive"
                  onPress={handleAssign}
                  disabled={!selectedGrowId || !selectedStage}>
                  <ButtonText className="text-typography-900">Link</ButtonText>
                </Button>
              </>
            ) : (
              // Normal mode - Step-by-step navigation
              <>
                <Button
                  variant="outline"
                  action="secondary"
                  onPress={step === 'grow' ? onClose : handleBack}>
                  <ButtonText>{step === 'grow' ? 'Cancel' : 'Back'}</ButtonText>
                </Button>

                {step === 'grow' ? (
                  grows.length === 0 ? (
                    <Button variant="solid" action="primary" onPress={onClose}>
                      <ButtonText>Close</ButtonText>
                    </Button>
                  ) : (
                    <Button
                      variant="solid"
                      action="positive"
                      onPress={() => selectedGrowId && setStep('stage')}
                      disabled={!selectedGrowId}>
                      <ButtonText className="text-typography-900">Next</ButtonText>
                    </Button>
                  )
                ) : (
                  <Button
                    variant="solid"
                    action="positive"
                    onPress={handleAssign}
                    disabled={!selectedStage}>
                    <ButtonText className="text-typography-900">Link</ButtonText>
                  </Button>
                )}
              </>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
