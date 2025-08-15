import { VStack } from '~/components/ui/vstack';
import { Spinner } from '~/components/ui/spinner';

import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';
import { useIoTGatewayFormLogic } from '~/lib/iot-gateway';

export default function NewIoTGatewayScreen() {
  const {
    // Basic gateway state
    gateway,
    formData,
    isLoading,
    isSaving,
    isDeleting,
    showDeleteModal,
    showApiKey,
    keyboardVisible,

    // Edit mode state
    isTestingConnection,

    // Connection state
    connectionInfo,

    // Linked/linkable entity sets
    linkableEntities,
    linkedEntities,

    // Control selection state
    filterPreferences,
    showDomainFilters,
    showDeviceClassFilters,

    // Assignment fields for grow/stage association
    grows,

    // Functions
    updateFormField,
    toggleApiKeyVisibility,
    testConnection,
    toggleDomainFilter,
    toggleDeviceClassFilter,
    toggleShowAllDeviceClasses,
    handleBulkLink,
    handleIndividualLink,
    handleBulkUnlink,
    handleIndividualUnlink,
    deleteGateway,
    saveGateway,

    // State setters
    setFilterEnabled,
    setShowDomainFilters,
    setShowDeviceClassFilters,
    setShowDeleteModal,
  } = useIoTGatewayFormLogic({ gatewayId: 'new' });

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
      </VStack>
    );
  }

  return (
    <IoTGatewayForm
      gateway={gateway}
      formData={formData}
      isEditing={true} // Always in editing mode in this form pattern
      isDeleting={isDeleting}
      isSaving={isSaving}
      showDeleteModal={showDeleteModal}
      showApiKey={showApiKey}
      keyboardVisible={keyboardVisible}
      gatewayId="new"
      connectionInfo={connectionInfo}
      isTestingConnection={isTestingConnection}
      linkableEntities={linkableEntities}
      linkedEntities={linkedEntities}
      filterPreferences={filterPreferences}
      showDomainFilters={showDomainFilters}
      showDeviceClassFilters={showDeviceClassFilters}
      grows={grows}
      saveButtonText="Save"
      onUpdateFormField={updateFormField}
      onToggleApiKeyVisibility={toggleApiKeyVisibility}
      onTestConnection={testConnection}
      onFilterEnabledChange={setFilterEnabled}
      onToggleShowDomainFilters={() => setShowDomainFilters(!showDomainFilters)}
      onToggleShowDeviceClassFilters={() => setShowDeviceClassFilters(!showDeviceClassFilters)}
      onToggleDomainFilter={toggleDomainFilter}
      onToggleDeviceClassFilter={toggleDeviceClassFilter}
      onToggleShowAllDeviceClasses={toggleShowAllDeviceClasses}
      onBulkLink={handleBulkLink}
      onIndividualLink={handleIndividualLink}
      onBulkUnlink={handleBulkUnlink}
      onIndividualUnlink={handleIndividualUnlink}
      onShowDeleteModal={setShowDeleteModal}
      onDeleteGateway={deleteGateway}
      onSaveGateway={saveGateway}
    />
  );
}
