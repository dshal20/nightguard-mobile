import { Redirect } from 'expo-router';

const devSkipAuth =
  process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === '1' ||
  process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === 'true';

/**
 * Dev server / QR opens `/` by default.
 * - Normal: send users to `/auth`.
 * - Dev: set `EXPO_PUBLIC_DEV_SKIP_AUTH=true` in `.env`, then stop Metro and run `npx expo start -c`
 *   (reload/`r` does not re-read `.env`; the value is baked into the bundle).
 * - If it still skips auth, check the variable is not set in your OS/shell (Windows: System env or `$env:EXPO_PUBLIC_DEV_SKIP_AUTH`).
 */
export default function Index() {
  return <Redirect href={devSkipAuth ? '/home' : '/auth'} />;
}
