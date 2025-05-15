import { useState, useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getInventoryItem, InventoryItem, InventoryForm } from '~/lib/inventory';
import { AuthContext } from '~/lib/AuthContext';
import { Box } from '@/components/ui/box';

export default function EditInventoryScreen() {
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const itemId = parseInt(id, 10);

  const [item, setItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await getInventoryItem(itemId, type, token);

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

  return <InventoryForm itemArg={item} />;
}
