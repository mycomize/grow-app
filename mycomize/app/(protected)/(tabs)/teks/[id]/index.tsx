import React, { useState, useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { BulkGrowTekData, BulkGrowTek } from '~/lib/tekTypes';
import { useTekFormLogic } from '~/lib/useTekFormLogic';
import { TekForm } from '~/components/tek/TekForm';

export default function TekEditScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadedTekData, setLoadedTekData] = useState<BulkGrowTekData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load tek data
  const loadTek = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBackendUrl()}/bulk-grow-tek/${id}`, {
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
          throw new Error('Tek not found');
        }
        throw new Error('Failed to load tek');
      }

      const tek: BulkGrowTek = await response.json();

      // Convert tek to editable format
      const editableTek: BulkGrowTekData = {
        name: tek.name,
        description: tek.description || '',
        species: tek.species,
        variant: tek.variant || '',
        is_public: tek.is_public,
        tags: tek.tags || [],
        stages: tek.stages || {
          inoculation: { items: [], environmental_conditions: [], tasks: [], notes: '' },
          spawn_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
          bulk_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
          fruiting: { items: [], environmental_conditions: [], tasks: [], notes: '' },
          harvest: { items: [], environmental_conditions: [], tasks: [], notes: '' },
        },
      };

      setLoadedTekData(editableTek);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tek');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTek();
  }, [id, token]);

  // Use the form logic with loaded data
  const formLogic = useTekFormLogic({
    initialData: loadedTekData || undefined,
    tekId: id as string,
  });

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4">Loading tek...</Text>
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
    <TekForm
      tekData={formLogic.tekData}
      isSaving={formLogic.isSaving}
      tagInput={formLogic.tagInput}
      showTypeModal={formLogic.showTypeModal}
      tempSelectedType={formLogic.tempSelectedType}
      onUpdateField={formLogic.updateField}
      onSetTekData={formLogic.setTekData}
      onTagInputChange={formLogic.setTagInput}
      onAddTag={formLogic.addTag}
      onRemoveTag={formLogic.removeTag}
      onShowTypeModal={formLogic.setShowTypeModal}
      onTempSelectedTypeChange={formLogic.setTempSelectedType}
      onSaveTek={formLogic.saveTek}
      saveButtonText="Save"
    />
  );
}
