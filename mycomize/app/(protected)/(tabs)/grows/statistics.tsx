import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { ScrollView } from '@/components/ui/scroll-view';
import { Button } from '@/components/ui/button';
import { Layers, PlusCircle } from 'lucide-react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

export default function StatisticsScreen() {
  const { theme } = useTheme();

  const iconColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  return (
    <ScrollView className="flex-1 bg-background-0">
      <VStack space="lg" className="p-6">
        <View className="flex-row items-center justify-between">
          <Heading size="xl" className="text-typography-900">
            Grow Statistics
          </Heading>
        </View>
      </VStack>
    </ScrollView>
  );
}
