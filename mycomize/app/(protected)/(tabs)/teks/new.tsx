import { useCallback, useContext } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { TekForm } from '~/components/tek/TekForm';
import { useInitializeCurrentTek } from '~/lib/stores';

export default function NewTekScreen() {
  const { tekToCopy, fromGrow } = useLocalSearchParams<{ tekToCopy?: string; fromGrow?: string }>();
  const initializeCurrentTek = useInitializeCurrentTek();

  useFocusEffect(
    useCallback(() => {
      // Initialize the tek store for new tek creation
      initializeCurrentTek('new', tekToCopy as string, fromGrow as string);
    }, [initializeCurrentTek, tekToCopy, fromGrow])
  );

  return <TekForm tekId="new" saveButtonText="Save Tek" />;
}
