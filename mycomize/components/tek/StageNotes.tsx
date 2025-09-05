import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Textarea, TextareaInput } from '~/components/ui/textarea';

interface StageNotesProps {
  notes: string;
  onUpdateNotes?: (notes: string) => void;
  readOnly?: boolean;
}

export const StageNotes: React.FC<StageNotesProps> = ({ notes, onUpdateNotes, readOnly = false }) => {
  return (
    <VStack space="sm">
      <Text className="font-medium text-typography-700">Notes</Text>
      <Textarea>
        <TextareaInput
          placeholder={readOnly ? "" : "Add any additional notes, tips, or reminders for this stage..."}
          value={notes}
          onChangeText={readOnly ? undefined : onUpdateNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!readOnly}
        />
      </Textarea>
    </VStack>
  );
};
