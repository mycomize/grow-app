import { VStack } from '~/components/ui/vstack';
import { Spinner } from '~/components/ui/spinner';

import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';
import { useIoTGatewayFormLogic } from '~/lib/useIoTGatewayFormLogic';

export default function NewIoTIntegrationScreen() {
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
    showDeviceClassFilters,
    pendingEntitySelections,

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
    toggleDeviceClassFilter,
    toggleShowAllDeviceClasses,
    deleteGateway,
    saveGateway,

    // State setters
    setSearchQuery,
    setFilterEnabled,
    setShowFilters,
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
      isSaving={isSaving}
      isDeleting={isDeleting}
      showDeleteModal={showDeleteModal}
      showApiKey={showApiKey}
      keyboardVisible={keyboardVisible}
      gatewayId="new"
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
      showDeviceClassFilters={showDeviceClassFilters}
      pendingEntitySelections={pendingEntitySelections}
      onUpdateFormField={updateFormField}
      onToggleApiKeyVisibility={toggleApiKeyVisibility}
      onToggleGatewayStatus={toggleGatewayStatus}
      onTestConnection={testConnection}
      onSearchQueryChange={setSearchQuery}
      onFilterEnabledChange={setFilterEnabled}
      onToggleShowFilters={() => setShowFilters(!showFilters)}
      onToggleShowDeviceClassFilters={() => setShowDeviceClassFilters(!showDeviceClassFilters)}
      onToggleDomainFilter={toggleDomainFilter}
      onToggleDeviceClassFilter={toggleDeviceClassFilter}
      onToggleShowAllDeviceClasses={toggleShowAllDeviceClasses}
      onHandleToggle={handleToggle}
      onHandleNumberChange={handleNumberChange}
      onAdjustNumberValue={adjustNumberValue}
      onSaveNumberValue={saveNumberValue}
      onHandleEntityToggle={handleEntityToggle}
      onShowDeleteModal={setShowDeleteModal}
      onDeleteGateway={deleteGateway}
      onSaveGateway={saveGateway}
      saveButtonText="Add IoT Gateway"
    />
  );
}
