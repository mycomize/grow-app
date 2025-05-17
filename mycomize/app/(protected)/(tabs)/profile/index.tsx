import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Switch } from '@/components/ui/switch';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

import { AuthContext } from '@/lib/AuthContext';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { useContext, useState } from 'react';

import { ArrowRightIcon } from 'lucide-react-native';

function getSwitchColors(theme: string) {
  let track_false_color = '';
  let track_true_color = '';

  if (theme === 'light') {
    track_false_color = 'rgb(157, 157, 157)';
    track_true_color = 'rgb(110, 150, 242)';
  } else if (theme === 'dark') {
    track_false_color = 'rgb(153, 153, 153)';
    track_true_color = 'rgb(110, 150, 242)';
  }

  return {
    trackFalse: track_false_color,
    trackTrue: track_true_color,
    thumbColor: 'rgb(255, 255, 255)',
  };
}

export default function ProfileScreen() {
  const { signOut } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);
  const [darkModeEnabled, setDarkModeEnabled] = useState(theme === 'dark');

  const handleDarkModeToggle = () => {
    setDarkModeEnabled((prev) => !prev);
    toggleTheme();
  };

  return (
    <VStack className="flex-1 items-center gap-3 bg-background-50 py-3">
      {/* Account card */}
      <Card
        className={
          theme === 'light'
            ? 'w-11/12 bg-background-0 shadow-lg shadow-background-700'
            : 'w-11/12 bg-background-0'
        }>
        <Heading className="mb-3">ACCOUNT</Heading>
        <HStack className="flex w-full flex-row">
          <Text className="text-lg">Change password</Text>
          <Pressable className="ml-auto mt-1" onPress={() => {}}>
            <Icon className="mr-2 h-6 w-6" as={ArrowRightIcon} />
          </Pressable>
        </HStack>
      </Card>

      {/* Display card */}
      <Card
        className={
          theme === 'light'
            ? 'w-11/12 bg-background-0 shadow-lg shadow-background-700'
            : 'w-11/12 bg-background-0'
        }>
        <Heading className="mb-3">DISPLAY</Heading>
        <HStack className="flex w-full flex-row">
          <Text className="text-lg">Dark mode</Text>
          <Switch
            trackColor={{ false: trackFalse, true: trackTrue }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackFalse}
            className="ml-auto"
            size="md"
            value={darkModeEnabled}
            onToggle={handleDarkModeToggle}
          />
        </HStack>
      </Card>

      {/* Sign out button */}
      <View className="flex-1" />
      <Button
        className="w-11/12 bg-error-500"
        onPress={() => {
          signOut();
        }}>
        <ButtonText className="text-white">Sign Out</ButtonText>
      </Button>
    </VStack>
  );
}
