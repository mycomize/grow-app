import { useState, useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getInventoryItem, InventoryItem, InventoryForm } from '~/lib/inventory';
import { AuthContext } from '~/lib/AuthContext';
import { VStack } from '@/components/ui/vstack';
import { Pressable } from '@/components/ui/pressable';
import { Icon } from '@/components/ui/icon';
import { Trash2Icon } from 'lucide-react-native';
import { Button, ButtonIcon } from '~/components/ui/button';

export default function EditInventoryScreen() {
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = parseInt(id, 10);

  const [item, setItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        // With the consolidated model, we no longer need the type parameter
        const response = await getInventoryItem(itemId, token);

        if (!response) {
          console.error('Error fetching inventory item');
          return;
        }

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/login');
          } else {
            console.error('Failed to fetch inventory item:', response.status);
          }
        }

        setItem(await response.json());
      } catch (error) {
        console.error('Error fetching item:', error);
      }
    };

    fetchItem();
  }, []);

  return (
    <>
      <InventoryForm itemArg={item} />
    </>
  );
}
