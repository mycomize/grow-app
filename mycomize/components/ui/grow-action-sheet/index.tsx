import React from 'react';
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
import { ArrowRightLeft } from 'lucide-react-native';

interface GrowActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConvertToTek: () => void;
  growName?: string;
}

export const GrowActionSheet: React.FC<GrowActionSheetProps> = ({
  isOpen,
  onClose,
  onConvertToTek,
  growName,
}) => {
  const handleConvertPress = () => {
    onClose(); // Close action sheet first
    onConvertToTek(); // Then execute conversion
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        
        <ActionsheetItem onPress={handleConvertPress}>
          <ActionsheetIcon as={ArrowRightLeft} size="xl" />
          <ActionsheetItemText className="text-xl font-semibold ml-1">Convert grow to tek</ActionsheetItemText>
        </ActionsheetItem>
      </ActionsheetContent>
    </Actionsheet>
  );
};
