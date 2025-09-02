import { useCallback, useContext } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';

import { TekForm } from '~/components/tek/TekForm';
import { useInitializeCurrentTek, useCurrentTek } from '~/lib/stores';
import { AuthContext } from '~/lib/api/AuthContext';

export default function TekEditScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useContext(AuthContext);
  const initializeCurrentTek = useInitializeCurrentTek();
  const currentTek = useCurrentTek();

  useFocusEffect(
    useCallback(() => {
      // Initialize the tek store for editing existing tek
      initializeCurrentTek(id as string);
    }, [initializeCurrentTek, id])
  );

  // Show loading while initializing
  if (!currentTek) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4">Loading tek...</Text>
      </VStack>
    );
  }

  return <TekForm tekId={id as string} saveButtonText="Update Tek" />;
}
