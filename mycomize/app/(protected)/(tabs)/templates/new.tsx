import React, { useState, useContext } from 'react';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Input, InputField } from '~/components/ui/input';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Icon } from '~/components/ui/icon';
import { useToast, Toast } from '~/components/ui/toast';
import { Pressable } from '~/components/ui/pressable';
import { Keyboard } from 'react-native';
import { Switch } from '~/components/ui/switch';
import { Save, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { MonotubTekTemplateData, createEmptyTemplateData } from '~/lib/templateTypes';
import { StageAccordion } from '~/components/template/StageAccordion';

export default function NewTemplateScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();

  const [templateData, setTemplateData] =
    useState<MonotubTekTemplateData>(createEmptyTemplateData());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Keyboard visibility tracking
  React.useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Update template data field
  const updateField = (field: keyof MonotubTekTemplateData, value: any) => {
    setTemplateData((prev: MonotubTekTemplateData) => ({ ...prev, [field]: value }));
  };

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !templateData.tags.includes(tagInput.trim())) {
      updateField('tags', [...templateData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    updateField(
      'tags',
      templateData.tags.filter((tag: string) => tag !== tagToRemove)
    );
  };

  // Save template
  const saveTemplate = async () => {
    // Basic validation
    if (!templateData.name.trim()) {
      setError('Template name is required');
      return;
    }
    if (!templateData.species.trim()) {
      setError('Species is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${getBackendUrl()}/monotub-tek-templates/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save template');
      }

      setSuccess('Template saved successfully!');

      // Navigate back to templates list
      setTimeout(() => {
        router.replace('/templates');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

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

  React.useEffect(() => {
    if (error) {
      showToast(error, 'error');
      setError(null);
    }
  }, [error, theme]);

  React.useEffect(() => {
    if (success) {
      showToast(success, 'success');
      setSuccess(null);
    }
  }, [success, theme]);

  return (
    <VStack className="flex-1 bg-background-50">
      <ScrollView className="flex-1">
        <VStack className="p-4" space="md">
          {/* Basic Information Section */}
          <VStack className="rounded-lg bg-background-0 p-4" space="md">
            <Text className="text-lg font-semibold">Basic Information</Text>

            {/* Template Name */}
            <VStack space="sm">
              <Text className="font-medium">Template Name</Text>
              <Input>
                <InputField
                  placeholder="e.g., Super Awesome High Yield Monotub Tek"
                  value={templateData.name}
                  onChangeText={(value) => updateField('name', value)}
                />
              </Input>
            </VStack>

            {/* Description */}
            <VStack space="sm">
              <Text className="font-medium">Description</Text>
              <Textarea>
                <TextareaInput
                  placeholder="Describe your template..."
                  value={templateData.description}
                  onChangeText={(value) => updateField('description', value)}
                  style={{ textAlignVertical: 'top' }}
                />
              </Textarea>
            </VStack>

            {/* Species and Variant */}
            <HStack space="md">
              <VStack className="flex-1" space="sm">
                <Text className="font-medium">Species</Text>
                <Input>
                  <InputField
                    placeholder="e.g., Psilocybe cubensis"
                    value={templateData.species}
                    onChangeText={(value) => updateField('species', value)}
                  />
                </Input>
              </VStack>
              <VStack className="flex-1" space="sm">
                <Text className="font-medium">Variant</Text>
                <Input>
                  <InputField
                    placeholder="e.g., Golden Teacher"
                    value={templateData.variant}
                    onChangeText={(value) => updateField('variant', value)}
                  />
                </Input>
              </VStack>
            </HStack>
          </VStack>

          {/* Stage-based Template Section */}
          <VStack className="rounded-lg bg-background-0 p-4" space="md">
            <StageAccordion templateData={templateData} onUpdateTemplateData={setTemplateData} />
          </VStack>

          {/* Settings Section */}
          <VStack className="rounded-lg bg-background-0 p-4" space="md">
            <Text className="text-lg font-semibold">Settings</Text>

            {/* Public/Private */}
            <HStack className="items-center justify-between">
              <VStack className="flex-1" space="xs">
                <Text className="font-medium">Make Public</Text>
                <Text className="text-sm text-typography-500">
                  Allow other users to discover and use this template
                </Text>
              </VStack>
              <Switch
                value={templateData.isPublic}
                onValueChange={(value) => updateField('isPublic', value)}
              />
            </HStack>

            {/* Tags */}
            <VStack space="sm">
              <Text className="font-medium">Tags</Text>
              <HStack space="sm" className="items-center">
                <Input className="flex-1">
                  <InputField
                    placeholder="Add tags..."
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={addTag}
                  />
                </Input>
                <Button size="sm" variant="outline" onPress={addTag}>
                  <ButtonText>Add</ButtonText>
                </Button>
              </HStack>

              {templateData.tags.length > 0 && (
                <HStack space="xs" className="flex-wrap">
                  {templateData.tags.map((tag: string, index: number) => (
                    <Pressable
                      key={index}
                      onPress={() => removeTag(tag)}
                      className="rounded bg-primary-100 px-2 py-1">
                      <Text className="text-xs text-primary-800">{tag} ×</Text>
                    </Pressable>
                  ))}
                </HStack>
              )}
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Bottom Action Buttons */}
      {!keyboardVisible && (
        <HStack className="bg-background-50 p-4" space="md">
          <Button
            variant="outline"
            action="secondary"
            onPress={() => router.back()}
            className="h-12 flex-1">
            <ButtonText>Cancel</ButtonText>
          </Button>

          <Button
            variant="solid"
            action="positive"
            onPress={saveTemplate}
            isDisabled={isSaving}
            className="h-12 flex-1">
            <ButtonIcon as={Save} className="text-white" />
            <ButtonText className="text-white">
              {isSaving ? 'Saving...' : 'Save Template'}
            </ButtonText>
          </Button>
        </HStack>
      )}
    </VStack>
  );
}
