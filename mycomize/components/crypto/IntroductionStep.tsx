import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion';
import {
  UserLock,
  Key,
  Dot,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCcw,
} from 'lucide-react-native';

interface IntroductionStepProps {
  onCreateSeed: () => void;
  onRecoverData: () => void;
}

export function IntroductionStep({ onCreateSeed, onRecoverData }: IntroductionStepProps) {
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([
    'client-encryption',
    'key-management',
  ]);

  return (
    <VStack space="xl" className="items-center px-2">
      <Accordion
        type="multiple"
        value={expandedAccordions}
        onValueChange={setExpandedAccordions}
        size="md"
        variant="unfilled"
        className="mx-4 w-11/12 gap-4">
        <AccordionItem value="client-encryption" className="rounded-md bg-background-0">
          <AccordionHeader>
            <AccordionTrigger>
              {({ isExpanded }: { isExpanded: boolean }) => (
                <HStack className="flex-1 items-center justify-between">
                  <HStack className="items-center" space="md">
                    <Icon as={UserLock} size="lg" className="text-typography-500" />
                    <Text className="text-lg font-semibold text-typography-700">
                      Client-side Encryption
                    </Text>
                  </HStack>
                  <Icon
                    as={isExpanded ? ChevronDown : ChevronRight}
                    size="lg"
                    className="text-typography-900"
                  />
                </HStack>
              )}
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent>
            <VStack space="sm">
              <HStack className="items-start gap-2">
                <Icon as={Dot} size="xl" className="mt-1 text-typography-500" />
                <Text size="md" className="flex-1 text-typography-700">
                  All your data is encrypted before leaving your device
                </Text>
              </HStack>
              <HStack className="items-start gap-2">
                <Icon as={Dot} size="xl" className="mt-1 text-typography-500" />
                <Text size="md" className="flex-1 text-typography-700">
                  OpenTek servers never see your data unencrypted unless you explicitly allow it
                </Text>
              </HStack>
              <HStack className="items-start gap-2">
                <Icon as={Dot} size="xl" className="mt-1 text-typography-500" />
                <Text size="md" className="flex-1 text-typography-700">
                  Offers complete control and privacy of your data
                </Text>
              </HStack>
            </VStack>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="key-management" className="rounded-md bg-background-0">
          <AccordionHeader>
            <AccordionTrigger>
              {({ isExpanded }: { isExpanded: boolean }) => (
                <HStack className="flex-1 items-center justify-between">
                  <HStack className="items-center" space="md">
                    <Icon as={Key} size="lg" className="text-typography-500" />
                    <Text className="text-lg font-semibold text-typography-700">
                      Key Management
                    </Text>
                  </HStack>
                  <Icon
                    as={isExpanded ? ChevronDown : ChevronRight}
                    size="lg"
                    className="text-typography-900"
                  />
                </HStack>
              )}
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent>
            <VStack space="sm">
              <HStack className="items-start gap-2">
                <Icon as={Dot} size="xl" className="mt-1 text-typography-500" />
                <Text size="md" className="flex-1 text-typography-700">
                  The encryption key is derived locally from your seed phrase using open-source
                  cryptography libraries
                </Text>
              </HStack>
              <HStack className="items-start gap-2">
                <Icon as={Dot} size="xl" className="mt-1 text-typography-500" />
                <Text size="md" className="flex-1 text-typography-700">
                  Your seed phrase enables you to recover your data, even if you delete the app or
                  get a new device
                </Text>
              </HStack>
              <HStack className="items-start gap-2">
                <Icon as={Dot} size="xl" className="mt-1 text-typography-500" />
                <Text size="md" className="flex-1 text-typography-700">
                  The key never leaves your device and is stored in encrypted storage
                </Text>
              </HStack>
            </VStack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <HStack space="lg" className="mx-auto mt-4">
        <Button size="lg" className="bg-blue-600" onPress={onRecoverData}>
          <ButtonIcon as={RefreshCcw} size="md" className=" text-white" />
          <ButtonText className="text-lg text-white">Recover Data</ButtonText>
        </Button>
        <Button size="lg" className="bg-blue-600" onPress={onCreateSeed}>
          <ButtonIcon as={Plus} size="md" className="text-white" />
          <ButtonText className="text-lg text-white">Create Seed</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}
