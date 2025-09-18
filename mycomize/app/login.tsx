import { useState, useEffect } from 'react';
import { View, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { ScrollView } from '@/components/ui/scroll-view';
import { Box } from '@/components/ui/box';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { HStack } from '@/components/ui/hstack';
import { EyeIcon, EyeOffIcon, UserPlus, LogIn, Fingerprint, ArrowLeft, User } from 'lucide-react-native';
import OpenTekLogo from '@/assets/opentek-logo.svg';
import { useSignIn, useSignInWithBiometrics } from '~/lib/stores/authStore';
import { getBiometricPromptText, getBiometricCapabilities } from '~/lib/auth/biometricAuth';
import { getUserAuthPreferences } from '~/lib/auth/authPreferences';
import { getUserByUsername, getAllUsers } from '~/lib/db/authDb';
import { useDatabaseReady } from '~/lib/db/useDatabaseReady';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const signInWithBiometrics = useSignInWithBiometrics();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Biometric authentication state
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const [biometricPromptText, setBiometricPromptText] = useState('');
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  // User list state
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; username: string }>>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  // Wait for database to be ready
  const { isReady: isDatabaseReady, error: databaseError } = useDatabaseReady();

  const handleShowState = () => {
    setShowPassword((show) => {
      return !show;
    });
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      // The unified signIn function handles both authentication and encryption checking
      // It will automatically redirect to encryption-setup or home as needed
      const result = await signIn(username, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Login failed. Please try again.');
      }
      // If successful, the signIn function handles navigation automatically
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!username.trim()) {
      setErrorMessage('Please enter your username first');
      return;
    }

    setErrorMessage(null);
    setIsBiometricLoading(true);
    try {
      const result = await signInWithBiometrics(username.trim());
      if (!result.success) {
        setErrorMessage(result.error || 'Biometric authentication failed. Please try again.');
      }
      // If successful, the signInWithBiometrics function handles navigation automatically
    } catch (error) {
      console.error('Biometric login error:', error);
      setErrorMessage('An unexpected error occurred during biometric authentication.');
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleUserSelection = async (user: { id: number; username: string }) => {
    setErrorMessage(null);
    setSelectedUser(user);
    setUsername(user.username);

    try {
      // Check if user has biometrics enabled and device supports biometrics
      const userPreferences = await getUserAuthPreferences(String(user.id));
      const capabilities = await getBiometricCapabilities();

      if (userPreferences.enableBiometrics && capabilities.isAvailable) {
        // Trigger biometric authentication immediately
        setIsBiometricLoading(true);
        const result = await signInWithBiometrics(user.username);
        if (!result.success) {
          // If biometric fails, show password form
          setErrorMessage(result.error || 'Biometric authentication failed. Please enter your password.');
          setShowUserList(false);
          setShowManualEntry(true);
        }
        setIsBiometricLoading(false);
      } else {
        // Show password form
        setShowUserList(false);
        setShowManualEntry(true);
      }
    } catch (error) {
      console.error('Error during user selection:', error);
      setErrorMessage('An error occurred. Please enter your password.');
      setShowUserList(false);
      setShowManualEntry(true);
    }
  };

  const handleManualEntryToggle = () => {
    setShowManualEntry(true);
    setShowUserList(false);
    setSelectedUser(null);
    setUsername('');
    setPassword('');
    setErrorMessage(null);
  };

  const handleBackToUserList = () => {
    if (availableUsers.length > 0) {
      setShowUserList(true);
      setShowManualEntry(false);
      setSelectedUser(null);
      setUsername('');
      setPassword('');
      setErrorMessage(null);
    }
  };

  // Load users once database is ready
  useEffect(() => {
    const loadUsers = async () => {
      if (!isDatabaseReady) return;
      
      setIsLoadingUsers(true);
      try {
        const users = await getAllUsers();
        setAvailableUsers(users);
        setShowUserList(users.length > 0);
        setShowManualEntry(users.length === 0);
      } catch (error) {
        console.error('Error loading users:', error);
        setShowUserList(false);
        setShowManualEntry(true);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (databaseError) {
      console.error('Database initialization error:', databaseError);
      setShowUserList(false);
      setShowManualEntry(true);
      setIsLoadingUsers(false);
      return;
    }

    loadUsers();
  }, [isDatabaseReady, databaseError]);

  // Check if biometric option should be shown (for manual entry mode)
  useEffect(() => {
    if (!showManualEntry) return;

    const checkBiometricAvailability = async () => {
      if (!username.trim()) {
        setShowBiometricOption(false);
        return;
      }

      try {
        // Check if device supports biometrics
        const capabilities = await getBiometricCapabilities();
        if (!capabilities.isAvailable) {
          setShowBiometricOption(false);
          return;
        }

        // Check if user exists and has biometrics enabled
        const dbUser = await getUserByUsername(username.trim());
        if (!dbUser) {
          setShowBiometricOption(false);
          return;
        }

        const userPreferences = await getUserAuthPreferences(String(dbUser.id));
        if (userPreferences.enableBiometrics) {
          setShowBiometricOption(true);
          const promptText = await getBiometricPromptText();
          setBiometricPromptText(promptText);
        } else {
          setShowBiometricOption(false);
        }
      } catch (error) {
        console.error('Error checking biometric availability:', error);
        setShowBiometricOption(false);
      }
    };

    // Debounce the check to avoid too many calls while typing
    const timeoutId = setTimeout(checkBiometricAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [username, showManualEntry]);

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View className="pt-36 flex items-center gap-4 bg-background-50 w-full h-full">
          <VStack space="xl" className="w-full h-full justify-center">
            <Center>
              <Heading size="3xl" className="mb-10">opentek</Heading>
              <OpenTekLogo width={111} height={131} />
            </Center>
            {errorMessage && <Text className="mt-8 text-center text-error-500">{errorMessage}</Text>}
            <FormControl className=" rounded-lg p-4 w-9/12 mx-auto mb-40">
              <VStack space="xl" className="w-full">
                {/* Loading State */}
                {isLoadingUsers && (
                  <>
                    <Card className="min-h-[400px] bg-background-50">
                      <Center className="flex-1">
                        <Text className="text-typography-600">Loading users...</Text>
                      </Center>
                    </Card>
                  </>
                )}
                
                {/* Database Error State */}
                {databaseError && !isLoadingUsers && (
                  <>
                    <Card className="min-h-[400px] bg-background-50">
                      <Center className="flex-1">
                        <VStack space="md" className="items-center">
                          <Text className="text-error-500">Database initialization failed</Text>
                          <Text className="text-typography-600 text-center">Please restart the app</Text>
                        </VStack>
                      </Center>
                    </Card>
                  </>
                )}

                {/* User List View */}
                {showUserList && !isLoadingUsers && !databaseError && (
                  <>
                    <Card className="min-h-[400px] bg-background-50">
                      <ScrollView className="flex-1">
                        <VStack space="md">
                          {availableUsers.map((user) => (
                            <TouchableOpacity
                              key={user.id}
                              onPress={() => handleUserSelection(user)}
                              disabled={isBiometricLoading}
                            >
                              <Card className="rounded-lg border border-outline-200 bg-background-0 min-w-[250px]">
                                <HStack space="md" className="items-center">
                                  <Box className="rounded-full bg-primary-100 p-2">
                                    <User size={20} className="text-primary-700" />
                                  </Box>
                                  <VStack className="flex-1">
                                    <Text className="text-typography-900 font-medium">{user.username}</Text>
                                  </VStack>
                                  {isBiometricLoading && selectedUser?.id === user.id && (
                                    <Icon as={Fingerprint} size="xl" className="text-green-500" />
                                  )}
                                </HStack>
                              </Card>
                            </TouchableOpacity>
                          ))}
                          
                          {/* Create New Account Option */}
                          <TouchableOpacity
                            onPress={() => router.replace('/register')}
                            disabled={isBiometricLoading}
                          >
                            <Card className="rounded-lg bg-background-50 ">
                              <HStack space="md" className="items-center ">
                                <Icon as={UserPlus} size="xl" className="ml-8 text-typography-700" />
                                <VStack className="flex-1">
                                  <Text className="text-primary-700 font-medium">Create New Account</Text>
                                </VStack>
                              </HStack>
                            </Card>
                          </TouchableOpacity>
                        </VStack>
                      </ScrollView>
                    </Card>
                  </>
                )}

                {/* Manual Entry Form */}
                {showManualEntry && !isLoadingUsers && !databaseError && (
                  <>
                    <HStack className="items-center justify-between">
                      <Heading className="text-typography-900">Log In</Heading>
                      {availableUsers.length > 0 && (
                        <TouchableOpacity onPress={handleBackToUserList}>
                          <HStack space="xs" className="items-center">
                            <ArrowLeft size={16} className="text-primary-700" color="white"/>
                            <Text className="text-primary-700 text-sm">Back to users</Text>
                          </HStack>
                        </TouchableOpacity>
                      )}
                    </HStack>
                    
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
                        />
                      </Input>
                    </VStack>
                    
                    <VStack space="xs">
                      <Text className="text-typography-700">Password</Text>
                      <Input className="text-center">
                        <InputField
                          type={showPassword ? 'text' : 'password'}
                          autoCapitalize="none"
                          onChangeText={setPassword}
                          value={password}
                        />
                        <InputSlot className="pr-3" onPress={handleShowState}>
                          <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} size="lg" />
                        </InputSlot>
                      </Input>
                    </VStack>
                    
                    <Button
                      className="mx-auto mt-2"
                      action="positive"
                      onPress={handleLogin}
                      isDisabled={isLoading || isBiometricLoading}>
                      <ButtonText className="text-white">Log In</ButtonText>
                      <ButtonIcon className="text-white" as={LogIn} size="md" />
                    </Button>
                  </>
                )}
              </VStack>
            </FormControl>
          </VStack>
          <HStack className="my-8 items-center gap-4">
            <Text>Need an account?</Text>
            <Button onPress={() => router.replace('/register')} variant="solid" action="positive">
              <ButtonText className="text-white">Sign Up</ButtonText>
              <ButtonIcon className="text-white" as={UserPlus} size="md" />
            </Button>
          </HStack>
        </View>
    </TouchableWithoutFeedback>
  );
}
