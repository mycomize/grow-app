import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText } from '~/components/ui/button';
import { Input, InputField } from '~/components/ui/input';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { X } from 'lucide-react-native';

interface TagManagerProps {
  tags: string[];
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}

export function TagManager({
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
}: TagManagerProps) {
  return (
    <VStack space="sm">
      <Text className="font-medium">Tags</Text>
      <HStack space="sm" className="items-center">
        <Input className="flex-1">
          <InputField
            placeholder="Add tags..."
            value={tagInput}
            onChangeText={onTagInputChange}
            onSubmitEditing={onAddTag}
            autoCapitalize={'none'}
          />
        </Input>
        <Button size="sm" variant="outline" onPress={onAddTag}>
          <ButtonText>Add</ButtonText>
        </Button>
      </HStack>

      {tags.length > 0 && (
        <HStack space="xs" className="mt-1 flex-wrap">
          {tags.map((tag: string, index: number) => (
            <Pressable
              key={index}
              onPress={() => onRemoveTag(tag)}
              className="rounded border border-background-200 bg-background-100 px-2 py-1">
              <HStack className="items-center">
                <Text className="mr-2 text-sm text-typography-800">{tag}</Text>
                <Icon as={X} size="xs" />
              </HStack>
            </Pressable>
          ))}
        </HStack>
      )}
    </VStack>
  );
}
