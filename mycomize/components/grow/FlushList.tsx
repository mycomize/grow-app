import React, { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import {
  Plus,
  Edit2,
  Trash2,
  ShoppingBasket,
  Copy,
  CalendarDays,
  Weight,
} from 'lucide-react-native';
import { FlushModal } from '~/components/modals/FlushModal';
import { DeleteConfirmationModal } from '~/components/ui/delete-confirmation-modal';
import { BulkGrowFlush } from '~/lib/growTypes';

interface FlushListProps {
  flushes: BulkGrowFlush[];
  onUpdateFlushes: (flushes: BulkGrowFlush[]) => void;
}

export const FlushList: React.FC<FlushListProps> = ({ flushes, onUpdateFlushes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlush, setEditingFlush] = useState<BulkGrowFlush | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [flushToDelete, setFlushToDelete] = useState<BulkGrowFlush | null>(null);

  const handleAddFlush = () => {
    setEditingFlush(null);
    setIsModalOpen(true);
  };

  const handleEditFlush = (flush: BulkGrowFlush) => {
    setEditingFlush(flush);
    setIsModalOpen(true);
  };

  const handleDeleteFlush = (flush: BulkGrowFlush) => {
    setFlushToDelete(flush);
    setIsDeleteModalOpen(true);
  };

  const handleSaveFlush = (flush: BulkGrowFlush) => {
    if (editingFlush) {
      // Update existing flush
      const updatedFlushes = flushes.map((f) => (f.id === flush.id ? flush : f));
      onUpdateFlushes(updatedFlushes);
    } else {
      // Add new flush
      onUpdateFlushes([...flushes, flush]);
    }
  };

  const handleCopyFlush = (flush: BulkGrowFlush) => {
    const newFlush: BulkGrowFlush = {
      ...flush,
      id: Date.now(), // Generate a new ID
      harvest_date: undefined, // Reset date for copy
    };
    onUpdateFlushes([...flushes, newFlush]);
  };

  const handleConfirmDelete = () => {
    if (flushToDelete) {
      const updatedFlushes = flushes.filter((f) => f.id !== flushToDelete.id);
      onUpdateFlushes(updatedFlushes);
      setFlushToDelete(null);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  const getFlushNumber = (flushId: number) => {
    const index = flushes.findIndex((f) => f.id === flushId);
    return index + 1;
  };

  return (
    <VStack space="sm">
      {/* Header */}
      <HStack className="mb-2 items-center justify-between">
        <Text className="font-medium text-typography-700">Flushes</Text>
        <Button variant="outline" size="sm" onPress={handleAddFlush}>
          <ButtonIcon as={Plus} size="sm" />
          <ButtonText>Add</ButtonText>
        </Button>
      </HStack>

      {/* Flushes List */}
      {flushes.length === 0 ? (
        <VStack
          className="items-center rounded-lg border border-dashed border-typography-300 p-6"
          space="sm">
          <Icon as={ShoppingBasket} className="text-typography-400" size="xl" />
          <Text className="text-center text-typography-500">No flushes recorded yet</Text>
        </VStack>
      ) : (
        <VStack space="xs">
          {flushes.map((flush) => (
            <VStack
              key={flush.id}
              className="rounded-lg border border-background-200 bg-background-0 p-3"
              space="sm">
              <HStack className="items-start justify-between">
                <VStack className="flex-1" space="xs">
                  <Text className="font-medium text-typography-900">
                    Flush #{getFlushNumber(flush.id)}
                  </Text>

                  <HStack className="items-center" space="xs">
                    <Icon as={CalendarDays} className="text-typography-500" size="sm" />
                    <Text className="text-sm text-typography-600">
                      Date: {formatDate(flush.harvest_date)}
                    </Text>
                  </HStack>

                  <HStack className="items-center" space="xs">
                    <Icon as={Weight} className="text-typography-500" size="sm" />
                    <Text className="text-sm text-typography-600">
                      Wet: {flush.wet_yield_grams || 0}g, Dry: {flush.dry_yield_grams || 0}g
                    </Text>
                  </HStack>

                  {flush.concentration_mg_per_gram && (
                    <Text className="text-sm text-typography-600">
                      Concentration: {flush.concentration_mg_per_gram} mg/g
                    </Text>
                  )}
                </VStack>

                <HStack space="lg">
                  <Pressable onPress={() => handleCopyFlush(flush)} className="rounded p-2">
                    <Icon as={Copy} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable onPress={() => handleEditFlush(flush)} className="rounded p-2">
                    <Icon as={Edit2} className="text-typography-500" size="sm" />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteFlush(flush)} className="rounded p-2">
                    <Icon as={Trash2} className="text-typography-500" size="sm" />
                  </Pressable>
                </HStack>
              </HStack>
            </VStack>
          ))}

          {/* Total Summary */}
          {flushes.length > 0 && (
            <VStack className="mt-4 gap-2 rounded-md border border-success-200 bg-success-50 p-4">
              <HStack className="justify-between">
                <Text className="font-bold text-success-800">Total Wet Yield:</Text>
                <Text className="text-success-800">
                  {flushes
                    .reduce((sum, flush) => sum + (flush.wet_yield_grams || 0), 0)
                    .toFixed(2)}
                  g
                </Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="font-bold text-success-800">Total Dry Yield:</Text>
                <Text className="text-success-800">
                  {flushes
                    .reduce((sum, flush) => sum + (flush.dry_yield_grams || 0), 0)
                    .toFixed(2)}
                  g
                </Text>
              </HStack>
            </VStack>
          )}
        </VStack>
      )}

      {/* Flush Modal */}
      <FlushModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFlush}
        flush={editingFlush}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Flush"
        message="Are you sure you want to delete this flush?"
        itemName={flushToDelete ? `Flush #${getFlushNumber(flushToDelete.id)}` : undefined}
      />
    </VStack>
  );
};
