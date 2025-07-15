import React, { useState } from 'react';
import { Linking } from 'react-native';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { Plus, Edit2, Trash2, Package, ExternalLink, Copy } from 'lucide-react-native';
import { Item } from '~/lib/tekTypes';
import { ItemModal } from '~/components/modals/ItemModal';
import { DeleteConfirmationModal } from '~/components/modals/DeleteConfirmationModal';

interface ItemsListProps {
  items: Item[];
  onUpdateItems: (items: Item[]) => void;
}

export const ItemsList: React.FC<ItemsListProps> = ({ items, onUpdateItems }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const handleAddItem = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteItem = (item: Item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleSaveItem = (item: Item) => {
    if (editingItem) {
      // Update existing item
      const updatedItems = items.map((i) => (i.id === item.id ? item : i));
      onUpdateItems(updatedItems);
    } else {
      // Add new item
      onUpdateItems([...items, item]);
    }
  };

  const handleCopyItem = (item: Item) => {
    const newItem: Item = {
      ...item,
      id: Date.now().toString(), // Generate a new ID
      description: `${item.description}`,
    };
    onUpdateItems([...items, newItem]);
  };

  const handleOpenURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      const updatedItems = items.filter((i) => i.id !== itemToDelete.id);
      onUpdateItems(updatedItems);
      setItemToDelete(null);
    }
  };

  return (
    <VStack space="sm">
      {/* Header */}
      <HStack className="mb-2 items-center justify-between">
        <Text className="font-medium text-typography-700">Items</Text>
        <Button variant="outline" size="sm" onPress={handleAddItem}>
          <ButtonIcon as={Plus} size="sm" />
          <ButtonText>Add</ButtonText>
        </Button>
      </HStack>

      {/* Items List */}
      {items.length === 0 ? (
        <VStack
          className="items-center rounded-lg border border-dashed border-typography-300 p-6"
          space="sm">
          <Icon as={Package} className="text-typography-400" size="xl" />
          <Text className="text-center text-typography-500">No items added yet</Text>
        </VStack>
      ) : (
        <VStack space="md">
          {items.map((item) => (
            <VStack
              key={item.id}
              className="rounded-lg border border-background-200 bg-background-0 p-3"
              space="md">
              <HStack className="items-start justify-between">
                <VStack className="flex-1" space="xs">
                  <Text className="font-medium text-typography-900">{item.description}</Text>
                  {item.vendor && (
                    <Text className="text-sm text-typography-600">Vendor: {item.vendor}</Text>
                  )}
                  <Text className="text-sm text-typography-600">Quantity: {item.quantity}</Text>
                  {item.cost && (
                    <Text className="text-sm text-typography-600">
                      Cost: $
                      {isNaN(parseFloat(item.cost)) ? item.cost : parseFloat(item.cost).toFixed(2)}
                    </Text>
                  )}
                  {item.url && (
                    <Pressable onPress={() => handleOpenURL(item.url!)}>
                      <HStack className="items-center" space="xs">
                        <Icon as={ExternalLink} className="text-primary-600" size="sm" />
                        <Text className="text-sm text-primary-600">
                          {item.url.length > 32 ? `${item.url.substring(0, 32)}...` : item.url}
                        </Text>
                      </HStack>
                    </Pressable>
                  )}
                </VStack>
                <HStack space="lg">
                  <Pressable onPress={() => handleCopyItem(item)} className="rounded p-2">
                    <Icon as={Copy} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable onPress={() => handleEditItem(item)} className="rounded p-2">
                    <Icon as={Edit2} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteItem(item)} className="rounded p-2">
                    <Icon as={Trash2} className="text-typography-500" size="sm" />
                  </Pressable>
                </HStack>
              </HStack>
            </VStack>
          ))}
        </VStack>
      )}

      {/* Item Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        item={editingItem}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        itemName={itemToDelete?.description}
      />
    </VStack>
  );
};
