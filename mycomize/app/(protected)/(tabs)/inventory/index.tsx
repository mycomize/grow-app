import { useState, useEffect, useContext, useCallback } from 'react';
import { Button, ButtonIcon } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { getBackendUrl } from '~/lib/backendUrl';
import { HStack } from '~/components/ui/hstack';
import { Icon } from '~/components/ui/icon';
import { PlusIcon, Syringe, BeanIcon, Box } from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '~/lib/AuthContext';
import { InventoryItem } from '~/lib/inventory';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
interface AddItemButtonProps {
  title: string;
  initial?: boolean;
}

const AddItemButton: React.FC<AddItemButtonProps> = ({ title, initial = false }) => {
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
          router.push('/inventory/new');
        }}>
        <ButtonIcon as={PlusIcon} className="h-8 w-8 text-white" />
      </Button>
    </>
  );
};

const ItemCard: React.FC<{ item: InventoryItem }> = ({ item }) => {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <>
      <Card
        className={
          theme === 'light'
            ? 'w-11/12 rounded-xl bg-background-0 shadow-lg shadow-background-700'
            : 'w-11/12 rounded-xl bg-background-0'
        }>
        <Pressable
          onPress={() => {
            console.log('Item pressed');
            router.push({
              pathname: `/inventory/[id]/edit`,
              params: { id: item.id }, // type no longer needed with consolidated model
            });
          }}>
          <HStack className="mb-2">
            <Heading>{item.type}</Heading>
          </HStack>
          <HStack className="my-1">
            <Text>Cost</Text>
            <Text className="ml-auto">${item.cost}</Text>
          </HStack>
          {item.expiration_date && (
            <HStack className="my-1">
              <Text>Expires</Text>
              <Text className="ml-auto">{item.expiration_date.toDateString()}</Text>
            </HStack>
          )}
          {item.type === 'Syringe' && (
            <>
              <HStack className="my-1">
                <Text>Species</Text>
                <Text className="ml-auto" italic={true}>
                  {item.species}
                </Text>
              </HStack>
              <HStack className="my-1">
                <Text>Variant</Text>
                <Text className="ml-auto">{item.variant}</Text>
              </HStack>
              <HStack className="my-1">
                <Text>Volume</Text>
                <Text className="ml-auto">{item.volume_ml} ml</Text>
              </HStack>
            </>
          )}
          {item.type === 'Spawn' && (
            <>
              <HStack className="my-1">
                <Text>Type</Text>
                <Text className="ml-auto">{item.spawn_type}</Text>
              </HStack>
              <HStack className="my-1">
                <Text>Ammount</Text>
                <Text className="ml-auto">{item.amount_lbs} lbs</Text>
              </HStack>
            </>
          )}
          {item.type === 'Bulk' && (
            <>
              <HStack className="my-1">
                <Text>Type</Text>
                <Text className="ml-auto">{item.bulk_type}</Text>
              </HStack>
              <HStack className="my-1">
                <Text>Ammount</Text>
                <Text className="ml-auto">{item.amount_lbs} lbs</Text>
              </HStack>
            </>
          )}
        </Pressable>
      </Card>
    </>
  );
};

export default function InventoryScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);

  const addItem = (item: InventoryItem) => {
    const isDuplicate = items.some((existingItem) => existingItem.id === item.id);

    if (!isDuplicate) {
      item.source_date = new Date(item.source_date);
      item.expiration_date = item.expiration_date ? new Date(item.expiration_date) : null;

      if (item.type === 'Syringe' || item.type === 'Spawn' || item.type === 'Bulk') {
        setItems((prevItems) => [...prevItems, item]);
      } else {
        console.error('Unknown item type:', item.type);
      }
    }
  };

  // Define the fetch function
  const fetchData = useCallback(async () => {
    try {
      const url = getBackendUrl();
      // Reset items before fetching to avoid stale data
      setItems([]);

      const response = await fetch(`${url}/inventory/all`, {
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
          console.error('Failed to fetch inventory items:', response.statusText);
        }
        return;
      }

      const data: InventoryItem[] = await response.json();
      const formattedItems = data.map((item) => ({
        ...item,
        source_date: new Date(item.source_date),
        expiration_date: item.expiration_date ? new Date(item.expiration_date) : null,
      }));

      setItems(formattedItems);
    } catch (error) {
      console.error('Exception fetching inventory items:', error);
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

  return items.length == 0 ? (
    <VStack className="flex-1 items-center justify-center gap-2 bg-background-50">
      <AddItemButton title="Add Inventory" initial={true} />
    </VStack>
  ) : (
    <VStack className="flex-1 items-center gap-4 bg-background-50">
      <View className="mt-2" />
      {items.map((item, index) => (
        <ItemCard key={index} item={item} />
      ))}
      <AddItemButton title="Add Inventory" />
    </VStack>
  );
}
