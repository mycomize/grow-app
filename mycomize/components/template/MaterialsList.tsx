import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Plus, Edit2, Trash2, Package, ExternalLink } from 'lucide-react-native';
import { Material } from '~/lib/templateTypes';
import { MaterialModal } from './modals/MaterialModal';
import { DeleteConfirmationModal } from './modals/DeleteConfirmationModal';

interface MaterialsListProps {
  materials: Material[];
  onUpdateMaterials: (materials: Material[]) => void;
}

export const MaterialsList: React.FC<MaterialsListProps> = ({ materials, onUpdateMaterials }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleDeleteMaterial = (material: Material) => {
    setMaterialToDelete(material);
    setIsDeleteModalOpen(true);
  };

  const handleSaveMaterial = (material: Material) => {
    if (editingMaterial) {
      // Update existing material
      const updatedMaterials = materials.map((m) => (m.id === material.id ? material : m));
      onUpdateMaterials(updatedMaterials);
    } else {
      // Add new material
      onUpdateMaterials([...materials, material]);
    }
  };

  const handleConfirmDelete = () => {
    if (materialToDelete) {
      const updatedMaterials = materials.filter((m) => m.id !== materialToDelete.id);
      onUpdateMaterials(updatedMaterials);
      setMaterialToDelete(null);
    }
  };

  return (
    <VStack space="sm">
      {/* Header */}
      <HStack className="items-center justify-between">
        <Text className="font-medium text-typography-700">Materials</Text>
        <Button variant="outline" size="sm" onPress={handleAddMaterial}>
          <ButtonIcon as={Plus} size="sm" />
          <ButtonText>Add Material</ButtonText>
        </Button>
      </HStack>

      {/* Materials List */}
      {materials.length === 0 ? (
        <VStack
          className="items-center rounded-lg border border-dashed border-typography-300 p-6"
          space="sm">
          <Icon as={Package} className="text-typography-400" size="xl" />
          <Text className="text-center text-typography-500">
            No materials added yet. Click "Add Material" to get started.
          </Text>
        </VStack>
      ) : (
        <VStack space="xs">
          {materials.map((material) => (
            <VStack
              key={material.id}
              className="rounded-lg border border-background-200 bg-background-0 p-3"
              space="sm">
              <HStack className="items-start justify-between">
                <VStack className="flex-1" space="xs">
                  <Text className="font-medium text-typography-900">{material.description}</Text>
                  {material.vendor && (
                    <Text className="text-sm text-typography-600">Vendor: {material.vendor}</Text>
                  )}
                  <Text className="text-sm text-typography-600">Quantity: {material.quantity}</Text>
                  {material.url && (
                    <HStack className="items-center" space="xs">
                      <Icon as={ExternalLink} className="text-primary-600" size="sm" />
                      <Text className="text-sm text-primary-600">
                        {material.url.length > 30
                          ? `${material.url.substring(0, 30)}...`
                          : material.url}
                      </Text>
                    </HStack>
                  )}
                </VStack>
                <HStack space="xs">
                  <Pressable onPress={() => handleEditMaterial(material)} className="rounded p-2">
                    <Icon as={Edit2} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteMaterial(material)} className="rounded p-2">
                    <Icon as={Trash2} className="text-error-600" size="sm" />
                  </Pressable>
                </HStack>
              </HStack>
            </VStack>
          ))}
        </VStack>
      )}

      {/* Material Modal */}
      <MaterialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMaterial}
        material={editingMaterial}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Material"
        message="Are you sure you want to delete this material?"
        itemName={materialToDelete?.description}
      />
    </VStack>
  );
};
