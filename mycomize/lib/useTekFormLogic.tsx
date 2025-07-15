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
import { BulkGrowTekData, createEmptyTekData } from '~/lib/tekTypes';

interface UseTekFormLogicProps {
  initialData?: BulkGrowTekData;
  tekId?: string;
}

export function useTekFormLogic({ initialData, tekId }: UseTekFormLogicProps = {}) {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();

  const [tekData, setTekData] = useState<BulkGrowTekData>(initialData || createEmptyTekData());

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [tempSelectedType, setTempSelectedType] = useState('Bulk Grow');

  // Update tek data when initialData changes
  useEffect(() => {
    if (initialData) {
      setTekData(initialData);
    }
  }, [initialData]);

  // Update tek data field
  const updateField = (field: keyof BulkGrowTekData, value: any) => {
    setTekData((prev: BulkGrowTekData) => ({ ...prev, [field]: value }));
  };

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !tekData.tags.includes(tagInput.trim())) {
      updateField('tags', [...tekData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    updateField(
      'tags',
      tekData.tags.filter((tag: string) => tag !== tagToRemove)
    );
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
        <Toast variant="outline" className={`mx-auto mt-36 w-full p-4 ${bgColor}`}>
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

  // Save tek
  const saveTek = async () => {
    // Basic validation
    if (!tekData.name.trim()) {
      setError('Tek name is required');
      return;
    }
    if (!tekData.species.trim()) {
      setError('Species is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const isEdit = !!tekId;
      const url = isEdit
        ? `${getBackendUrl()}/bulk-grow-tek/${tekId}`
        : `${getBackendUrl()}/bulk-grow-tek/`;
      const method = isEdit ? 'PUT' : 'POST';

      // Debug logging
      console.log('Saving tek data:', tekData);
      console.log('is_public value:', tekData.is_public);
      console.log('URL:', url);
      console.log('Method:', method);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tekData),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${isEdit ? 'update' : 'save'} tek`);
      }

      const responseData = await response.json();

      const successMessage = isEdit ? 'Tek updated successfully!' : 'Tek saved successfully!';
      setSuccess(successMessage);

      // Navigate after save
      setTimeout(() => {
        if (isEdit) {
          router.replace(`/teks/${tekId}`);
        } else {
          router.replace('/teks');
        }
      }, 1500);
    } catch (err) {
      console.log('Save tek error:', err);
      setError(err instanceof Error ? err.message : `Failed to ${tekId ? 'update' : 'save'} tek`);
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
    tekData,
    setTekData,
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
    saveTek,
  };
}
