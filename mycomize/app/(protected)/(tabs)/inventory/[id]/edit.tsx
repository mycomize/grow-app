import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { Button, ButtonText } from '~/components/ui/button';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getInventoryItem } from '~/lib/inventory';

export default function EditInventoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = parseInt(id, 10);
  const item = getInventoryItem(itemId);

  console.log('Found item in backend:', item);

  return (
    <VStack className="flex-1 items-center justify-center">
      <Text>Edit Inventory</Text>
      <Button
        className="mt-4 w-1/2"
        action="positive"
        size="lg"
        onPress={() => {
          router.back();
        }}>
        <ButtonText>Back</ButtonText>
      </Button>
    </VStack>
  );
}
