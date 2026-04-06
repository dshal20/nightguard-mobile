import { usePathname, useRouter } from 'expo-router';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { getMe, updateMe, type UserProfile } from '@/lib/api';
import { auth } from '@/lib/firebase';

const devSkipAuth =
  process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === '1' ||
  process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === 'true';

type AuthPhase =
  | 'initializing'
  | 'unauthenticated'
  | 'resolving_profile'
  | 'needs_profile'
  | 'ready'
  | 'profile_error';

type AuthContextValue = {
  phase: AuthPhase;
  firebaseUser: User | null;
  profile: UserProfile | null;
  profileError: string | null;
  signOut: () => Promise<void>;
  retryGetMe: () => Promise<void>;
  completeProfile: (firstName: string, lastName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function hasFullName(p: UserProfile): boolean {
  return Boolean(String(p.firstName ?? '').trim() && String(p.lastName ?? '').trim());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>('initializing');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = firebaseUser;

  const loadProfileForUser = useCallback(async (user: User) => {
    setPhase('resolving_profile');
    setProfileError(null);
    try {
      const token = await user.getIdToken();
      const p = await getMe(token);
      setProfile(p);
      if (hasFullName(p)) {
        setPhase('ready');
      } else {
        setPhase('needs_profile');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setProfile(null);
      setProfileError(message);
      setPhase('profile_error');
    }
  }, []);

  useEffect(() => {
    if (devSkipAuth) {
      setPhase('unauthenticated');
      setFirebaseUser(null);
      setProfile(null);
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setProfileError(null);
        setPhase('unauthenticated');
        return;
      }
      void loadProfileForUser(user);
    });

    return unsub;
  }, [loadProfileForUser]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    setProfileError(null);
    setFirebaseUser(null);
    setPhase('unauthenticated');
  }, []);

  const retryGetMe = useCallback(async () => {
    const user = userRef.current;
    if (!user) return;
    await loadProfileForUser(user);
  }, [loadProfileForUser]);

  const completeProfile = useCallback(async (firstName: string, lastName: string) => {
    const user = userRef.current;
    if (!user) throw new Error('Not signed in.');
    const token = await user.getIdToken();
    await updateMe(token, { firstName: firstName.trim(), lastName: lastName.trim() });
    const p = await getMe(token);
    setProfile(p);
    if (!hasFullName(p)) {
      throw new Error('Profile still missing name after update.');
    }
    setProfileError(null);
    setPhase('ready');
  }, []);

  const value = useMemo(
    () => ({
      phase,
      firebaseUser,
      profile,
      profileError,
      signOut,
      retryGetMe,
      completeProfile,
    }),
    [phase, firebaseUser, profile, profileError, signOut, retryGetMe, completeProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** Full-screen session UI + redirects. Render next to `<Stack />` inside `AuthProvider`. */
export function AuthSessionGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { phase, profileError, completeProfile, retryGetMe, signOut } = useAuth();

  useEffect(() => {
    if (devSkipAuth) return;
    if (phase === 'initializing' || phase === 'resolving_profile') return;

    if (phase === 'unauthenticated') {
      if (pathname !== '/auth' && pathname !== '/') {
        router.replace('/auth');
      }
    }

    if (phase === 'ready') {
      if (pathname === '/auth') {
        router.replace('/home');
      }
    }
  }, [phase, pathname, router]);

  if (devSkipAuth) {
    return null;
  }

  if (phase === 'initializing' || phase === 'resolving_profile') {
    return (
      <View style={gateStyles.overlay} pointerEvents="auto">
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (phase === 'profile_error') {
    return (
      <View style={gateStyles.overlay} pointerEvents="auto">
        <Text style={gateStyles.errorTitle}>Couldn’t load your profile</Text>
        <Text style={gateStyles.errorBody}>{profileError ?? 'Unknown error'}</Text>
        <Text style={gateStyles.errorHint}>
          Check your connection and API URL. Retry fetches your profile again; Sign out returns you to
          the login screen.
        </Text>
        <Pressable style={gateStyles.primaryBtn} onPress={() => void retryGetMe()}>
          <Text style={gateStyles.primaryLabel}>Retry</Text>
        </Pressable>
        <Pressable
          style={gateStyles.secondaryBtn}
          onPress={() => {
            void signOut();
            router.replace('/auth');
          }}>
          <Text style={gateStyles.secondaryLabel}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ProfileCompletionModal
      visible={phase === 'needs_profile'}
      onSubmit={(first, last) => completeProfile(first, last)}
    />
  );
}

const gateStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#101018',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 9999,
    elevation: 9999,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: '#F07A92',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorHint: {
    fontSize: 12,
    color: '#8B8B9D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  primaryBtn: {
    minWidth: 200,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2B36CD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    minWidth: 200,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: '#8B8B9D',
    fontSize: 15,
    fontWeight: '600',
  },
});
