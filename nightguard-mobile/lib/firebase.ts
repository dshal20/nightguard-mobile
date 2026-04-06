/**
 * Firebase Web SDK config is supplied at build/start time:
 *
 * Set these in `.env` (restart Expo after changes). They are copied into `app.config.ts` → `extra`
 * and read here via `expo-constants`.
 *
 * - EXPO_PUBLIC_FIREBASE_API_KEY
 * - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - EXPO_PUBLIC_FIREBASE_PROJECT_ID
 * - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - EXPO_PUBLIC_FIREBASE_APP_ID
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';

type FirebaseExtra = {
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
};

function getFirebaseOptions(): FirebaseOptions {
  const extra = Constants.expoConfig?.extra as FirebaseExtra | undefined;
  const apiKey = extra?.firebaseApiKey;
  const authDomain = extra?.firebaseAuthDomain;
  const projectId = extra?.firebaseProjectId;
  const storageBucket = extra?.firebaseStorageBucket;
  const messagingSenderId = extra?.firebaseMessagingSenderId;
  const appId = extra?.firebaseAppId;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error(
      'Firebase config missing in app extra. Set EXPO_PUBLIC_FIREBASE_* in `.env` and restart Expo (see comment at top of lib/firebase.ts).',
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

function getOrInitApp(): FirebaseApp {
  const options = getFirebaseOptions();
  if (getApps().length === 0) {
    return initializeApp(options);
  }
  return getApp();
}

const app = getOrInitApp();

function getOrInitAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: unknown) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'auth/already-initialized'
    ) {
      return getAuth(app);
    }
    throw e;
  }
}

export const auth = getOrInitAuth();
