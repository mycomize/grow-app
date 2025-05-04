import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ScreenContent } from '~/components/ScreenContent';
import { Button } from '~/components/Button';
import { AuthContext } from '~/lib/AuthContext';
import { useContext } from 'react';

export default function Home() {
  const authState = useContext(AuthContext);
  return (
    <>
      <Stack.Screen options={{ title: 'Tab Two' }} />
      <View className={styles.container}>
        <ScreenContent path="app/(protected)/(tabs)/two.tsx" title="Tab Two" />
        <Button title="Log out" onPress={authState.signOut} />
      </View>
    </>
  );
}

const styles = {
  container: 'flex-1 p-24 items-center',
};
