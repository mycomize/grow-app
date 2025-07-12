import React from 'react';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Input, InputField } from '~/components/ui/input';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Switch } from '~/components/ui/switch';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion';
import { Save, ChevronDown, ChevronRight, FileText, Layers } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { MonotubTekTemplateData } from '~/lib/templateTypes';
import { StageAccordion } from '~/components/template/StageAccordion';
import { TypeSelectionModal } from '~/components/template/TypeSelectionModal';
import { TagManager } from '~/components/template/TagManager';

interface TemplateFormProps {
  templateData: MonotubTekTemplateData;
  isSaving: boolean;
  tagInput: string;
  showTypeModal: boolean;
  tempSelectedType: string;
  onUpdateField: (field: keyof MonotubTekTemplateData, value: any) => void;
  onSetTemplateData: (data: MonotubTekTemplateData) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onShowTypeModal: (show: boolean) => void;
  onTempSelectedTypeChange: (type: string) => void;
  onHandleTypeModalOpen: () => void;
  onHandleTypeConfirm: () => void;
  onSaveTemplate: () => void;
  saveButtonText?: string;
}

export function TemplateForm({
  templateData,
  isSaving,
  tagInput,
  showTypeModal,
  tempSelectedType,
  onUpdateField,
  onSetTemplateData,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onShowTypeModal,
  onTempSelectedTypeChange,
  onHandleTypeModalOpen,
  onHandleTypeConfirm,
  onSaveTemplate,
  saveButtonText = 'Save Template',
}: TemplateFormProps) {
  const router = useRouter();

  return (
    <VStack className="flex-1 bg-background-50">
      <ScrollView className="flex-1">
        <VStack className="p-2" space="md">
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
                <VStack className="gap-5 p-2" space="md">
                  {/* Template Name */}
                  <VStack space="sm">
                    <Text className="font-medium">Name</Text>
                    <Input>
                      <InputField
                        placeholder="e.g., Super Awesome High Yield Monotub 3000"
                        value={templateData.name}
                        onChangeText={(value) => onUpdateField('name', value)}
                        maxLength={120}
                      />
                    </Input>
                  </VStack>

                  {/* Type Selection */}
                  <VStack space="sm">
                    <Text className="font-medium">Type</Text>
                    <Pressable
                      onPress={onHandleTypeModalOpen}
                      className="flex-row items-center justify-between rounded-md border border-outline-300 px-3 py-2">
                      <Text className="text-typography-900">{templateData.type}</Text>
                      <Icon as={ChevronDown} size="sm" className="text-typography-500" />
                    </Pressable>
                  </VStack>

                  {/* Description */}
                  <VStack space="sm">
                    <Text className="font-medium">Description</Text>
                    <Textarea>
                      <TextareaInput
                        placeholder="Describe your tek..."
                        value={templateData.description}
                        onChangeText={(value) => onUpdateField('description', value)}
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
                          placeholder="e.g., Psilocybe cubensis"
                          value={templateData.species}
                          onChangeText={(value) => onUpdateField('species', value)}
                          maxLength={50}
                        />
                      </Input>
                    </VStack>
                    <VStack className="flex-1" space="sm">
                      <Text className="font-medium">Strain</Text>
                      <Input>
                        <InputField
                          placeholder="e.g., Golden Teacher"
                          value={templateData.variant}
                          onChangeText={(value) => onUpdateField('variant', value)}
                          maxLength={50}
                        />
                      </Input>
                    </VStack>
                  </HStack>

                  {/* Public/Private */}
                  <HStack className="items-center justify-between">
                    <VStack className="flex-1" space="xs">
                      <Text className="font-medium">Make Public</Text>
                      <Text className="text-sm text-typography-500">
                        Allow other mycomize users to view and use this template
                      </Text>
                    </VStack>
                    <Switch
                      value={templateData.is_public}
                      onValueChange={(value) => onUpdateField('is_public', value)}
                    />
                  </HStack>

                  {/* Tags */}
                  <TagManager
                    tags={templateData.tags}
                    tagInput={tagInput}
                    onTagInputChange={onTagInputChange}
                    onAddTag={onAddTag}
                    onRemoveTag={onRemoveTag}
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
                        <Icon as={Layers} size="xl" className="text-typography-400" />
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
                  <StageAccordion
                    templateData={templateData}
                    onUpdateTemplateData={onSetTemplateData}
                  />
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
          onPress={onSaveTemplate}
          isDisabled={isSaving}
          className="h-12 flex-1">
          <ButtonIcon as={Save} className="text-white" />
          <ButtonText className="text-white">{isSaving ? 'Saving...' : saveButtonText}</ButtonText>
        </Button>
      </HStack>

      {/* Type Selection Modal */}
      <TypeSelectionModal
        isOpen={showTypeModal}
        onClose={() => onShowTypeModal(false)}
        selectedType={tempSelectedType}
        onTypeChange={onTempSelectedTypeChange}
        onConfirm={onHandleTypeConfirm}
      />
    </VStack>
  );
}
