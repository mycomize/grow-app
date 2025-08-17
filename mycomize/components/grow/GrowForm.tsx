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
import {
  Save,
  ChevronDown,
  ChevronRight,
  FileText,
  CircuitBoard,
  Trash2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import MushroomIcon from '~/components/icons/MushroomIcon';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';

import { BulkGrow, BulkGrowFlush } from '~/lib/growTypes';
import { IoTEntity, IoTGateway, HAEntity } from '~/lib/iot';

// Import modular sections
import { BasicsSection } from '~/components/grow/sections/BasicsSection';
import { IoTGatewaySection } from '~/components/grow/sections/IoTGatewaySection';
import { StagesSection } from '~/components/grow/sections/StagesSection';

interface GrowFormProps {
  growData: BulkGrow;
  flushes: BulkGrowFlush[];
  isSaving: boolean;
  keyboardVisible: boolean;
  showDeleteModal: boolean;
  isDeleting: boolean;
  activeDatePicker: string | null;
  growId?: string;

  // IoT props
  linkedEntities: IoTEntity[];
  gateways: IoTGateway[];
  entityStates: Record<string, HAEntity>;
  iotLoading: boolean;

  onUpdateField: (field: keyof BulkGrow, value: any) => void;
  onAddFlush: () => void;
  onUpdateFlush: (id: string, data: any) => void;
  onRemoveFlush: (id: string) => void;
  onSetActiveDatePicker: (picker: string | null) => void;
  onHandleDateChange: (field: string, date?: Date, event?: any) => void;
  onParseDate: (dateString?: string) => Date | null;
  onShowDeleteModal: (show: boolean) => void;
  onDeleteGrow: () => void;
  onSaveGrow: () => void;
  onUpdateEntityState: (entityId: string, newState: string) => void;
  saveButtonText?: string;
}

export function GrowForm({
  growData,
  flushes,
  isSaving,
  keyboardVisible,
  showDeleteModal,
  isDeleting,
  activeDatePicker,
  growId,

  // IoT props
  linkedEntities,
  gateways,
  entityStates,
  iotLoading,

  onUpdateField,
  onAddFlush,
  onUpdateFlush,
  onRemoveFlush,
  onSetActiveDatePicker,
  onHandleDateChange,
  onParseDate,
  onShowDeleteModal,
  onDeleteGrow,
  onSaveGrow,
  onUpdateEntityState,
  saveButtonText = 'Save',
}: GrowFormProps) {
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
                <BasicsSection growData={growData} updateField={onUpdateField} />
              </AccordionContent>
            </AccordionItem>

            {/* Stages Section */}
            <AccordionItem value="stages" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <MushroomIcon height={20} width={20} color="#828282" strokeWidth={2} />
                        <Text className="text-lg font-semibold">Stages</Text>
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
                <StagesSection
                  growData={growData}
                  updateField={onUpdateField}
                  flushCount={flushes.length}
                  flushes={flushes}
                  addFlush={onAddFlush}
                  updateFlush={onUpdateFlush}
                  removeFlush={onRemoveFlush}
                  activeDatePicker={activeDatePicker}
                  setActiveDatePicker={onSetActiveDatePicker}
                  handleDateChange={onHandleDateChange}
                  parseDate={onParseDate}
                  grow={growData}
                />
              </AccordionContent>
            </AccordionItem>

            {/* IoT Gateway Section */}
            <AccordionItem value="iot-gateway" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={CircuitBoard} size="xl" className="text-typography-400" />
                        <Text className="text-lg font-semibold">IoT Gateway</Text>
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
                <IoTGatewaySection
                  growId={growId ? parseInt(growId) : undefined}
                  linkedEntities={linkedEntities}
                  gateways={gateways}
                  entityStates={entityStates}
                  iotLoading={iotLoading}
                  onEntityStateUpdate={onUpdateEntityState}
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

          {/* Delete Button - Only show for existing grows */}
          {growId && growId !== 'new' && (
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
            onPress={onSaveGrow}
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
        onConfirm={onDeleteGrow}
        title="Delete Grow"
        message="Are you sure you want to delete this grow? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </VStack>
  );
}
