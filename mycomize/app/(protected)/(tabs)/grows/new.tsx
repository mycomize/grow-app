import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GrowForm } from '~/components/grow/GrowForm';
import { useInitializeCurrentGrow } from '~/lib/stores';
import { useAuthToken } from '~/lib/stores/authEncryptionStore';

export default function NewGrowScreen() {
  const { fromTek } = useLocalSearchParams();
  const token = useAuthToken();
  const initializeCurrentGrow = useInitializeCurrentGrow();

  useFocusEffect(
    useCallback(() => {
      // Initialize the grow store for new grow creation
      initializeCurrentGrow('new', fromTek as string, token || undefined);
    }, [initializeCurrentGrow, fromTek, token])
  );

  return <GrowForm growId="new" saveButtonText="Save Grow" />;
}
