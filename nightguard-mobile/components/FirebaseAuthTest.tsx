import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getMe, type UserProfile } from '@/lib/api';
import { auth } from '@/lib/firebase';

const C = {
  border: '#2A2A34',
  surface: '#1B1B26',
  text: '#FFFFFF',
  muted: '#8B8B9D',
  primary: '#2B36CD',
};

function profileSummary(p: UserProfile): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  const lines = [
    p.id != null ? `id: ${p.id}` : null,
    p.email != null ? `email: ${p.email}` : null,
    name ? `name: ${name}` : null,
    p.role != null ? `role: ${p.role}` : null,
    p.phoneNumber != null ? `phone: ${p.phoneNumber}` : null,
  ].filter(Boolean) as string[];
  return lines.length > 0 ? lines.join('\n') : JSON.stringify(p);
}

/**
 * Dev-only: Firebase sign-in then GET /users/me with `Bearer` ID token (Phase 2).
 */
export function FirebaseAuthTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastProfile, setLastProfile] = useState<string | null>(null);

  const onFirebaseFailure = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    setLastError(message);
    setLastProfile(null);
    Alert.alert('Firebase error', message);
  };

  const afterFirebaseAuth = async (cred: UserCredential) => {
    setLastError(null);
    const token = await cred.user.getIdToken();
    try {
      const profile = await getMe(token);
      const raw = JSON.stringify(profile, null, 2);
      setLastProfile(raw.length > 800 ? `${raw.slice(0, 800)}…` : raw);
      Alert.alert(
        'Signed in + /users/me',
        `uid: ${cred.user.uid}\nfirebase email: ${cred.user.email ?? '(none)'}\n\n${profileSummary(profile)}`,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setLastProfile(null);
      setLastError(message);
      Alert.alert('/users/me failed', message);
    }
  };

  const signIn = async () => {
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await afterFirebaseAuth(cred);
    } catch (e) {
      onFirebaseFailure(e);
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await afterFirebaseAuth(cred);
    } catch (e) {
      onFirebaseFailure(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Firebase test (dev only)</Text>
      <Text style={styles.hint}>
        Sign in → Firebase → GET /users/me with Bearer ID token (see lib/config.ts for base URL).
      </Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="email"
        placeholderTextColor={C.muted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="password"
        placeholderTextColor={C.muted}
        secureTextEntry
      />

      {busy ? <ActivityIndicator color={C.text} style={styles.spinner} /> : null}

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={signIn}
          disabled={busy}>
          <Text style={styles.btnLabel}>Sign in</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={signUp}
          disabled={busy}>
          <Text style={styles.btnLabel}>Create user</Text>
        </Pressable>
      </View>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
      {lastProfile ? (
        <Text style={styles.profileDump} selectable>
          {lastProfile}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  hint: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 4,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    color: C.text,
    fontSize: 16,
  },
  spinner: {
    alignSelf: 'center',
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  btnLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    fontSize: 12,
    color: '#F07A92',
  },
  profileDump: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: C.muted,
    marginTop: 4,
  },
});
