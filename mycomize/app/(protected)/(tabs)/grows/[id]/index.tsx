import { useCallback, useContext } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';

import { GrowForm } from '~/components/grow/GrowForm';
import { useInitializeCurrentGrow, useCurrentGrow } from '~/lib/stores';
import { AuthContext } from '~/lib/api/AuthContext';

export default function GrowEditScreen() {
  const { id, fromTek } = useLocalSearchParams();
  const { token } = useContext(AuthContext);
  const initializeCurrentGrow = useInitializeCurrentGrow();
  const currentGrow = useCurrentGrow();

  useFocusEffect(
    useCallback(() => {
      // Initialize the grow store for editing existing grow
      initializeCurrentGrow(id as string, fromTek as string, token || undefined);
    }, [initializeCurrentGrow, id, fromTek, token])
  );

  // Show loading while initializing
  if (!currentGrow) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4">Loading grow...</Text>
      </VStack>
    );
  }

  return <GrowForm growId={id as string} saveButtonText="Save" />;
}
