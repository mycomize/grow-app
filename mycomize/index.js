import 'react-native-quick-base64';

import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;

import { install } from 'react-native-quick-crypto';
install();

import 'expo-router/entry';
