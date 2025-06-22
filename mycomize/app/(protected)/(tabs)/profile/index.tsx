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
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';

import { AuthContext } from '@/lib/AuthContext';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getSwitchColors } from '@/lib/switchUtils';

import { ChevronRight } from 'lucide-react-native';

// Function to decode JWT token and extract username
function getUsernameFromToken(token: string | null | undefined): string {
  if (!token) return 'User';

  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return 'User';

    // Decode base64 payload
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload.sub || decodedPayload.username || 'User';
  } catch (error) {
    console.error('Error decoding token:', error);
    return 'User';
  }
}

export default function ProfileScreen() {
  const { signOut, token } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);
  const [darkModeEnabled, setDarkModeEnabled] = useState(theme === 'dark');
  const [username, setUsername] = useState('User');
  const router = useRouter();

  useEffect(() => {
    const extractedUsername = getUsernameFromToken(token);
    setUsername(extractedUsername);
  }, [token]);

  const handleDarkModeToggle = () => {
    setDarkModeEnabled((prev) => !prev);
    toggleTheme();
  };

  const navigateToChangePassword = () => {
    router.push('/profile/change-password');
  };

  // Get the first two letters of username for avatar fallback
  const getAvatarFallback = (name: string) => {
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
  };

  return (
    <VStack className="flex-1 items-center gap-3 bg-background-50 py-3">
      {/* Avatar and Username Section */}
      <VStack className="items-center gap-3 py-4">
        <Avatar size="xl">
          <AvatarFallbackText>{getAvatarFallback(username)}</AvatarFallbackText>
        </Avatar>
        <Text className="text-lg font-medium text-typography-900">{username}</Text>
      </VStack>

      {/* Account card */}
      <Card className="w-11/12 bg-background-0">
        <Heading className="mb-3 text-typography-400">ACCOUNT</Heading>
        <Pressable onPress={navigateToChangePassword}>
          <HStack className="flex w-full flex-row items-center py-2">
            <Text className="text-lg">Change password</Text>
            <Icon className="ml-auto h-6 w-6 text-typography-500" as={ChevronRight} />
          </HStack>
        </Pressable>
      </Card>

      {/* Display card */}
      <Card className="w-11/12 bg-background-0">
        <Heading className="mb-3 text-typography-400">DISPLAY</Heading>
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
