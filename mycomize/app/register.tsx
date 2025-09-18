import { useState } from 'react';
import { View } from 'react-native';
import { ScrollView } from '@/components/ui/scroll-view';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from '~/components/ui/checkbox';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { useRouter } from 'expo-router';
import { LockKeyhole, Fingerprint, UserPlus, LogIn, Check } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useRegister } from '~/lib/stores/authStore';
import OpenTekLogo from '~/assets/opentek-logo.svg';
import type { AuthPreferences } from '~/lib/auth/authPreferences';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';


export default function SignUpScreen() {
  const router = useRouter();
  const { showError } = useUnifiedToast();
  const register = useRegister();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auth preferences state
  const [authPreferences, setAuthPreferences] = useState<AuthPreferences>({
    enableDbEncryption: false,
    enableBiometrics: false,
  });

  const handleConfirmPassword = (text: string) => {
    setConfirmPassword(text);

    if (text === password) {
      setPasswordsMatch(true);
    } else {
      setPasswordsMatch(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);

    try {
      // The unified register function handles registration and redirect
      const result = await register(username, password, authPreferences);

      if (!result.success) {
        showError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if basic fields are valid to show preference checkboxes
  const basicFieldsValid = username.trim().length >= 3 && 
                           password.length >= 6 && 
                           confirmPassword.length > 0 && 
                           passwordsMatch;

  return (
    <Box className="h-full w-full flex-1 bg-background-50">
      <ScrollView>
        <View className="mt-36 flex items-center gap-4">
          <VStack space="xl">
            <Center>
              <OpenTekLogo width={111} height={131} />
            </Center>
            <FormControl className="mt-16 rounded-lg border border-outline-300 p-4">
              <VStack space="xl">
                <Heading className="text-typography-900">Sign Up</Heading>
                <VStack space="xs">
                  <Text className="text-typography-700">Username</Text>
                  <Input className="min-w-[250px]">
                    <InputField
                      type="text"
                      autoCapitalize="none"
                      autoComplete="username"
                      autoCorrect={false}
                      autoFocus={true}
                      onChangeText={setUsername}
                      value={username}
                      onFocus={() => setConfirmFocused(false)}
                    />
                  </Input>
                </VStack>
                <VStack space="xs">
                  <Text className="text-typography-700">Password</Text>
                  <PasswordInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    onFocus={() => setConfirmFocused(false)}
                    className="min-w-[250px]"
                  />
                </VStack>
                <VStack space="xs">
                  <Text className="text-typography-700">Confirm Password</Text>
                  <PasswordInput
                    value={confirmPassword}
                    onChangeText={handleConfirmPassword}
                    placeholder="Confirm password"
                    isInvalid={!passwordsMatch && confirmFocused}
                    onFocus={() => setConfirmFocused(true)}
                    className="min-w-[250px]"
                  />
                </VStack>
                
                {/* Auth Preferences - shown when basic fields are valid */}
                {basicFieldsValid && (
                  <VStack space="md" className="mt-1 p-0 bg-background-50 rounded-lg">
                    <HStack space="sm" className="items-center mb-1">
                      <MaterialIcons name="security" size={20} color="#7c7c7c" />
                      <Text className="text-typography-600 ">Security Preferences</Text>
                    </HStack>
                    <Checkbox 
                      value="enableDbEncryption"
                      isChecked={authPreferences.enableDbEncryption}
                      onChange={(isChecked: boolean) => 
                        setAuthPreferences(prev => ({ ...prev, enableDbEncryption: isChecked }))
                      }
                      className="gap-2"
                      size="md"
                    >
                      <CheckboxIndicator>
                        <CheckboxIcon as={Check} />
                      </CheckboxIndicator>
                      <CheckboxLabel>
                        <VStack space="xs">
                          <HStack className="items-center gap-1">
                          <Text className="text-typography-600 ">Enable Encryption</Text></HStack>
                        </VStack>
                      </CheckboxLabel>
                    </Checkbox>

                    <Checkbox 
                      value="enableBiometrics"
                      isChecked={authPreferences.enableBiometrics}
                      onChange={(isChecked: boolean) => 
                        setAuthPreferences(prev => ({ ...prev, enableBiometrics: isChecked }))
                      }
                      className="gap-2"
                      size="md"
                    >
                      <CheckboxIndicator>
                        <CheckboxIcon as={Check} />
                      </CheckboxIndicator>
                      <CheckboxLabel>
                        <VStack space="xs">
                          <HStack className="items-center gap-1">
                          <Text className="text-typography-600 ">Enable Biometrics</Text></HStack>
                        </VStack>
                      </CheckboxLabel>
                    </Checkbox>
                  </VStack>
                )}

                <Button
                  className="mx-auto"
                  action="positive"
                  onPress={handleSignUp}
                  isDisabled={isLoading || !passwordsMatch || username.trim().length < 3 || password.length < 6}>
                  <ButtonText className="text-white">Sign Up</ButtonText>
                  <ButtonIcon className="text-white" as={UserPlus} size="md" />
                </Button>
              </VStack>
            </FormControl>
          </VStack>
          <HStack className="my-8 items-center gap-4">
            <Text>Already have an account?</Text>
            <Button onPress={() => router.replace('/login')} variant="solid" action="positive">
              <ButtonText className="text-white">Login</ButtonText>
              <ButtonIcon className="text-white" as={LogIn} size="md" />
            </Button>
          </HStack>
        </View>
      </ScrollView>
    </Box>
  );
}
