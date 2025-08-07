import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';
import { useUnifiedToast } from '~/components/ui/unified-toast';

import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { BulkGrowTekData, createEmptyTekData } from '~/lib/tekTypes';

interface UseTekFormLogicProps {
  initialData?: BulkGrowTekData;
  tekId?: string;
}

export function useTekFormLogic({ initialData, tekId }: UseTekFormLogicProps = {}) {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  const [tekData, setTekData] = useState<BulkGrowTekData>(initialData || createEmptyTekData());
  const [isInitialized, setIsInitialized] = useState(!!initialData);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [tempSelectedType, setTempSelectedType] = useState('Bulk Grow');
  const [showMakePublicModal, setShowMakePublicModal] = useState(false);

  // Update tek data when initialData changes, but only if not yet initialized
  // This prevents overwriting user changes when editing
  useEffect(() => {
    if (initialData && !isInitialized) {
      console.log('Initializing tek data with:', initialData);
      setTekData(initialData);
      setIsInitialized(true);
    }
  }, [initialData, isInitialized]);

  // Update tek data field
  const updateField = (field: keyof BulkGrowTekData, value: any) => {
    setTekData((prev: BulkGrowTekData) => ({ ...prev, [field]: value }));
  };

  // Handle public switch toggle with confirmation modal
  const handlePublicToggle = (value: boolean) => {
    if (value && !tekData.is_public) {
      // User is trying to make tek public, show confirmation modal
      setShowMakePublicModal(true);
    } else {
      // User is turning off public or tek is already public (should be disabled anyway)
      updateField('is_public', value);
    }
  };

  // Confirm making tek public
  const confirmMakePublic = () => {
    updateField('is_public', true);
  };

  // Check if this is an existing public tek
  const isExistingPublicTek = !!(tekId && initialData?.is_public);

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

      // Debug logging
      console.log('Saving tek data:', tekData);
      console.log('is_public value:', tekData.is_public);
      console.log('Method:', isEdit ? 'PUT' : 'POST');

      if (isEdit) {
        // Update existing tek
        await apiClient.updateBulkGrowTek(tekId!, tekData, token!);
      } else {
        // Create new tek
        await apiClient.createBulkGrowTek(tekData, token!);
      }

      const successMessage = isEdit ? 'Tek updated successfully!' : 'Tek saved successfully!';
      setSuccess(successMessage);

      // Navigate after save - always go to tek library
      setTimeout(() => {
        router.replace('/teks');
      }, 1500);
    } catch (err) {
      console.log('Save tek error:', err);
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : `Failed to ${tekId ? 'update' : 'save'} tek`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle toast display
  useEffect(() => {
    if (error) {
      showError(error);
      setError(null);
    }
  }, [error, showError]);

  useEffect(() => {
    if (success) {
      showSuccess(success);
      setSuccess(null);
    }
  }, [success, showSuccess]);

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
    showMakePublicModal,
    setShowMakePublicModal,
    updateField,
    handlePublicToggle,
    confirmMakePublic,
    isExistingPublicTek,
    addTag,
    removeTag,
    saveTek,
  };
}
