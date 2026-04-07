import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { getMe, getVenues, type UserProfile, type Venue } from '@/lib/api';

function displayName(p: UserProfile | null): string {
  if (!p) return '—';
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (p.email?.trim()) return p.email.trim();
  return '—';
}

function displayRole(role: string | undefined): string {
  if (!role) return '—';
  const u = role.toUpperCase();
  if (u === 'ADMIN') return 'Admin';
  if (u === 'USER') return 'User';
  return role;
}

function venueCityState(v: Venue): string {
  const parts = [v.city, v.state].filter(Boolean);
  return parts.length ? `, ${parts.join(', ')}` : '';
}

/** No selected-venue context yet: derive a single summary line from GET /venues. */
function displayVenues(venues: Venue[] | null): string {
  if (venues === null) return '—';
  if (venues.length === 0) return 'No venue';
  const first = venues[0];
  const base = (first.name?.trim() || 'Unnamed venue') + venueCityState(first);
  if (venues.length === 1) return base;
  return `${base} + ${venues.length - 1} more`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, firebaseUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) {
      setLoading(false);
      setProfile(null);
      setVenues(null);
      setError('Not signed in.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const [me, list] = await Promise.all([getMe(token), getVenues(token)]);
      setProfile(me);
      setVenues(list);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setProfile(null);
      setVenues(null);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
              onPress={() => void load()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading settings">
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error ? (
          <View style={styles.info}>
            <Text style={[styles.label, styles.labelFirst]}>Name</Text>
            <Text style={styles.value}>{displayName(profile)}</Text>

            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{displayRole(profile?.role)}</Text>

            <Text style={styles.label}>Venue</Text>
            <Text style={styles.value}>{displayVenues(venues)}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
          onPress={() => void onSignOut()}
          accessibilityRole="button"
          accessibilityLabel="Log out">
          <Text style={styles.signOutLabel}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#101018',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A34',
  },
  back: {
    color: '#9D9FCF',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 72,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    minWidth: 72,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingWrap: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  errorBlock: {
    marginBottom: 24,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#F07A92',
    marginBottom: 10,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(43, 54, 205, 0.2)',
    borderWidth: 1,
    borderColor: '#2B36CD',
  },
  retryLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  info: {
    marginBottom: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B8B9D',
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  labelFirst: {
    marginTop: 0,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  signOutBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 72, 104, 0.16)',
    borderWidth: 1,
    borderColor: '#EB4869',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pressed: {
    opacity: 0.9,
  },
  signOutLabel: {
    color: '#E84868',
    fontSize: 16,
    fontWeight: '700',
  },
});
