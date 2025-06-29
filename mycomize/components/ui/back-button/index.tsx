import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

export const BackButton: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();

  const iconColor = theme === 'dark' ? '#ffffff' : '#000000';

  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ marginLeft: 0, padding: 0 }}
      activeOpacity={0.7}>
      <Icon as={ArrowLeft} size="xl" style={{ color: iconColor }} />
    </TouchableOpacity>
  );
};
