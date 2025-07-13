import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Center } from '~/components/ui/center';
import { Spinner } from '~/components/ui/spinner';

export default function NewGrowScreen() {
  const router = useRouter();
  const { fromTemplate } = useLocalSearchParams();

  useEffect(() => {
    // Redirect to the unified edit screen for new grow
    // Preserve the fromTemplate parameter if it exists
    const params: any = { id: 'new' };
    if (fromTemplate) {
      params.fromTemplate = fromTemplate;
    }

    router.replace({
      pathname: './[id]/edit',
      params,
    });
  }, [router, fromTemplate]);

  return (
    <Center className="h-full w-full">
      <Spinner size="large" />
      <Text className="mt-4">Creating new grow...</Text>
    </Center>
  );
}
