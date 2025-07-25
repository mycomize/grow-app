import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { Card } from '~/components/ui/card';
import { Box } from '~/components/ui/box';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { Shield } from 'lucide-react-native';

interface SetupProgressStepProps {
  isSettingUp: boolean;
  setupProgress: number;
}

export function SetupProgressStep({ isSettingUp, setupProgress }: SetupProgressStepProps) {
  if (!isSettingUp) return null;

  return (
    <VStack space="lg" className="px-4">
      <Card className="bg-background-0 p-8">
        <VStack space="lg" className="items-center">
          <Spinner size="large" />
          <Text size="lg" className="font-semibold text-typography-800">
            Setting up encryption...
          </Text>
          <Box className="h-3 w-full rounded-full bg-background-100">
            <Box
              className="h-3 rounded-full bg-green-600 transition-all duration-300"
              style={{ width: `${setupProgress}%` }}
            />
          </Box>
          <Text size="md" className="text-typography-600">
            {setupProgress}% complete
          </Text>
          <Text size="sm" className="text-center text-typography-500">
            Generating encryption keys and securing your data...
          </Text>
        </VStack>
      </Card>
    </VStack>
  );
}
