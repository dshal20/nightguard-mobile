import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Spring API base URL (no trailing slash). Resolved from `app.config.ts` → `extra` (populated from `.env`).
 *
 * Env vars (restart Expo after changes):
 * - EXPO_PUBLIC_API_BASE_URL — optional fallback for any platform (e.g. LAN URL for a physical device).
 * - EXPO_PUBLIC_API_BASE_URL_ANDROID — optional; defaults to emulator host **http://10.0.2.2:8080** if unset and no fallback.
 * - EXPO_PUBLIC_API_BASE_URL_IOS — optional; defaults to **http://localhost:8080** if unset and no fallback.
 *
 * On Android, `apiBaseUrlAndroid` (or fallback) wins over `apiBaseUrl` when both are set.
 * Same for iOS with `apiBaseUrlIos`.
 */
type ApiExtra = {
  apiBaseUrl?: string;
  apiBaseUrlAndroid?: string;
  apiBaseUrlIos?: string;
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as ApiExtra | undefined;
  const shared = extra?.apiBaseUrl ? stripTrailingSlash(extra.apiBaseUrl) : undefined;
  const android = extra?.apiBaseUrlAndroid ? stripTrailingSlash(extra.apiBaseUrlAndroid) : undefined;
  const ios = extra?.apiBaseUrlIos ? stripTrailingSlash(extra.apiBaseUrlIos) : undefined;

  if (Platform.OS === 'android') {
    return android ?? shared ?? 'http://10.0.2.2:8080';
  }
  if (Platform.OS === 'ios') {
    return ios ?? shared ?? 'http://localhost:8080';
  }
  return shared ?? 'http://localhost:8080';
}
