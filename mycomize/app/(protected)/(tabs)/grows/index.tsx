import { useState, useEffect, useContext, useCallback } from 'react';
import { Button, ButtonIcon } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { getBackendUrl } from '~/lib/backendUrl';
import { HStack } from '~/components/ui/hstack';
import { Icon } from '~/components/ui/icon';
import {
  PlusIcon,
  Sprout,
  AlertCircle,
  CalendarDays,
  Scale,
  Layers,
  Clock,
  DollarSign,
} from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '~/lib/AuthContext';
import {
  Grow,
  stageLabels,
  growStages,
  tekLabels,
  growTeks,
  statusLabels,
  growStatuses,
} from '~/lib/grow';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

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

const GrowCard: React.FC<{ grow: Grow }> = ({ grow }) => {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    if (status === growStatuses.CONTAMINATED) return 'text-error-500';
    if (status === growStatuses.HARVESTED) return 'text-amber-600';
    return 'text-green-700';
  };

  const statusColor = getStatusColor(grow.status);

  return (
    <>
      <Card className="w-11/12 rounded-xl bg-background-0">
        <VStack className="flex p-2">
          <Pressable
            onPress={() => {
              router.push({
                pathname: `/grows/[id]`,
                params: { id: grow.id },
              });
            }}>
            <HStack className="mb-2">
              <Heading>{grow.variant}</Heading>
              <Text className="ml-auto mt-0.5 text-lg" italic={true} size="md">
                {grow.species}
              </Text>
            </HStack>

            <HStack className="mb-1 mt-1">
              <Text className="text-lg">Tek</Text>
              <Text className="ml-auto">{tekLabels[grow.tek] || grow.tek}</Text>
            </HStack>

            <HStack className="mb-1 mt-1">
              <Text className="text-lg">Stage</Text>
              <HStack className="ml-auto">
                <Text>{stageLabels[grow.stage] || grow.stage}</Text>
              </HStack>
            </HStack>

            <HStack className="my-1">
              <Text className="text-lg">Status</Text>
              <HStack className="ml-auto">
                <Text className={statusColor}>{statusLabels[grow.status] || grow.status}</Text>
              </HStack>
            </HStack>

            <HStack className="my-1">
              <Text className="text-lg">Age</Text>
              <HStack className="ml-auto">
                <Text>{grow.age || 0} days</Text>
              </HStack>
            </HStack>

            <HStack className="my-1">
              <Text className="text-lg">Cost</Text>
              <HStack className="ml-auto">
                <Text>${grow.cost?.toFixed(2) || '0.00'}</Text>
              </HStack>
            </HStack>

            <HStack className="mt-1">
              <Text className="text-lg">Inoculated</Text>
              <HStack className="ml-auto">
                <Text>{grow.inoculationDate?.toDateString() || 'Unknown'}</Text>
              </HStack>
            </HStack>

            {grow.harvestDate && (
              <>
                <HStack>
                  <Text>Harvested</Text>
                  <HStack className="ml-auto">
                    <Text>{grow.harvestDate?.toDateString()}</Text>
                    <Icon as={CalendarDays} size="sm" className="ml-1 text-typography-400" />
                  </HStack>
                </HStack>

                {(grow.harvestDryWeight > 0 || grow.harvestWetWeight > 0) && (
                  <HStack>
                    <Text>Yield</Text>
                    <HStack className="ml-auto">
                      <Text>
                        {grow.harvestDryWeight > 0 ? `${grow.harvestDryWeight}g dry` : ''}
                        {grow.harvestDryWeight > 0 && grow.harvestWetWeight > 0 ? ' / ' : ''}
                        {grow.harvestWetWeight > 0 ? `${grow.harvestWetWeight}g wet` : ''}
                      </Text>
                      <Icon as={Scale} size="sm" className="ml-1 text-typography-400" />
                    </HStack>
                  </HStack>
                )}
              </>
            )}
          </Pressable>
        </VStack>
      </Card>
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
