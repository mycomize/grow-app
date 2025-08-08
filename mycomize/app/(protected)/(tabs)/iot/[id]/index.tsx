import { useLocalSearchParams } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';

import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';
import { useIoTGatewayFormLogic } from '~/lib/useIoTGatewayFormLogic';

export default function IoTIntegrationDetailScreen() {
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

    // Connection state
    connectionInfo,

    // Control state
    enabledStates,
    currentStates,
    isControlling,
    pendingValues,

    // Control selection state
    states,
    searchQuery,
    enabledEntities,
    enabledEntitiesSet,
    filterEnabled,
    filterPreferences,
    showFilters,

    // Functions
    updateFormField,
    toggleApiKeyVisibility,
    testConnection,
    toggleGatewayStatus,
    handleToggle,
    handleNumberChange,
    adjustNumberValue,
    saveNumberValue,
    handleEntityToggle,
    toggleDomainFilter,
    deleteGateway,
    saveGateway,

    // State setters
    setSearchQuery,
    setFilterEnabled,
    setShowFilters,
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
      enabledStates={enabledStates}
      currentStates={currentStates}
      states={states}
      enabledEntities={enabledEntities}
      enabledEntitiesSet={enabledEntitiesSet}
      isControlling={isControlling}
      pendingValues={pendingValues}
      searchQuery={searchQuery}
      filterEnabled={filterEnabled}
      filterPreferences={filterPreferences}
      showFilters={showFilters}
      onUpdateFormField={updateFormField}
      onToggleApiKeyVisibility={toggleApiKeyVisibility}
      onToggleGatewayStatus={toggleGatewayStatus}
      onTestConnection={testConnection}
      onSearchQueryChange={setSearchQuery}
      onFilterEnabledChange={setFilterEnabled}
      onToggleShowFilters={() => setShowFilters(!showFilters)}
      onToggleDomainFilter={toggleDomainFilter}
      onHandleToggle={handleToggle}
      onHandleNumberChange={handleNumberChange}
      onAdjustNumberValue={adjustNumberValue}
      onSaveNumberValue={saveNumberValue}
      onHandleEntityToggle={handleEntityToggle}
      onShowDeleteModal={setShowDeleteModal}
      onDeleteGateway={deleteGateway}
      onSaveGateway={saveGateway}
      saveButtonText="Save"
    />
  );
}
