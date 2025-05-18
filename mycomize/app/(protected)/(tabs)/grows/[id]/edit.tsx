import { useEffect, useState, useContext } from 'react';
import { getGrow, Grow, GrowForm } from '~/lib/grow';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '~/lib/AuthContext';
import { Spinner } from '~/components/ui/spinner';
import { Center } from '~/components/ui/center';

export default function EditGrowScreen() {
  const { id } = useLocalSearchParams();
  const [grow, setGrow] = useState<Grow | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);
  const router = useRouter();

  // Fetch the grow data
  useEffect(() => {
    const fetchGrow = async () => {
      setLoading(true);
      try {
        if (!id) {
          router.back();
          return;
        }

        const response = await getGrow(Number(id), token);
        if (!response || !response.ok) {
          console.error('Failed to fetch grow:', response?.status);
          router.back();
          return;
        }

        const data = await response.json();
        setGrow(data);
      } catch (error) {
        console.error('Error fetching grow:', error);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchGrow();
  }, [id, token, router]);

  if (loading) {
    return (
      <Center className="h-full">
        <Spinner size="large" color="$primary500" />
      </Center>
    );
  }

  return <GrowForm growArg={grow} />;
}
