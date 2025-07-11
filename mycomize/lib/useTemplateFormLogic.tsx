import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';
import { useToast, Toast } from '~/components/ui/toast';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { AlertCircle, CheckCircle } from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { MonotubTekTemplateData, createEmptyTemplateData } from '~/lib/templateTypes';

interface UseTemplateFormLogicProps {
  initialData?: MonotubTekTemplateData;
  templateId?: string;
}

export function useTemplateFormLogic({ initialData, templateId }: UseTemplateFormLogicProps = {}) {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();

  const [templateData, setTemplateData] = useState<MonotubTekTemplateData>(
    initialData || createEmptyTemplateData()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [tempSelectedType, setTempSelectedType] = useState('Monotub');

  // Update template data when initialData changes
  useEffect(() => {
    if (initialData) {
      setTemplateData(initialData);
    }
  }, [initialData]);

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

  // Type modal handlers
  const handleTypeModalOpen = () => {
    setTempSelectedType(templateData.type);
    setShowTypeModal(true);
  };

  const handleTypeConfirm = () => {
    updateField('type', tempSelectedType);
    setShowTypeModal(false);
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
      const isEdit = !!templateId;
      const url = isEdit
        ? `${getBackendUrl()}/monotub-tek-templates/${templateId}`
        : `${getBackendUrl()}/monotub-tek-templates/`;
      const method = isEdit ? 'PUT' : 'POST';

      // Debug logging
      console.log('Saving template data:', templateData);
      console.log('is_public value:', templateData.is_public);
      console.log('URL:', url);
      console.log('Method:', method);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(templateData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        const errorData = await response.json();
        console.log('Error response:', errorData);
        throw new Error(errorData.detail || `Failed to ${isEdit ? 'update' : 'save'} template`);
      }

      const responseData = await response.json();
      console.log('Success response:', responseData);

      const successMessage = isEdit
        ? 'Template updated successfully!'
        : 'Template saved successfully!';
      setSuccess(successMessage);

      // Navigate after save
      setTimeout(() => {
        if (isEdit) {
          router.replace(`/templates/${templateId}`);
        } else {
          router.replace('/templates');
        }
      }, 1500);
    } catch (err) {
      console.log('Save template error:', err);
      setError(
        err instanceof Error ? err.message : `Failed to ${templateId ? 'update' : 'save'} template`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle toast display
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      setError(null);
    }
  }, [error, theme]);

  useEffect(() => {
    if (success) {
      showToast(success, 'success');
      setSuccess(null);
    }
  }, [success, theme]);

  return {
    templateData,
    setTemplateData,
    isSaving,
    tagInput,
    setTagInput,
    showTypeModal,
    setShowTypeModal,
    tempSelectedType,
    setTempSelectedType,
    updateField,
    addTag,
    removeTag,
    handleTypeModalOpen,
    handleTypeConfirm,
    saveTemplate,
  };
}
