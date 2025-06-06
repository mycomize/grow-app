import { useState, useEffect, useContext, useCallback } from 'react';
import { Button, ButtonIcon } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { getBackendUrl } from '~/lib/backendUrl';
import { Icon } from '~/components/ui/icon';
import { PlusIcon } from 'lucide-react-native';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '~/lib/AuthContext';
import { Grow, growTeks } from '~/lib/growTypes';
import { GrowCard } from '~/components/grow/GrowCard';

interface AddGrowButtonProps {
  title: string;
  initial?: boolean;
}

const AddGrowButton: React.FC<AddGrowButtonProps> = ({ title, initial = false }) => {
  const router = useRouter();

  return (
    <>
      <Button
        variant="solid"
        className={
          initial ? 'h-16 w-16 rounded-full' : 'absolute bottom-0 z-50 mb-4 h-12 w-11/12 rounded-md'
        }
        action="positive"
        onPress={() => {
          router.push('/grows/new');
        }}>
        <ButtonIcon as={PlusIcon} className="h-8 w-8 text-white" />
      </Button>
    </>
  );
};

export default function GrowScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [grows, setGrows] = useState<Grow[]>([]);

  const addGrow = (grow: Grow) => {
    const isDuplicate = grows.some((existingGrow) => existingGrow.id === grow.id);

    if (!isDuplicate) {
      grow.inoculationDate = grow.inoculationDate ? new Date(grow.inoculationDate) : null;
      grow.harvestDate = grow.harvestDate ? new Date(grow.harvestDate) : null;

      if (grow.tek === 'Monotub') {
        setGrows((prevGrows) => [...prevGrows, grow]);
      } else {
        console.error('Unknown grow tek:', grow.tek);
      }
    }
  };

  // Define the fetch function
  const fetchData = useCallback(async () => {
    try {
      const url = getBackendUrl();
      // Reset grows before fetching to avoid stale data
      setGrows([]);

      const response = await fetch(`${url}/grows/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
        } else {
          console.error('Failed to fetch grows:', response.statusText);
        }
        return;
      }

      const data: Grow[] = await response.json();
      const formattedGrows = data.map((grow) => ({
        ...grow,
        inoculationDate: grow.inoculationDate ? new Date(grow.inoculationDate) : null,
        harvestDate: grow.harvestDate ? new Date(grow.harvestDate) : null,
      }));

      setGrows(formattedGrows);
    } catch (error) {
      console.error('Exception fetching grows:', error);
    }
  }, [token, router]);

  // Use useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();

      // No cleanup needed for useFocusEffect in this case
      return () => {};
    }, [fetchData])
  );

  return grows.length == 0 ? (
    <VStack className="flex-1 items-center justify-center gap-2 bg-background-50">
      <Text className="text-lg">Add Grow</Text>
      <AddGrowButton title="Add Grow" initial={true} />
    </VStack>
  ) : (
    <VStack className="flex-1 items-center gap-4 bg-background-50">
      <View className="mt-2" />
      {grows.map((grow, index) => (
        <GrowCard key={index} grow={grow} />
      ))}
      <AddGrowButton title="Add Grow" />
    </VStack>
  );
}
