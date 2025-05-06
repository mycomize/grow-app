import { Stack } from 'expo-router';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
    </>
  );
}

const styles = {
  container: 'flex-1 p-24',
};
