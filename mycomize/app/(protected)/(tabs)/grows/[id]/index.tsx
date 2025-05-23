import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Center } from '~/components/ui/center';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';

export default function GrowDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the wizard view with the grow id
    if (id) {
      router.replace({
        pathname: '/(protected)/(tabs)/grows/wizard/[step]',
        params: { step: 'basics', id },
      });
    }
  }, [id, router]);

  return (
    <Center className="h-full">
      <Spinner size="large" color="$primary500" />
      <Text className="mt-4">Loading grow details...</Text>
    </Center>
  );
}
