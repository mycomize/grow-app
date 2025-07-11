import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Plus, Edit2, Trash2, Thermometer } from 'lucide-react-native';
import { EnvironmentalCondition } from '~/lib/templateTypes';
import { EnvironmentalConditionModal } from './modals/EnvironmentalConditionModal';
import { DeleteConfirmationModal } from './modals/DeleteConfirmationModal';

interface EnvironmentalConditionsListProps {
  conditions: EnvironmentalCondition[];
  onUpdateConditions: (conditions: EnvironmentalCondition[]) => void;
}

export const EnvironmentalConditionsList: React.FC<EnvironmentalConditionsListProps> = ({
  conditions,
  onUpdateConditions,
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
    if (editingCondition) {
      // Update existing condition
      const updatedConditions = conditions.map((c) => (c.id === condition.id ? condition : c));
      onUpdateConditions(updatedConditions);
    } else {
      // Add new condition
      onUpdateConditions([...conditions, condition]);
    }
  };

  const handleConfirmDelete = () => {
    if (conditionToDelete) {
      const updatedConditions = conditions.filter((c) => c.id !== conditionToDelete.id);
      onUpdateConditions(updatedConditions);
      setConditionToDelete(null);
    }
  };

  return (
    <VStack space="sm">
      {/* Header */}
      <HStack className="mb-2 items-center justify-between">
        <Text className="font-medium text-typography-700">Environmental Conditions</Text>
        <Button variant="outline" size="sm" onPress={handleAddCondition}>
          <ButtonIcon as={Plus} size="sm" />
          <ButtonText>Add</ButtonText>
        </Button>
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
        <VStack space="xs">
          {conditions.map((condition) => (
            <VStack
              key={condition.id}
              className="rounded-lg border border-background-200 bg-background-0 p-3"
              space="sm">
              <HStack className="items-start justify-between">
                <VStack className="flex-1" space="xs">
                  <Text className="font-medium text-typography-900">{condition.name}</Text>
                  {condition.type && (
                    <Text className="text-sm text-typography-600">Type: {condition.type}</Text>
                  )}
                  <HStack className="items-center" space="xs">
                    <Text className="text-sm text-typography-600">
                      Range: {condition.lowerBound} - {condition.upperBound} {condition.unit}
                    </Text>
                  </HStack>
                </VStack>
                <HStack space="lg">
                  <Pressable onPress={() => handleEditCondition(condition)} className="rounded p-2">
                    <Icon as={Edit2} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteCondition(condition)}
                    className="rounded p-2">
                    <Icon as={Trash2} className="text-error-600" size="sm" />
                  </Pressable>
                </HStack>
              </HStack>
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
