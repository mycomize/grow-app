import { useLocalSearchParams } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';

import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';
import { useIoTGatewayFormLogic } from '~/lib/iot-gateway';

export default function EditIoTGatewayScreen() {
  const { id } = useLocalSearchParams();
  const gatewayId = id as string;

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

    linkableEntities,
    linkedEntities,

    // Connection state
    connectionInfo,

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
  } = useIoTGatewayFormLogic({ gatewayId });

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
      </VStack>
    );
  }

  if (!gateway && gatewayId !== 'new') {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Text>Integration not found</Text>
      </VStack>
    );
  }

  return (
    <IoTGatewayForm
      gateway={gateway}
      formData={formData}
      isEditing={true} // Always in editing mode in this form pattern
      isSaving={isSaving}
      isDeleting={isDeleting}
      showDeleteModal={showDeleteModal}
      showApiKey={showApiKey}
      keyboardVisible={keyboardVisible}
      gatewayId={gatewayId}
      connectionInfo={connectionInfo}
      isTestingConnection={isTestingConnection}
      linkableEntities={linkableEntities}
      linkedEntities={linkedEntities}
      filterPreferences={filterPreferences}
      showDomainFilters={showDomainFilters}
      showDeviceClassFilters={showDeviceClassFilters}
      grows={grows}
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
      saveButtonText="Save"
    />
  );
}
