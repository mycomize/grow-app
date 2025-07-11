import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { Input, InputField } from '~/components/ui/input';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { TagManager } from '~/components/template/TagManager';

interface GrowData {
  name?: string;
  description?: string;
  species?: string;
  variant?: string;
  tags?: string[];
  space?: string;
  tek?: string;
}

interface BasicsSectionProps {
  growData: GrowData;
  updateField: (field: keyof GrowData, value: any) => void;
}

export const BasicsSection: React.FC<BasicsSectionProps> = ({ growData, updateField }) => {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !growData.tags?.includes(tagInput.trim())) {
      const newTags = [...(growData.tags || []), tagInput.trim()];
      updateField('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = (growData.tags || []).filter((t) => t !== tag);
    updateField('tags', newTags);
  };

  return (
    <VStack space="md" className="bg-background-0 p-2">
      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Name</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter grow name"
            value={growData.name || ''}
            onChangeText={(value) => updateField('name', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Description</FormControlLabelText>
        </FormControlLabel>
        <Textarea>
          <TextareaInput
            placeholder="Enter description for this grow"
            value={growData.description || ''}
            onChangeText={(value) => updateField('description', value)}
            style={{ textAlignVertical: 'top' }}
            autoCapitalize={'none'}
          />
        </Textarea>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Species</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter species"
            value={growData.species || ''}
            onChangeText={(value) => updateField('species', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Strain</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter strain"
            value={growData.variant || ''}
            onChangeText={(value) => updateField('variant', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Location</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter location of the grow"
            value={growData.space || ''}
            onChangeText={(value) => updateField('space', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <TagManager
          tags={growData.tags || []}
          tagInput={tagInput}
          onTagInputChange={setTagInput}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      </FormControl>
    </VStack>
  );
};
