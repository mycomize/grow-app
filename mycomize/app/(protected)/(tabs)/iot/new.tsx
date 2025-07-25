import { useState, useContext } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { Input, InputField, InputSlot, InputIcon } from '~/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Button, ButtonText } from '~/components/ui/button';
import { Alert, AlertIcon, AlertText } from '~/components/ui/alert';
import { InfoIcon, Eye, EyeOff } from 'lucide-react-native';
import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { IoTGatewayCreate, gatewayTypes, gatewayTypeLabels } from '~/lib/iot';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';

export default function NewIoTIntegrationScreen() {
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiHelp, setShowApiHelp] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState<IoTGatewayCreate>({
    name: '',
    type: gatewayTypes.HASS,
    description: '',
    api_url: '',
    api_key: '',
    is_active: true,
  });

  const handleSubmit = async () => {
    setError(null);

    // Validate required fields
    if (!formData.name || !formData.api_url || !formData.api_key) {
      setError('Please fill in all required fields');
      return;
    }

    if (!token) {
      setError('Authentication required');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.createIoTGateway(formData, token);
      // Navigate back to the IoT list
      router.back();
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background-50">
      <VStack className="p-4" space="md">
        <Card className="bg-background-0">
          <VStack space="lg" className="p-4">
            <Heading size="xl">Add Home Assistant Integration</Heading>

            {error && (
              <Alert action="error">
                <AlertIcon as={InfoIcon} />
                <AlertText>{error}</AlertText>
              </Alert>
            )}

            <FormControl isRequired>
              <FormControlLabel>
                <FormControlLabelText>Integration Name</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  placeholder="My Home Assistant"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  className="placeholder:text-typography-300"
                />
              </Input>
            </FormControl>

            <FormControl>
              <FormControlLabel>
                <FormControlLabelText>Description</FormControlLabelText>
              </FormControlLabel>
              <Textarea>
                <TextareaInput
                  placeholder="Optional description"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  style={{ textAlignVertical: 'top' }}
                  className="placeholder:text-typography-300"
                />
              </Textarea>
            </FormControl>

            <FormControl isRequired>
              <FormControlLabel>
                <FormControlLabelText>Home Assistant URL</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  placeholder="http://homeassistant.local:8123"
                  value={formData.api_url}
                  onChangeText={(text) => setFormData({ ...formData, api_url: text })}
                  autoCapitalize="none"
                  className="placeholder:text-typography-300"
                />
              </Input>
            </FormControl>

            <FormControl isRequired>
              <FormControlLabel className="flex-row items-center">
                <FormControlLabelText>API Token</FormControlLabelText>
                <Pressable onPress={() => setShowApiHelp(!showApiHelp)} className="ml-2">
                  <Icon as={InfoIcon} size="md" className="text-success-400" />
                </Pressable>
              </FormControlLabel>
              <Input>
                <InputField
                  placeholder="Long-lived access token"
                  value={formData.api_key}
                  onChangeText={(text) => setFormData({ ...formData, api_key: text })}
                  autoCapitalize="none"
                  secureTextEntry={!showApiKey}
                  className="placeholder:text-typography-300"
                />
                <InputSlot className="pr-3">
                  <Pressable onPress={() => setShowApiKey(!showApiKey)}>
                    <InputIcon as={showApiKey ? EyeOff : Eye} className="text-success-500" />
                  </Pressable>
                </InputSlot>
              </Input>
            </FormControl>

            {showApiHelp && (
              <Alert className="bg-success-50">
                <AlertText className="text-success-600">
                  To get your Home Assistant API key:{'\n'}
                  1. Go to your HA profile settings{'\n'}
                  2. Scroll down to "Long-Lived Access Tokens"{'\n'}
                  3. Create a new token and copy it here
                </AlertText>
              </Alert>
            )}

            <HStack space="md" className="mt-4">
              <Button
                variant="outline"
                className="flex-1 border-success-300"
                onPress={() => router.back()}
                isDisabled={isLoading}>
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="positive"
                className="flex-1"
                onPress={handleSubmit}
                isDisabled={isLoading}>
                <ButtonText className="text-white">Add Integration</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </Card>
      </VStack>
    </ScrollView>
  );
}
