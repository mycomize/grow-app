import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';

import { useGrowFormLogic } from '~/lib/useGrowFormLogic';
import { GrowForm } from '~/components/grow/GrowForm';

export default function GrowEditScreen() {
  const { id, fromTek } = useLocalSearchParams();

  const formLogic = useGrowFormLogic({
    growId: id as string,
    fromTek: fromTek as string,
  });

  if (formLogic.isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4">Loading grow...</Text>
      </VStack>
    );
  }

  return (
    <GrowForm
      growData={formLogic.growData}
      flushes={formLogic.flushes}
      isSaving={formLogic.isSaving}
      keyboardVisible={formLogic.keyboardVisible}
      showDeleteModal={formLogic.showDeleteModal}
      isDeleting={formLogic.isDeleting}
      activeDatePicker={formLogic.activeDatePicker}
      growId={id as string}
      onUpdateField={formLogic.updateField}
      onGatewayLinked={formLogic.handleGatewayLinked}
      onGatewayUnlinked={formLogic.handleGatewayUnlinked}
      onAddFlush={formLogic.addFlush}
      onUpdateFlush={formLogic.updateFlush}
      onRemoveFlush={formLogic.removeFlush}
      onSetActiveDatePicker={formLogic.setActiveDatePicker}
      onHandleDateChange={formLogic.handleDateChange}
      onParseDate={formLogic.parseDate}
      onShowDeleteModal={formLogic.setShowDeleteModal}
      onDeleteGrow={formLogic.deleteGrow}
      onSaveGrow={formLogic.saveGrow}
      saveButtonText="Save"
    />
  );
}
