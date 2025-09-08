import { useState } from 'react';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Input, InputField } from '~/components/ui/input';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Icon } from '~/components/ui/icon';
import { Switch } from '~/components/ui/switch';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion';
import { Save, ChevronDown, ChevronRight, FileText, Workflow } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUnifiedToast } from '~/components/ui/unified-toast';

import { StageAccordion } from '~/components/tek/StageAccordion';
import { TagManager } from '~/components/tek/TagManager';
import { ConfirmationModal } from '~/components/modals/ConfirmationModal';
import { useAuthToken } from '~/lib/stores/authEncryptionStore';
import {
  useCurrentTekFormData,
  useUpdateCurrentTekField,
  useAddTag,
  useRemoveTag,
  useCreateTek,
  useUpdateTek,
  useTekSaving,
} from '~/lib/stores';

interface TekFormProps {
  tekId?: string;
  saveButtonText?: string;
}

export function TekForm({ tekId, saveButtonText = 'Save Tek' }: TekFormProps) {
  const token = useAuthToken();
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  // Store subscriptions
  const tekData = useCurrentTekFormData();
  const isSaving = useTekSaving();

  // Store actions
  const updateField = useUpdateCurrentTekField();
  const addTag = useAddTag();
  const removeTag = useRemoveTag();
  const createTek = useCreateTek();
  const updateTek = useUpdateTek();

  // Local UI state
  const [tagInput, setTagInput] = useState('');
  const [showMakePublicModal, setShowMakePublicModal] = useState(false);

  // Check if this is an existing public tek
  const isExistingPublicTek = !!(tekId && tekId !== 'new' && tekData?.is_public);

  // Handle public switch toggle with confirmation modal
  const handlePublicToggle = (value: boolean) => {
    if (value && !tekData?.is_public) {
      // User is trying to make tek public, show confirmation modal
      setShowMakePublicModal(true);
    } else {
      // User is turning off public or tek is already public (should be disabled anyway)
      updateField('is_public', value);
    }
  };

  // Confirm making tek public
  const confirmMakePublic = () => {
    updateField('is_public', true);
    setShowMakePublicModal(false);
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim()) {
      addTag(tagInput.trim());
      setTagInput('');
    }
  };

  // Update entire tek data (for StageAccordion)
  const handleUpdateTekData = (newTekData: any) => {
    // Update individual fields through the store
    Object.keys(newTekData).forEach((key) => {
      if (key !== 'stages' && tekData && newTekData[key] !== tekData[key as keyof typeof tekData]) {
        updateField(key as keyof typeof tekData, newTekData[key]);
      }
    });
    
    // Handle stages specially
    if (newTekData.stages) {
      updateField('stages', newTekData.stages);
    }
  };

  // Save tek
  const handleSaveTek = async () => {
    if (!tekData || !token) return;

    // Basic validation
    if (!tekData.name.trim()) {
      showError('Tek name is required');
      return;
    }
    if (!tekData.species.trim()) {
      showError('Species is required');
      return;
    }

    try {
      const isEdit = tekId && tekId !== 'new';

      if (isEdit) {
        // Update existing tek
        const success = await updateTek(token, tekId, tekData);
        if (success) {
          showSuccess('Tek updated successfully!');
        } else {
          showError('Failed to update tek');
          return;
        }
      } else {
        // Create new tek
        const newTek = await createTek(token, tekData);
        if (newTek) {
          showSuccess('Tek saved successfully!');
        } else {
          showError('Failed to save tek');
          return;
        }
      }

      router.replace('/teks');
    } catch (error) {
      showError('Failed to save tek');
      console.error('Save error:', error);
    }
  };

  // Don't render if no form data
  if (!tekData) {
    return null;
  }

  return (
    <VStack className="flex-1 bg-background-50">
      <ScrollView className="flex-1">
        <VStack className="pt-4 pb-3 px-2" space="md">
          {/* Accordion for all sections */}
          <Accordion type="multiple" variant="unfilled" className="w-full gap-4 p-0">
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
                <VStack className="gap-5 px-0 pb-3" space="md">
                  {/* Tek name */}
                  <VStack space="sm">
                    <Text className="font-medium">Name</Text>
                    <Input>
                      <InputField
                        value={tekData.name}
                        onChangeText={(value) => updateField('name', value)}
                        maxLength={120}
                      />
                    </Input>
                  </VStack>

                  {/* Description */}
                  <VStack space="sm">
                    <Text className="font-medium">Description</Text>
                    <Textarea>
                      <TextareaInput
                        value={tekData.description}
                        onChangeText={(value) => updateField('description', value)}
                        style={{ textAlignVertical: 'top' }}
                        maxLength={500}
                      />
                    </Textarea>
                  </VStack>

                  {/* Species and Variant */}
                  <HStack space="md">
                    <VStack className="flex-1" space="sm">
                      <Text className="font-medium">Species</Text>
                      <Input>
                        <InputField
                          value={tekData.species}
                          onChangeText={(value) => updateField('species', value)}
                          maxLength={50}
                        />
                      </Input>
                    </VStack>
                    <VStack className="flex-1" space="sm">
                      <Text className="font-medium">Strain</Text>
                      <Input>
                        <InputField
                          value={tekData.variant}
                          onChangeText={(value) => updateField('variant', value)}
                          maxLength={50}
                        />
                      </Input>
                    </VStack>
                  </HStack>

                  {/* Public/Private */}
                  <VStack space="sm">
                    <HStack className="items-center justify-between">
                      <VStack className="flex-1" space="xs">
                        <Text className="font-medium">Make Public</Text>
                        <Text className="text-sm text-typography-500">
                          {tekData.is_public
                            ? 'This tek is public and visible to all OpenTek users'
                            : 'Allow other OpenTek users to view and use this tek'}
                        </Text>
                        {isExistingPublicTek && (
                          <Text className="text-xs text-typography-400">
                            Public teks cannot be made private again
                          </Text>
                        )}
                      </VStack>
                      <Switch
                        value={tekData.is_public}
                        onValueChange={handlePublicToggle}
                        isDisabled={isExistingPublicTek}
                      />
                    </HStack>
                  </VStack>

                  {/* Tags */}
                  <TagManager
                    tags={tekData.tags}
                    tagInput={tagInput}
                    onTagInputChange={setTagInput}
                    onAddTag={handleAddTag}
                    onRemoveTag={removeTag}
                  />
                </VStack>
              </AccordionContent>
            </AccordionItem>

            {/* Stages Section */}
            <AccordionItem value="stages" className="rounded-md bg-background-0">
              <AccordionHeader>
                <AccordionTrigger>
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <HStack className="flex-1 items-center justify-between">
                      <HStack className="items-center" space="md">
                        <Icon as={Workflow} size="xl" className="text-typography-400" />
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
                <VStack space="md">
                  <StageAccordion tekData={tekData} onUpdateTekData={handleUpdateTekData} />
                </VStack>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </VStack>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <HStack className="bg-background-50 p-4" space="md">
        <Button
          variant="outline"
          className="h-12 flex-1 border border-outline-300"
          onPress={() => router.back()}>
          <ButtonText>Cancel</ButtonText>
        </Button>

        <Button
          variant="solid"
          action="positive"
          onPress={handleSaveTek}
          isDisabled={isSaving}
          className="h-12 flex-1">
          <ButtonIcon as={Save} className="text-white" />
          <ButtonText className="text-lg text-white">{isSaving ? 'Saving...' : saveButtonText}</ButtonText>
        </Button>
      </HStack>

      {/* Make Public Confirmation Modal */}
      <ConfirmationModal
        isOpen={showMakePublicModal}
        onClose={() => setShowMakePublicModal(false)}
        onConfirm={confirmMakePublic}
        type="make-public"
        title="Make Tek Public"
        message="Are you sure you want to make this tek public? Once public, it cannot be made private again. All of the tek's data will be visible to all OpenTek users."
        itemName={tekData.name}
        confirmText="Make Public"
      />
    </VStack>
  );
}
