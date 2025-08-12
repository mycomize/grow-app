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
import { Save, ChevronDown, ChevronRight, FileText, ServerCog, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';

import { IoTGateway, IoTGatewayUpdate, IoTEntity, HAEntity } from '~/lib/iot';
import { IoTFilterPreferences, ConnectionInfo } from '~/lib/iotTypes';
import { BulkGrow } from '~/lib/growTypes';

// Import modular sections
import { BasicsSection } from '~/components/iot/sections/BasicsSection';
import { ControlPanelSection } from '~/components/iot/sections/ControlPanelSection';

interface IoTGatewayFormProps {
  gateway: IoTGateway | null;
  formData: IoTGatewayUpdate;
  isEditing: boolean;
  isDeleting: boolean;
  isSaving: boolean;
  showDeleteModal: boolean;
  showApiKey: boolean;
  keyboardVisible: boolean;
  gatewayId?: string;

  // Connection state
  connectionInfo: ConnectionInfo;
  isTestingConnection: boolean;

  // Control panel state
  linkedEntities: IoTEntity[];
  linkableEntities: IoTEntity[];
  filterPreferences: IoTFilterPreferences;
  showDomainFilters: boolean;
  showDeviceClassFilters: boolean;
  grows: BulkGrow[];

  saveButtonText?: string;

  // Event handlers
  onUpdateFormField: (field: keyof IoTGatewayUpdate, value: any) => void;
  onToggleApiKeyVisibility: () => void;
  onTestConnection: () => void;
  onFilterEnabledChange: (enabled: boolean) => void;
  onToggleShowDomainFilters: () => void;
  onToggleShowDeviceClassFilters: () => void;
  onToggleDomainFilter: (domain: string) => void;
  onToggleDeviceClassFilter: (deviceClass: string) => void;
  onToggleShowAllDeviceClasses: () => void;
  onBulkLink: (entityIds: string[], growId: number, stage: string) => void;
  onIndividualLink: (entityId: string, growId: number, stage: string) => void;
  onBulkUnlink: (entityIds: string[]) => void;
  onIndividualUnlink: (entityId: string) => void;
  onShowDeleteModal: (show: boolean) => void;
  onDeleteGateway: () => void;
  onSaveGateway: () => void;
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
  linkedEntities,
  linkableEntities,
  filterPreferences,
  showDomainFilters,
  showDeviceClassFilters,
  grows,
  onUpdateFormField,
  onToggleApiKeyVisibility,
  onTestConnection,
  onToggleShowDomainFilters,
  onToggleShowDeviceClassFilters,
  onToggleDomainFilter,
  onToggleDeviceClassFilter,
  onBulkLink,
  onIndividualLink,
  onBulkUnlink,
  onIndividualUnlink,
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
                <BasicsSection
                  gateway={gateway}
                  formData={formData}
                  isEditing={isEditing}
                  showApiKey={showApiKey}
                  connectionInfo={connectionInfo}
                  isTestingConnection={isTestingConnection}
                  onUpdateField={onUpdateFormField}
                  onToggleApiKeyVisibility={onToggleApiKeyVisibility}
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
                        <Icon as={ServerCog} size="xl" className="text-typography-400" />
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
                  connectionStatus={connectionInfo.status}
                  linkedEntities={linkedEntities}
                  linkableEntities={linkableEntities}
                  filterPreferences={filterPreferences}
                  showDomainFilters={showDomainFilters}
                  showDeviceClassFilters={showDeviceClassFilters}
                  grows={grows}
                  onToggleShowDomainFilters={onToggleShowDomainFilters}
                  onToggleShowDeviceClassFilters={onToggleShowDeviceClassFilters}
                  onToggleDomainFilter={onToggleDomainFilter}
                  onToggleDeviceClassFilter={onToggleDeviceClassFilter}
                  onBulkLink={onBulkLink}
                  onIndividualLink={onIndividualLink}
                  onBulkUnlink={onBulkUnlink}
                  onIndividualUnlink={onIndividualUnlink}
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
            onPress={() => router.replace('/iot')}>
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
