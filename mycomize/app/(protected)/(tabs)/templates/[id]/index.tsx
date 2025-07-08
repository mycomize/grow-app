import React, { useState, useEffect, useContext } from 'react';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { useToast, Toast } from '~/components/ui/toast';
import { Pressable } from '~/components/ui/pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Play,
  Edit,
  Share,
  Clock,
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Thermometer,
  Droplets,
  Wind,
  Lightbulb,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';

interface MonotubTekTemplate {
  id: number;
  name: string;
  description?: string;
  species: string;
  variant?: string;
  tek_type: string;
  difficulty: string;
  estimated_timeline?: number;
  tags?: string[];
  spawn_type: string;
  spawn_amount: number;
  bulk_type: string;
  bulk_amount: number;
  is_public: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  usage_count: number;
  creator_name?: string;
  environmental_conditions?: any;
  environmental_sensors?: any[];
  scheduled_actions?: any[];
  stage_durations?: any;
}

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();

  const [template, setTemplate] = useState<MonotubTekTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load template
  const loadTemplate = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBackendUrl()}/monotub-tek-templates/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (response.status === 404) {
          throw new Error('Template not found');
        }
        throw new Error('Failed to load template');
      }

      const templateData = await response.json();
      setTemplate(templateData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [id, token]);

  // Toast functions
  const showToast = (message: string, type: 'error' | 'success') => {
    const toastId = Math.random().toString();
    const bgColor = 'bg-background-0';
    const textColor =
      type === 'error'
        ? theme === 'dark'
          ? 'text-error-600'
          : 'text-error-700'
        : theme === 'dark'
          ? 'text-green-600'
          : 'text-green-700';
    const descColor = 'text-typography-300';

    toast.show({
      id: `${type}-toast-${toastId}`,
      placement: 'top',
      duration: 3000,
      render: () => (
        <Toast variant="outline" className={`mx-auto mt-28 w-full p-4 ${bgColor}`}>
          <VStack space="xs" className="w-full">
            <HStack className="flex-row gap-2">
              <Icon
                as={type === 'error' ? AlertCircle : CheckCircle}
                className={`mt-0.5 ${textColor}`}
              />
              <Text className={`font-semibold ${textColor}`}>
                {type === 'error' ? 'Error' : 'Success'}
              </Text>
            </HStack>
            <Text className={descColor}>{message}</Text>
          </VStack>
        </Toast>
      ),
    });
  };

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      setError(null);
    }
  }, [error, theme]);

  const handleUseTemplate = () => {
    if (!template) return;
    router.push(`/templates/${template.id}/use`);
  };

  const handleEditTemplate = () => {
    if (!template) return;
    router.push(`/templates/${template.id}/edit`);
  };

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4">Loading template...</Text>
      </VStack>
    );
  }

  if (!template) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Text className="text-center text-typography-500">Template not found</Text>
        <Button variant="outline" onPress={() => router.back()} className="mt-4">
          <ButtonText>Go Back</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <VStack className="flex-1 bg-background-50">
      <ScrollView className="flex-1">
        <VStack className="p-4" space="md">
          {/* Header */}
          <VStack className="rounded-lg bg-background-0 p-4" space="md">
            <VStack space="sm">
              <Heading size="xl">{template.name}</Heading>
              <Text className="text-lg italic text-typography-600">
                {template.species} {template.variant && `• ${template.variant}`}
              </Text>
              {template.description && (
                <Text className="text-typography-700">{template.description}</Text>
              )}
            </VStack>

            <HStack className="items-center justify-between">
              <HStack space="md" className="items-center">
                <Text
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    template.difficulty === 'Beginner'
                      ? 'bg-green-100 text-green-800'
                      : template.difficulty === 'Intermediate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                  {template.difficulty}
                </Text>

                {template.estimated_timeline && (
                  <HStack space="xs" className="items-center">
                    <Icon as={Clock} size="sm" className="text-typography-500" />
                    <Text className="text-sm text-typography-500">
                      ~{template.estimated_timeline} days
                    </Text>
                  </HStack>
                )}

                <HStack space="xs" className="items-center">
                  <Icon as={TrendingUp} size="sm" className="text-typography-500" />
                  <Text className="text-sm text-typography-500">
                    Used {template.usage_count} times
                  </Text>
                </HStack>
              </HStack>

              <HStack space="sm">
                <Button size="sm" variant="solid" action="positive" onPress={handleUseTemplate}>
                  <ButtonIcon as={Play} />
                  <ButtonText>Use Template</ButtonText>
                </Button>

                {/* Show edit button if user owns the template */}
                {/* Note: You'd need to get current user ID to compare with template.created_by */}
                <Button size="sm" variant="outline" onPress={handleEditTemplate}>
                  <ButtonIcon as={Edit} />
                </Button>
              </HStack>
            </HStack>

            {/* Creator and date info */}
            <HStack className="items-center justify-between">
              <HStack space="md" className="items-center">
                {template.creator_name && (
                  <HStack space="xs" className="items-center">
                    <Icon as={User} size="sm" className="text-typography-500" />
                    <Text className="text-sm text-typography-500">by {template.creator_name}</Text>
                  </HStack>
                )}
                <Text className="text-xs text-typography-400">
                  Created {new Date(template.created_at).toLocaleDateString()}
                </Text>
              </HStack>

              <Text
                className={`rounded px-2 py-1 text-xs ${
                  template.is_public
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-background-200 text-typography-600'
                }`}>
                {template.is_public ? 'Public' : 'Private'}
              </Text>
            </HStack>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <HStack space="xs" className="flex-wrap">
                {template.tags.map((tag, index) => (
                  <Text
                    key={index}
                    className="rounded bg-background-100 px-2 py-1 text-xs text-typography-600">
                    {tag}
                  </Text>
                ))}
              </HStack>
            )}
          </VStack>

          {/* Materials */}
          <VStack className="rounded-lg bg-background-0 p-4" space="md">
            <Text className="text-lg font-semibold">Materials</Text>

            <VStack space="sm">
              <HStack className="items-center justify-between">
                <Text className="font-medium">Spawn</Text>
                <Text className="text-typography-600">
                  {template.spawn_amount} lbs {template.spawn_type}
                </Text>
              </HStack>
              <HStack className="items-center justify-between">
                <Text className="font-medium">Bulk Substrate</Text>
                <Text className="text-typography-600">
                  {template.bulk_amount} lbs {template.bulk_type}
                </Text>
              </HStack>
            </VStack>
          </VStack>

          {/* Environmental Conditions */}
          {template.environmental_conditions && (
            <VStack className="rounded-lg bg-background-0 p-4" space="md">
              <HStack className="items-center" space="sm">
                <Icon as={Thermometer} size="lg" className="text-primary-600" />
                <Text className="text-lg font-semibold">Environmental Conditions</Text>
              </HStack>

              <VStack space="sm">
                {template.environmental_conditions.spawn_temp_range && (
                  <HStack className="items-center justify-between">
                    <Text className="font-medium">Spawn Temperature</Text>
                    <Text className="text-typography-600">
                      {template.environmental_conditions.spawn_temp_range[0]}°F -{' '}
                      {template.environmental_conditions.spawn_temp_range[1]}°F
                    </Text>
                  </HStack>
                )}

                {template.environmental_conditions.bulk_temp_range && (
                  <HStack className="items-center justify-between">
                    <Text className="font-medium">Bulk Temperature</Text>
                    <Text className="text-typography-600">
                      {template.environmental_conditions.bulk_temp_range[0]}°F -{' '}
                      {template.environmental_conditions.bulk_temp_range[1]}°F
                    </Text>
                  </HStack>
                )}

                {template.environmental_conditions.fruiting_temp_range && (
                  <HStack className="items-center justify-between">
                    <Text className="font-medium">Fruiting Temperature</Text>
                    <Text className="text-typography-600">
                      {template.environmental_conditions.fruiting_temp_range[0]}°F -{' '}
                      {template.environmental_conditions.fruiting_temp_range[1]}°F
                    </Text>
                  </HStack>
                )}

                {template.environmental_conditions.humidity_ranges?.fruiting && (
                  <HStack className="items-center justify-between">
                    <Text className="font-medium">Fruiting Humidity</Text>
                    <Text className="text-typography-600">
                      {template.environmental_conditions.humidity_ranges.fruiting[0]}% -{' '}
                      {template.environmental_conditions.humidity_ranges.fruiting[1]}%
                    </Text>
                  </HStack>
                )}
              </VStack>
            </VStack>
          )}

          {/* Stage Durations */}
          {template.stage_durations && (
            <VStack className="rounded-lg bg-background-0 p-4" space="md">
              <HStack className="items-center" space="sm">
                <Icon as={Calendar} size="lg" className="text-primary-600" />
                <Text className="text-lg font-semibold">Stage Timeline</Text>
              </HStack>

              <VStack space="sm">
                {template.stage_durations.spawn_colonization && (
                  <HStack className="items-center justify-between">
                    <Text className="font-medium">Spawn Colonization</Text>
                    <Text className="text-typography-600">
                      {template.stage_durations.spawn_colonization[0]} -{' '}
                      {template.stage_durations.spawn_colonization[1]} days
                    </Text>
                  </HStack>
                )}

                {template.stage_durations.bulk_colonization && (
                  <HStack className="items-center justify-between">
                    <Text className="font-medium">Bulk Colonization</Text>
                    <Text className="text-typography-600">
                      {template.stage_durations.bulk_colonization[0]} -{' '}
                      {template.stage_durations.bulk_colonization[1]} days
                    </Text>
                  </HStack>
                )}

                {template.stage_durations.fruiting && (
                  <HStack className="items-center justify-between">
                    <Text className="font-medium">Fruiting</Text>
                    <Text className="text-typography-600">
                      {template.stage_durations.fruiting[0]} -{' '}
                      {template.stage_durations.fruiting[1]} days
                    </Text>
                  </HStack>
                )}
              </VStack>
            </VStack>
          )}

          {/* Scheduled Actions */}
          {template.scheduled_actions && template.scheduled_actions.length > 0 && (
            <VStack className="rounded-lg bg-background-0 p-4" space="md">
              <HStack className="items-center" space="sm">
                <Icon as={Lightbulb} size="lg" className="text-primary-600" />
                <Text className="text-lg font-semibold">Scheduled Actions</Text>
              </HStack>

              <VStack space="sm">
                {template.scheduled_actions.map((action: any, index: number) => (
                  <VStack key={index} className="rounded bg-background-50 p-3" space="xs">
                    <HStack className="items-center justify-between">
                      <Text className="font-medium capitalize">
                        {action.stage.replace('_', ' ')}
                      </Text>
                      <Text className="text-sm text-typography-500">Day {action.day_offset}</Text>
                    </HStack>
                    <Text className="text-sm text-typography-600">{action.description}</Text>
                    {action.frequency && (
                      <Text className="text-xs text-typography-500">
                        Frequency: {action.frequency}
                      </Text>
                    )}
                    {action.is_critical && (
                      <Text className="text-xs font-medium text-amber-600">Critical Action</Text>
                    )}
                  </VStack>
                ))}
              </VStack>
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </VStack>
  );
}
