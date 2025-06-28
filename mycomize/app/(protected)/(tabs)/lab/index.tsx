import React from 'react';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Beaker } from 'lucide-react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

export default function LabScreen() {
  const { theme } = useTheme();
  const iconColor = theme === 'dark' ? '#ffffff' : '#000000';

  return (
    <View className="bg-background flex-1">
      <VStack space="lg" className="p-4">
        <VStack space="sm" className="items-center">
          <Beaker color={iconColor} size={48} />
          <Heading size="2xl" className="text-center">
            Lab
          </Heading>
          <Text className="text-typography-muted text-center">
            Experimental features and testing environment
          </Text>
        </VStack>

        <Card className="p-4">
          <VStack space="md">
            <Heading size="lg">Coming Soon</Heading>
            <Text className="text-typography-muted">
              This section will contain experimental features and tools for running various
              experiments with your growing environment.
            </Text>
            <Text className="text-typography-muted">Features planned:</Text>
            <VStack space="xs" className="ml-4">
              <Text className="text-typography-muted">• Environment testing protocols</Text>
              <Text className="text-typography-muted">• Growth optimization experiments</Text>
              <Text className="text-typography-muted">• Sensor calibration tools</Text>
              <Text className="text-typography-muted">• Custom experiment designer</Text>
            </VStack>
          </VStack>
        </Card>
      </VStack>
    </View>
  );
}
