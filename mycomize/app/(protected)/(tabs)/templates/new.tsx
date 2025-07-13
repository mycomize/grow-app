import React from 'react';
import { useTemplateFormLogic } from '~/lib/useTemplateFormLogic';
import { TemplateForm } from '~/components/template/TemplateForm';

export default function NewTemplateScreen() {
  const formLogic = useTemplateFormLogic();

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
      saveButtonText="Save Tek"
    />
  );
}
