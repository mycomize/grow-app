import { Redirect } from 'expo-router';

export default function Index() {
  // This will immediately redirect to the grows tab
  return <Redirect href="/grows" />;
}
