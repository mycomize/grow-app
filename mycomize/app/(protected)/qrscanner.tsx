import React, { useState, useEffect } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { StatusBar } from '~/components/ui/status-bar';
import { ArrowLeft, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { StyleSheet, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const params = useLocalSearchParams<{ returnTo?: string }>();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (!scanned) {
      setScanned(true);

      // Store the scanned data temporarily and navigate back
      try {
        await AsyncStorage.setItem('qr_scanned_data', result.data);
      } catch (error) {
        console.error('Error storing scanned data:', error);
      }

      router.back();
    }
  };

  const handleClose = () => {
    router.back();
  };

  // If we don't have permission, show permission screen
  if (!permission?.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background-0">
        <StatusBar />

        {/* Header */}
        <VStack className="px-4 py-2">
          <HStack className="items-center justify-between">
            <Button variant="outline" size="sm" onPress={handleClose}>
              <ButtonIcon as={ArrowLeft} />
            </Button>
            <Text className="text-lg font-semibold">Camera Permission</Text>
            <Button variant="outline" size="sm" onPress={handleClose}>
              <ButtonIcon as={X} />
            </Button>
          </HStack>
        </VStack>

        {/* Permission Content */}
        <VStack className="flex-1 items-center justify-center px-4">
          <VStack space="lg" className="max-w-sm">
            <Text className="text-center text-lg font-semibold">Camera Access Required</Text>
            <Text className="text-center text-typography-500">
              Camera permission is required to scan QR codes. Please grant access to continue.
            </Text>
            <Button onPress={requestPermission} className="mt-4">
              <ButtonText>Grant Camera Permission</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar />

      {/* Camera View - Full Screen */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay UI */}
      <VStack className="pointer-events-none absolute inset-0">
        {/* Header */}
        <VStack className="pointer-events-auto px-4 py-2 pt-12">
          <HStack className="items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onPress={handleClose}
              className="border-white bg-black/30">
              <ButtonIcon as={ArrowLeft} className="text-white" />
            </Button>
            <Text className="text-lg font-semibold text-white">Scan QR Code</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={handleClose}
              className="border-white bg-black/30">
              <ButtonIcon as={X} className="text-white" />
            </Button>
          </HStack>
        </VStack>

        {/* Scanning Overlay */}
        <VStack className="flex-1 items-center justify-center">
          {/* QR Code scanning frame */}
          <VStack className="h-64 w-64 rounded-lg border-2 border-white opacity-80" />
          <Text className="mt-6 text-center text-lg text-white">
            Position the QR code within the frame
          </Text>
        </VStack>

        {/* Bottom spacing */}
        <VStack className="h-20" />
      </VStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
