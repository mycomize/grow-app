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

export default function TemplatesScreen() {
  const { theme } = useTheme();

  const iconColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  const handleCreateTemplate = () => {
    // TODO: Implement template creation functionality
    console.log('Create template');
  };

  const handleUseTemplate = (templateName: string) => {
    // TODO: Implement template usage functionality
    console.log('Use template:', templateName);
  };

  return (
    <ScrollView className="flex-1 bg-background-0">
      <VStack space="lg" className="p-6">
        <View className="flex-row items-center justify-between">
          <Heading size="xl" className="text-typography-900">
            Grow Templates
          </Heading>
          <Button onPress={handleCreateTemplate} size="sm">
            <Text className="font-medium text-white">Create</Text>
          </Button>
        </View>

        <Text className="text-base text-typography-600">
          Save time by using pre-configured grow templates with optimal settings for different
          mushroom varieties.
        </Text>

        {/* Template Categories */}
        <VStack space="md">
          <Heading size="lg" className="text-typography-800">
            Popular Templates
          </Heading>

          <Card className="p-4">
            <VStack space="sm">
              <View className="flex-row items-center justify-between">
                <HStack space="sm" className="items-center">
                  <Layers size={20} color={iconColor} />
                  <Text className="text-lg font-semibold text-typography-900">
                    Oyster Mushroom Standard
                  </Text>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => handleUseTemplate('Oyster Standard')}>
                  <Text className="text-primary-600">Use</Text>
                </Button>
              </View>
              <Text className="text-typography-600">
                Optimized settings for oyster mushroom cultivation with standard timeline and
                environmental controls.
              </Text>
              <HStack space="md" className="items-center">
                <Text className="text-sm text-typography-500">Duration: 6-8 weeks</Text>
                <Text className="text-sm text-typography-500">•</Text>
                <Text className="text-sm text-typography-500">Temperature: 65-75°F</Text>
              </HStack>
            </VStack>
          </Card>

          <Card className="p-4">
            <VStack space="sm">
              <View className="flex-row items-center justify-between">
                <HStack space="sm" className="items-center">
                  <Layers size={20} color={iconColor} />
                  <Text className="text-lg font-semibold text-typography-900">
                    Shiitake Premium
                  </Text>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => handleUseTemplate('Shiitake Premium')}>
                  <Text className="text-primary-600">Use</Text>
                </Button>
              </View>
              <Text className="text-typography-600">
                Advanced shiitake cultivation template with extended colonization and fruiting
                phases.
              </Text>
              <HStack space="md" className="items-center">
                <Text className="text-sm text-typography-500">Duration: 10-12 weeks</Text>
                <Text className="text-sm text-typography-500">•</Text>
                <Text className="text-sm text-typography-500">Temperature: 55-75°F</Text>
              </HStack>
            </VStack>
          </Card>

          <Card className="p-4">
            <VStack space="sm">
              <View className="flex-row items-center justify-between">
                <HStack space="sm" className="items-center">
                  <Layers size={20} color={iconColor} />
                  <Text className="text-lg font-semibold text-typography-900">
                    Lion's Mane Gourmet
                  </Text>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => handleUseTemplate("Lion's Mane Gourmet")}>
                  <Text className="text-primary-600">Use</Text>
                </Button>
              </View>
              <Text className="text-typography-600">
                Specialized template for lion's mane with precise humidity and CO2 management.
              </Text>
              <HStack space="md" className="items-center">
                <Text className="text-sm text-typography-500">Duration: 8-10 weeks</Text>
                <Text className="text-sm text-typography-500">•</Text>
                <Text className="text-sm text-typography-500">Temperature: 65-70°F</Text>
              </HStack>
            </VStack>
          </Card>
        </VStack>

        {/* Custom Templates Section */}
        <VStack space="md">
          <Heading size="lg" className="text-typography-800">
            My Templates
          </Heading>

          <Card className="p-6">
            <VStack space="sm" className="items-center">
              <PlusCircle size={48} color={iconColor} />
              <Text className="text-center text-typography-600">No custom templates yet</Text>
              <Text className="text-center text-sm text-typography-500">
                Create templates from your successful grows to reuse optimal settings
              </Text>
              <Button onPress={handleCreateTemplate} className="mt-2">
                <Text className="font-medium text-white">Create Your First Template</Text>
              </Button>
            </VStack>
          </Card>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
