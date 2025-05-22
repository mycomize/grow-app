import { useEffect, useState, useContext } from 'react';
import { getGrow, Grow, GrowForm } from '~/lib/grow';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '~/lib/AuthContext';
import { Spinner } from '~/components/ui/spinner';
import { Center } from '~/components/ui/center';
import { Pressable } from '~/components/ui/pressable';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Heading } from '~/components/ui/heading';
import { Box } from '~/components/ui/box';
import { ScrollView } from '~/components/ui/scroll-view';

export default function EditGrowScreen() {
  const { id } = useLocalSearchParams();
  const [grow, setGrow] = useState<Grow | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Grow Details');

  const TabBar = () => {
    return (
      <HStack className="flex w-full flex-row justify-around bg-background-50 pb-4 pt-6">
        <Pressable
          className={
            activeTab === 'Grow Details' ? 'w-1/2 border-b-2 border-b-success-500' : 'w-1/2'
          }
          onPress={() => {
            setActiveTab('Grow Details');
          }}>
          <Text
            className={
              activeTab === 'Grow Details'
                ? 'mb-3 text-center text-lg font-bold text-typography-900'
                : 'mb-3 text-center text-lg text-typography-900'
            }>
            Grow Details
          </Text>
        </Pressable>
        <Pressable
          className={
            activeTab === 'IoT Gateway' ? 'w-1/2 border-b-2 border-b-success-500' : 'w-1/2'
          }
          onPress={() => {
            setActiveTab('IoT Gateway');
          }}>
          <Text
            className={
              activeTab === 'IoT Gateway'
                ? 'mb-3 text-center text-lg font-bold text-typography-900'
                : 'mb-3 text-center text-lg text-typography-900'
            }>
            IoT Gateway
          </Text>
        </Pressable>
      </HStack>
    );
  };

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

  return (
    <>
      <Box className="h-full w-full bg-background-50">
        <ScrollView className="h-full w-full">
          <TabBar />
          {activeTab === 'Grow Details' && <GrowForm growArg={grow} />}
        </ScrollView>
      </Box>
    </>
  );
}
