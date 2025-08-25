import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTekFormLogic } from '~/lib/useTekFormLogic';
import { TekForm } from '~/components/tek/TekForm';
import { BulkGrowTekData, BulkGrowTek, createEmptyTekData, generateId } from '~/lib/types/tekTypes';

export default function NewTekScreen() {
  const { tekToCopy } = useLocalSearchParams<{ tekToCopy?: string }>();

  const [initialTekData, setInitialTekData] = useState<BulkGrowTekData | null>(null);

  // Helper function to deep copy stage data with new IDs
  const deepCopyStageData = (stageData: any) => {
    if (!stageData) return createEmptyTekData().stages.inoculation;

    return {
      items: (stageData.items || []).map((item: any) => ({
        ...item,
        id: generateId(),
      })),
      environmental_conditions: (stageData.environmental_conditions || []).map(
        (condition: any) => ({
          ...condition,
          id: generateId(),
        })
      ),
      tasks: (stageData.tasks || []).map((task: any) => ({
        ...task,
        id: generateId(),
      })),
      notes: stageData.notes || '',
    };
  };

  // Process tek data to copy if tekToCopy parameter is present
  useEffect(() => {
    if (tekToCopy) {
      try {
        const parsedTek: BulkGrowTek = JSON.parse(tekToCopy);

        // Create new tek data based on the existing tek, but reset certain fields
        const copiedTekData: BulkGrowTekData = {
          name: `Copy of ${parsedTek.name}`,
          description: parsedTek.description || '',
          species: parsedTek.species,
          variant: parsedTek.variant || '',
          is_public: false, // Always start as private for copied teks
          tags: [...(parsedTek.tags || [])],
          stages: parsedTek.stages
            ? {
                inoculation: deepCopyStageData(parsedTek.stages.inoculation),
                spawn_colonization: deepCopyStageData(parsedTek.stages.spawn_colonization),
                bulk_colonization: deepCopyStageData(parsedTek.stages.bulk_colonization),
                fruiting: deepCopyStageData(parsedTek.stages.fruiting),
                harvest: deepCopyStageData(parsedTek.stages.harvest),
              }
            : createEmptyTekData().stages,
        };

        setInitialTekData(copiedTekData);
      } catch (error) {
        console.error('Error parsing tek data:', error);
        // If parsing fails, just use empty data
        setInitialTekData(createEmptyTekData());
      }
    } else {
      setInitialTekData(createEmptyTekData());
    }
  }, [tekToCopy]);

  const formLogic = useTekFormLogic({
    initialData: initialTekData || undefined,
  });

  return (
    <TekForm
      tekData={formLogic.tekData}
      isSaving={formLogic.isSaving}
      tagInput={formLogic.tagInput}
      showTypeModal={formLogic.showTypeModal}
      tempSelectedType={formLogic.tempSelectedType}
      showMakePublicModal={formLogic.showMakePublicModal}
      isExistingPublicTek={formLogic.isExistingPublicTek}
      onUpdateField={formLogic.updateField}
      onSetTekData={formLogic.setTekData}
      onTagInputChange={formLogic.setTagInput}
      onAddTag={formLogic.addTag}
      onRemoveTag={formLogic.removeTag}
      onShowTypeModal={formLogic.setShowTypeModal}
      onTempSelectedTypeChange={formLogic.setTempSelectedType}
      onHandlePublicToggle={formLogic.handlePublicToggle}
      onConfirmMakePublic={formLogic.confirmMakePublic}
      onSetShowMakePublicModal={formLogic.setShowMakePublicModal}
      onSaveTek={formLogic.saveTek}
      saveButtonText="Save Tek"
    />
  );
}
