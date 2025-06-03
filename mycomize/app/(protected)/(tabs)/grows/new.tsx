import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Center } from '~/components/ui/center';
import { Spinner } from '~/components/ui/spinner';

export default function NewGrowScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified edit screen for new grow
    router.replace({
      pathname: '/(protected)/(tabs)/grows/[id]/edit',
      params: { id: 'new' },
    });
  }, [router]);

  return (
    <Center className="h-full w-full">
      <Spinner size="large" />
      <Text className="mt-4">Creating new grow...</Text>
    </Center>
  );
}
