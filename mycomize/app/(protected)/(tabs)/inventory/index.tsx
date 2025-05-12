import { useState, useEffect, useContext } from 'react';
import { Button, ButtonIcon } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { getBackendUrl } from '~/lib/backendUrl';
import { HStack } from '~/components/ui/hstack';
import { Icon } from '~/components/ui/icon';
import { PlusIcon, Syringe } from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { useRouter } from 'expo-router';

import { AuthContext } from '~/lib/AuthContext';
import { InventoryItem, SyringeItem, BulkItem, SpawnItem } from '~/lib/inventory';

interface AddItemButtonProps {
  title: string;
}

function isSyringeItem(item: InventoryItem): item is SyringeItem {
  return item.type === 'Syringe';
}

const AddItemButton: React.FC<AddItemButtonProps> = ({ title }) => {
  const router = useRouter();

  return (
    <>
      <Button
        variant="solid"
        className="absolute bottom-0 z-50 mb-4 h-12 w-11/12 rounded-md shadow-lg shadow-background-700"
        action="positive"
        onPress={() => {
          router.push('/inventory/new');
        }}>
        <ButtonIcon as={PlusIcon} size="xl" />
      </Button>
    </>
  );
};

const ItemCard: React.FC<{ item: InventoryItem }> = ({ item }) => {
  const volume = isSyringeItem(item) ? item.volume_ml : 0;
  const router = useRouter();

  return (
    <>
      <Card className="w-11/12 rounded-lg shadow-lg shadow-background-700">
        <Pressable
          onPress={() => {
            console.log('Item pressed');
            router.push({
              pathname: `/inventory/[id]/edit`,
              params: { id: item.id, type: 'Syringe' },
            });
          }}>
          <HStack>
            <Heading>{item.type}</Heading>
            {volume > 0 && (
              <Text className="ml-2 mt-0.5" italic={true} size="md">
                {volume} ml
              </Text>
            )}
            <Icon as={Syringe} size="xl" className="ml-auto" />
          </HStack>
          {isSyringeItem(item) && (
            <HStack className="mt-4">
              <Text>Variant</Text>
              <Text className="ml-auto" italic={true}>
                {item.variant}
              </Text>
            </HStack>
          )}
          <HStack>
            <Text>Cost</Text>
            <Text className="ml-auto">${item.cost}</Text>
          </HStack>
          <HStack>
            <Text>Expires</Text>
            <Text className="ml-auto">{item.expiration_date.toDateString()}</Text>
          </HStack>
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
      item.expiration_date = new Date(item.expiration_date);

      if (item.type === 'Syringe') {
        setItems((prevItems) => [...prevItems, item as SyringeItem]);
      } else if (item.type === 'Spawn') {
        setItems((prevItems) => [...prevItems, item as SpawnItem]);
      } else if (item.type === 'Bulk') {
        setItems((prevItems) => [...prevItems, item as BulkItem]);
      } else {
        console.error('Unknown item type:', item.type);
      }
    }
  };

  useEffect(() => {
    const url = getBackendUrl();

    const fetchData = async () => {
      try {
        const response = await fetch(`${url}/inventory/syringe`, {
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
        }

        const data: InventoryItem[] = await response.json();
        for (const item of data) {
          addItem(item);
        }
      } catch (error) {
        console.error('Exception fetching inventory items:', error);
      }
    };

    fetchData();
  }, []);

  return items.length == 0 ? (
    <VStack className="flex-1 items-center justify-center">
      <AddItemButton title="Add Inventory" />
    </VStack>
  ) : (
    <>
      <VStack className="mt-4 flex-1 items-center">
        {items.map((item, index) => (
          <ItemCard key={index} item={item} />
        ))}
        <AddItemButton title="Add Inventory" />
      </VStack>
    </>
  );
}
