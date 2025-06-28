import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Center } from '~/components/ui/center';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';

export default function GrowDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified edit screen with the grow id
    if (id) {
      const growId = Array.isArray(id) ? id[0] : id;
      router.replace({
        pathname: './edit',
        params: { id: growId },
      });
    }
  }, [id, router]);

  return (
    <Center className="h-full">
      <Spinner size="large" />
      <Text className="mt-4">Loading grow details...</Text>
    </Center>
  );
}
