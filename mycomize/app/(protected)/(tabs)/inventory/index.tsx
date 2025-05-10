import { useState } from 'react';
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

import { InventoryItem, SyringeItem } from '~/lib/inventory';

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
        className="absolute bottom-0 z-50 mb-3 h-12 w-11/12 rounded-md shadow-lg shadow-background-700"
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
            router.push(`/inventory/${item.id}/edit`);
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

const item: SyringeItem = {
  id: 1,
  type: 'Syringe',
  source: 'Supplier A',
  source_date: new Date('2023-01-01'),
  expiration_date: new Date('2024-01-01'),
  cost: 10.0,
  notes: 'Notes about the item',
  volume_ml: 10,
  syringe_type: 'Liquid Culture',
  species: 'Psilocybe cubensis',
  variant: 'Golden Teacher',
};

export default function InventoryScreen() {
  const items: InventoryItem[] = [item];

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
