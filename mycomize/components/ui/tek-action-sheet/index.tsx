import React, { useState } from 'react';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetIcon,
} from '../actionsheet';
import { Icon } from '../icon';
import { SquarePen, Trash2, RefreshCw } from 'lucide-react-native';
import { DeleteConfirmationModal } from '../delete-confirmation-modal';

interface TekActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  isOwner: boolean;
  tekName?: string;
  isDeleting?: boolean;
}

export const TekActionSheet: React.FC<TekActionSheetProps> = ({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onCopy,
  isOwner,
  tekName,
  isDeleting = false,
}) => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Only show actions if user is owner
  if (!isOwner) {
    return null;
  }

  const handleDeletePress = () => {
    onClose(); // Close action sheet first
    setShowDeleteConfirmation(true); // Then show confirmation modal
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirmation(false);
    onDelete(); // Call the actual delete function
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
  };

  return (
    <>
      <Actionsheet isOpen={isOpen} onClose={onClose}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          
          <ActionsheetItem onPress={onEdit}>
            <ActionsheetIcon as={SquarePen} size="lg" />
            <ActionsheetItemText className="text-xl ml-1">Edit Tek</ActionsheetItemText>
          </ActionsheetItem>
          
          <ActionsheetItem onPress={onCopy}>
            <ActionsheetIcon as={RefreshCw} size="lg" />
            <ActionsheetItemText className="text-xl ml-1">Copy Tek</ActionsheetItemText>
          </ActionsheetItem>
          
          <ActionsheetItem onPress={handleDeletePress}>
            <ActionsheetIcon as={Trash2} size="lg" />
            <ActionsheetItemText className="text-xl ml-1 text-red-500">Delete Tek</ActionsheetItemText>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Tek"
        itemName={tekName}
        isDeleting={isDeleting}
        confirmText="Delete"
      />
    </>
  );
};
