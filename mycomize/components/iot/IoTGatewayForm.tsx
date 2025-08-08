import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion';
import { Save, ChevronDown, ChevronRight, FileText, Activity, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';

import { IoTGateway, IoTGatewayUpdate, IoTEntity, HAState } from '~/lib/iot';
import { IoTFilterPreferences } from '~/lib/userPreferences';

// Import modular sections
import { DetailsSection } from '~/components/iot/sections/BasicsSection';
import { ControlPanelSection } from '~/components/iot/sections/ControlPanelSection';

interface ConnectionInfo {
  status: 'connected' | 'connecting' | 'disconnected';
  version?: string;
  config?: any;
}

interface IoTGatewayFormProps {
  gateway: IoTGateway | null;
  formData: IoTGatewayUpdate;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  showDeleteModal: boolean;
  showApiKey: boolean;
  keyboardVisible: boolean;
  gatewayId?: string;

  // Connection state
  connectionInfo: ConnectionInfo;
  isTestingConnection: boolean;

  // Control panel state
  enabledStates: string[];
  currentStates: HAState[];
  states: HAState[];
  enabledEntities: IoTEntity[];
  enabledEntitiesSet: Set<string>;
  isControlling: Set<string>;
  pendingValues: Record<string, string>;
  searchQuery: string;
  filterEnabled: boolean;
  filterPreferences: IoTFilterPreferences;
  showFilters: boolean;

  // Event handlers
  onUpdateFormField: (field: keyof IoTGatewayUpdate, value: any) => void;
  onToggleApiKeyVisibility: () => void;
  onToggleGatewayStatus: () => void;
  onTestConnection: () => void;
  onSearchQueryChange: (query: string) => void;
  onFilterEnabledChange: (enabled: boolean) => void;
  onToggleShowFilters: () => void;
  onToggleDomainFilter: (domain: string) => void;
  onHandleToggle: (entityId: string, domain: string, currentState: string) => void;
  onHandleNumberChange: (entityId: string, value: string) => void;
  onAdjustNumberValue: (entityId: string, increment: boolean, currentValue: string) => void;
  onSaveNumberValue: (entityId: string, pendingValue: string) => void;
  onHandleEntityToggle: (
    entityId: string,
    entityType: string,
    friendlyName: string,
    enabled: boolean
  ) => void;
  onShowDeleteModal: (show: boolean) => void;
  onDeleteGateway: () => void;
  onSaveGateway: () => void;
  saveButtonText?: string;
}

export function IoTGatewayForm({
  gateway,
  formData,
  isEditing,
  isSaving,
  isDeleting,
  showDeleteModal,
  showApiKey,
  keyboardVisible,
  gatewayId,
  connectionInfo,
  isTestingConnection,
  enabledStates,
  currentStates,
  states,
  enabledEntities,
  enabledEntitiesSet,
  isControlling,
  pendingValues,
  searchQuery,
  filterEnabled,
  filterPreferences,
  showFilters,
  onUpdateFormField,
  onToggleApiKeyVisibility,
  onToggleGatewayStatus,
  onTestConnection,
  onSearchQueryChange,
  onFilterEnabledChange,
  onToggleShowFilters,
  onToggleDomainFilter,
  onHandleToggle,
  onHandleNumberChange,
  onAdjustNumberValue,
  onSaveNumberValue,
  onHandleEntityToggle,
  onShowDeleteModal,
  onDeleteGateway,
  onSaveGateway,
  saveButtonText = 'Save',
}: IoTGatewayFormProps) {
  const router = useRouter();

  return (
    <VStack className="flex-1 bg-background-50">
      <ScrollView className="flex-1">
        <VStack className="p-4" space="md">
          {/* Accordion for all sections */}
          <Accordion type="multiple" variant="unfilled" className="w-full gap-4">
            {/* Basics Section */}
            <AccordionItem value="basics" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={FileText} size="xl" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Basics</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-900"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <DetailsSection
                  gateway={gateway}
                  formData={formData}
                  isEditing={isEditing}
                  showApiKey={showApiKey}
                  connectionInfo={connectionInfo}
                  isTestingConnection={isTestingConnection}
                  onUpdateField={onUpdateFormField}
                  onToggleApiKeyVisibility={onToggleApiKeyVisibility}
                  onToggleGatewayStatus={onToggleGatewayStatus}
                  onTestConnection={onTestConnection}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Control Panel Section */}
            <AccordionItem value="control-panel" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={Activity} size="xl" className="text-typography-400" />
                        <Text className="text-lg font-semibold">Control Panel</Text>
                      </HStack>
                      <Icon
                        as={isExpanded ? ChevronDown : ChevronRight}
                        size="lg"
                        className="text-typography-900"
                      />
                    </HStack>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <ControlPanelSection
                  gateway={gateway}
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
                  onSearchQueryChange={onSearchQueryChange}
                  onFilterEnabledChange={onFilterEnabledChange}
                  onToggleShowFilters={onToggleShowFilters}
                  onToggleDomainFilter={onToggleDomainFilter}
                  onHandleToggle={onHandleToggle}
                  onHandleNumberChange={onHandleNumberChange}
                  onAdjustNumberValue={onAdjustNumberValue}
                  onSaveNumberValue={onSaveNumberValue}
                  onHandleEntityToggle={onHandleEntityToggle}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </VStack>
      </ScrollView>

      {/* Bottom Action Buttons - Hidden when keyboard is visible */}
      {!keyboardVisible && (
        <HStack className="bg-background-50 p-4" space="md">
          <Button
            variant="outline"
            className="h-12 flex-1 border border-outline-300"
            onPress={() => router.back()}>
            <ButtonText>Cancel</ButtonText>
          </Button>

          {/* Delete Button - Only show for existing gateways */}
          {gatewayId && gatewayId !== 'new' && (
            <Button
              variant="solid"
              action="negative"
              onPress={() => onShowDeleteModal(true)}
              isDisabled={isDeleting}
              className="h-12 flex-1">
              <ButtonIcon as={Trash2} className="text-white" />
              <ButtonText className="text-lg text-white">Delete</ButtonText>
            </Button>
          )}

          {/* Save Button */}
          <Button
            variant="solid"
            action="positive"
            onPress={onSaveGateway}
            isDisabled={isSaving}
            className="h-12 flex-1">
            <ButtonIcon as={Save} className="text-white" />
            <ButtonText className="text-lg text-white">
              {isSaving ? 'Saving...' : saveButtonText}
            </ButtonText>
          </Button>
        </HStack>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => onShowDeleteModal(false)}
        onConfirm={onDeleteGateway}
        title="Delete IoT Gateway"
        message="Are you sure you want to delete this IoT Gateway? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </VStack>
  );
}
