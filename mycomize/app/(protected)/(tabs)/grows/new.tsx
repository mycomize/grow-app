import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Center } from '~/components/ui/center';
import { Spinner } from '~/components/ui/spinner';

export default function NewGrowScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the wizard flow
    router.replace({
      pathname: '/(protected)/(tabs)/grows/wizard/[step]',
      params: { step: 'basics' },
    });
  }, [router]);

  return (
    <Center className="h-full w-full">
      <Spinner size="large" />
      <Text className="mt-4">Redirecting to grow wizard...</Text>
    </Center>
  );
}
