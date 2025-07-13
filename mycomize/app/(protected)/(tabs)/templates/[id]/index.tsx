import React, { useState, useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { BulkGrowTekTemplateData, BulkGrowTekTemplate } from '~/lib/templateTypes';
import { useTemplateFormLogic } from '~/lib/useTemplateFormLogic';
import { TemplateForm } from '~/components/template/TemplateForm';

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadedTemplateData, setLoadedTemplateData] = useState<BulkGrowTekTemplateData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load template data
  const loadTemplate = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBackendUrl()}/bulk-grow-tek-templates/${id}`, {
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

      const template: BulkGrowTekTemplate = await response.json();

      // Convert template to editable format
      const editableTemplate: BulkGrowTekTemplateData = {
        name: template.name,
        description: template.description || '',
        species: template.species,
        variant: template.variant || '',
        type: template.type,
        is_public: template.is_public,
        tags: template.tags || [],
        stages: template.stages || {
          inoculation: { items: [], environmentalConditions: [], tasks: [], notes: '' },
          spawnColonization: { items: [], environmentalConditions: [], tasks: [], notes: '' },
          bulkColonization: { items: [], environmentalConditions: [], tasks: [], notes: '' },
          fruiting: { items: [], environmentalConditions: [], tasks: [], notes: '' },
          harvest: { items: [], environmentalConditions: [], tasks: [], notes: '' },
        },
      };

      setLoadedTemplateData(editableTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [id, token]);

  // Use the form logic with loaded data
  const formLogic = useTemplateFormLogic({
    initialData: loadedTemplateData || undefined,
    templateId: id as string,
  });

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4">Loading template...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Text className="text-error-600">Error: {error}</Text>
      </VStack>
    );
  }

  return (
    <TemplateForm
      templateData={formLogic.templateData}
      isSaving={formLogic.isSaving}
      tagInput={formLogic.tagInput}
      showTypeModal={formLogic.showTypeModal}
      tempSelectedType={formLogic.tempSelectedType}
      onUpdateField={formLogic.updateField}
      onSetTemplateData={formLogic.setTemplateData}
      onTagInputChange={formLogic.setTagInput}
      onAddTag={formLogic.addTag}
      onRemoveTag={formLogic.removeTag}
      onShowTypeModal={formLogic.setShowTypeModal}
      onTempSelectedTypeChange={formLogic.setTempSelectedType}
      onHandleTypeModalOpen={formLogic.handleTypeModalOpen}
      onHandleTypeConfirm={formLogic.handleTypeConfirm}
      onSaveTemplate={formLogic.saveTemplate}
      saveButtonText="Save"
    />
  );
}
