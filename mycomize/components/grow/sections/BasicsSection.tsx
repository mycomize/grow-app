import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { Input, InputField } from '~/components/ui/input';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';

interface GrowData {
  name?: string;
  species?: string;
  variant?: string;
  tek?: string;
  notes?: string;
}

interface BasicsSectionProps {
  growData: GrowData;
  updateField: (field: keyof GrowData, value: any) => void;
}

export const BasicsSection: React.FC<BasicsSectionProps> = ({ growData, updateField }) => {
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
          <FormControlLabelText>Variant/Strain</FormControlLabelText>
        </FormControlLabel>
        <Input>
          <InputField
            placeholder="Enter variant/strain"
            value={growData.variant || ''}
            onChangeText={(value) => updateField('variant', value)}
          />
        </Input>
      </FormControl>

      <FormControl>
        <FormControlLabel>
          <FormControlLabelText>Notes</FormControlLabelText>
        </FormControlLabel>
        <Textarea>
          <TextareaInput
            placeholder="Enter any notes about this grow"
            value={growData.notes || ''}
            onChangeText={(value) => updateField('notes', value)}
            style={{ textAlignVertical: 'top' }}
          />
        </Textarea>
      </FormControl>
    </VStack>
  );
};
