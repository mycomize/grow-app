import { useTekFormLogic } from '~/lib/useTekFormLogic';
import { TekForm } from '~/components/tek/TekForm';

export default function NewTekScreen() {
  const formLogic = useTekFormLogic();

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
