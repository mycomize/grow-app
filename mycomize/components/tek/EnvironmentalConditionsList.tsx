import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Plus, Edit2, Trash2, Thermometer, Copy } from 'lucide-react-native';
import { EnvironmentalCondition } from '~/lib/types/tekTypes';
import { EnvironmentalConditionModal } from '~/components/modals/EnvironmentalConditionModal';
import { DeleteConfirmationModal } from '~/components/modals/DeleteConfirmationModal';

interface EnvironmentalConditionsListProps {
  conditions: EnvironmentalCondition[];
  onUpdateConditions?: (conditions: EnvironmentalCondition[]) => void;
  readOnly?: boolean;
}

export const EnvironmentalConditionsList: React.FC<EnvironmentalConditionsListProps> = ({
  conditions,
  onUpdateConditions,
  readOnly = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<EnvironmentalCondition | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conditionToDelete, setConditionToDelete] = useState<EnvironmentalCondition | null>(null);

  const handleAddCondition = () => {
    setEditingCondition(null);
    setIsModalOpen(true);
  };

  const handleEditCondition = (condition: EnvironmentalCondition) => {
    setEditingCondition(condition);
    setIsModalOpen(true);
  };

  const handleDeleteCondition = (condition: EnvironmentalCondition) => {
    setConditionToDelete(condition);
    setIsDeleteModalOpen(true);
  };

  const handleSaveCondition = (condition: EnvironmentalCondition) => {
    if (!onUpdateConditions) return;
    
    if (editingCondition) {
      // Update existing condition
      const updatedConditions = conditions.map((c) => (c.id === condition.id ? condition : c));
      onUpdateConditions(updatedConditions);
    } else {
      // Add new condition
      onUpdateConditions([...conditions, condition]);
    }
  };

  const handleCopyCondition = (condition: EnvironmentalCondition) => {
    if (!onUpdateConditions) return;
    
    const newCondition: EnvironmentalCondition = {
      ...condition,
      id: Date.now().toString(), // Generate a new ID
      name: `${condition.name}`,
    };
    onUpdateConditions([...conditions, newCondition]);
  };

  const handleConfirmDelete = () => {
    if (!onUpdateConditions || !conditionToDelete) return;
    
    const updatedConditions = conditions.filter((c) => c.id !== conditionToDelete.id);
    onUpdateConditions(updatedConditions);
    setConditionToDelete(null);
  };

  return (
    <VStack space="sm">
      {/* Header */}
      <HStack className="mb-2 items-center justify-between">
        <Text className="font-medium text-typography-700">Environmental Conditions</Text>
        {!readOnly && (
          <Button variant="outline" size="sm" onPress={handleAddCondition}>
            <ButtonIcon as={Plus} size="sm" />
            <ButtonText>Add</ButtonText>
          </Button>
        )}
      </HStack>

      {/* Conditions List */}
      {conditions.length === 0 ? (
        <VStack
          className="items-center rounded-lg border border-dashed border-typography-300 p-6"
          space="sm">
          <Icon as={Thermometer} className="text-typography-400" size="xl" />
          <Text className="text-center text-typography-500">
            No environmental conditions added yet
          </Text>
        </VStack>
      ) : (
        <VStack space="md">
          {conditions.map((condition) => (
            <VStack
              key={condition.id}
              className="rounded-lg border border-background-200 bg-background-0 p-3"
              space="sm">
              {/* Main content */}
              <VStack className="flex-1" space="xs">
                <Text className="font-medium text-typography-900">{condition.name}</Text>
                {condition.type && (
                  <Text className="text-sm text-typography-600">Type: {condition.type}</Text>
                )}
                <Text className="text-sm text-typography-600">
                  Range: {String(condition.lower_bound)} - {String(condition.upper_bound)}{' '}
                  {condition.unit}
                </Text>
              </VStack>

              {/* Action buttons at bottom - Hide in read-only mode */}
              {!readOnly && (
                <HStack className="items-center justify-between px-8 pt-3" space="sm">
                  <Pressable onPress={() => handleCopyCondition(condition)} className="rounded px-2">
                    <Icon as={Copy} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable onPress={() => handleEditCondition(condition)} className="rounded px-2">
                    <Icon as={Edit2} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteCondition(condition)}
                    className="rounded px-2">
                    <Icon as={Trash2} className="text-typography-500" size="sm" />
                  </Pressable>
                </HStack>
              )}
            </VStack>
          ))}
        </VStack>
      )}

      {/* Condition Modal */}
      <EnvironmentalConditionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCondition}
        condition={editingCondition}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Environmental Condition"
        message="Are you sure you want to delete this environmental condition?"
        itemName={conditionToDelete?.name}
      />
    </VStack>
  );
};
