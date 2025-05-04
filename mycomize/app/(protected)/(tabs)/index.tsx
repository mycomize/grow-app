import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenContent } from '~/components/ScreenContent';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Tab One' }} />
      <View className={styles.container}>
        <ScreenContent path="app/(protected)/(tabs)/index.tsx" title="Tab One" />
      </View>
    </>
  );
}

const styles = {
  container: 'flex-1 p-24',
};
