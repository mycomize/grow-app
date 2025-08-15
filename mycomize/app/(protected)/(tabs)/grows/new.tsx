import { useLocalSearchParams } from 'expo-router';
import { useGrowFormLogic } from '~/lib/useGrowFormLogic';
import { GrowForm } from '~/components/grow/GrowForm';
import { BulkGrow } from '~/lib/growTypes';

export default function NewGrowScreen() {
  const { fromTek } = useLocalSearchParams();

  const formLogic = useGrowFormLogic({
    growId: 'new',
    fromTek: fromTek as string,
  });

  if (formLogic.isLoading) {
    return (
      <GrowForm
        growData={{} as BulkGrow}
        flushes={[]}
        isSaving={false}
        keyboardVisible={false}
        showDeleteModal={false}
        isDeleting={false}
        activeDatePicker={null}
        growId="new"
        onUpdateField={() => {}}
        onAddFlush={() => {}}
        onUpdateFlush={() => {}}
        onRemoveFlush={() => {}}
        onSetActiveDatePicker={() => {}}
        onHandleDateChange={() => {}}
        onParseDate={() => null}
        onShowDeleteModal={() => {}}
        onDeleteGrow={() => {}}
        onSaveGrow={() => {}}
        saveButtonText="Creating..."
      />
    );
  }

  return (
    <GrowForm
      growData={formLogic.growData}
      flushes={formLogic.flushes}
      isSaving={formLogic.isSaving}
      keyboardVisible={formLogic.keyboardVisible}
      showDeleteModal={formLogic.showDeleteModal}
      isDeleting={formLogic.isDeleting}
      activeDatePicker={formLogic.activeDatePicker}
      growId="new"
      onUpdateField={formLogic.updateField}
      onAddFlush={formLogic.addFlush}
      onUpdateFlush={formLogic.updateFlush}
      onRemoveFlush={formLogic.removeFlush}
      onSetActiveDatePicker={formLogic.setActiveDatePicker}
      onHandleDateChange={formLogic.handleDateChange}
      onParseDate={formLogic.parseDate}
      onShowDeleteModal={formLogic.setShowDeleteModal}
      onDeleteGrow={formLogic.deleteGrow}
      onSaveGrow={formLogic.saveGrow}
      saveButtonText="Save Grow"
    />
  );
}
