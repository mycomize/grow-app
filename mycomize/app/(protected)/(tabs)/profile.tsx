import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';

import { AuthContext } from '@/lib/AuthContext';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { useContext } from 'react';

export default function ProfileScreen() {
  const { signOut } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();

  return (
    <VStack className="flex-1 items-center justify-center">
      <Button
        className="w-1/2 text-success-500"
        onPress={() => {
          signOut();
        }}>
        <ButtonText>Sign Out</ButtonText>
      </Button>
      <Button
        className="w-1/2 text-success-500"
        onPress={() => {
          toggleTheme();
        }}>
        <ButtonText>Toggle Theme</ButtonText>
      </Button>
    </VStack>
  );
}
