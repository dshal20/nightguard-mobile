import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signInWithEmailPassword, signUpWithEmailPassword } from '@/lib/auth-actions';

/** NightGuard dashboard-adjacent palette — layout is mobile-native, not web density */
const C = {
  bg: '#101018',
  surface: '#1B1B26',
  border: '#2A2A34',
  text: '#FFFFFF',
  textMuted: '#8B8B9D',
  textLabel: '#A4A4B5',
  primary: '#2B36CD',
  primaryMuted: 'rgba(43, 54, 205, 0.28)',
  segmentInactive: '#131319',
};

const MIN_TAP = 44;
const INPUT_MIN = 52;

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <Image
              source={require('@/assets/images/NigtGuardLogo.png')}
              style={styles.logo}
              contentFit="contain"
              contentPosition="top left"
              accessibilityLabel="NightGuard"
            />
          </View>

          <View style={styles.segmentWrap} accessibilityRole="tablist">
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'login' }}
              onPress={() => setMode('login')}
              style={({ pressed }) => [
                styles.segment,
                mode === 'login' && styles.segmentActive,
                pressed && styles.segmentPressed,
              ]}>
              <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>
                Log in
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'signup' }}
              onPress={() => setMode('signup')}
              style={({ pressed }) => [
                styles.segment,
                mode === 'signup' && styles.segmentActive,
                pressed && styles.segmentPressed,
              ]}>
              <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>
                Sign up
              </Text>
            </Pressable>
          </View>

          {mode === 'login' ? <LoginForm /> : <SignupForm />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailPassword(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formBlock}>
      <Text style={styles.formTitle}>Sign in</Text>
      <Text style={styles.formSubtitle}>Use your work email and password.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@venue.com"
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!loading}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={C.textMuted}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          editable={!loading}
        />
      </View>

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (loading || pressed) && styles.primaryButtonBusy,
          loading && styles.primaryButtonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Log in"
        onPress={() => void submit()}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={C.text} />
        ) : (
          <Text style={styles.primaryLabel}>Log in</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryHit}
        accessibilityRole="button"
        accessibilityLabel="Forgot password">
        <Text style={styles.secondaryLink}>Forgot password?</Text>
      </Pressable>
    </View>
  );
}

function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmailPassword(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formBlock}>
      <Text style={styles.formTitle}>Create account</Text>
      <Text style={styles.formSubtitle}>You’ll use this to sign in on this device.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Alex Rivera"
          placeholderTextColor={C.textMuted}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          editable={!loading}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@venue.com"
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!loading}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor={C.textMuted}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          editable={!loading}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat password"
          placeholderTextColor={C.textMuted}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          editable={!loading}
        />
      </View>

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (loading || pressed) && styles.primaryButtonBusy,
          loading && styles.primaryButtonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Create account"
        onPress={() => void submit()}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={C.text} />
        ) : (
          <Text style={styles.primaryLabel}>Create account</Text>
        )}
      </Pressable>

      <Text style={styles.legalHint}>By continuing you agree to your organization’s policies.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'stretch',
  },
  hero: {
    width: '100%',
    marginTop: 8,
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  logo: {
    width: 280,
    height: 61,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: C.segmentInactive,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    marginBottom: 28,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TAP,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: C.primaryMuted,
    borderWidth: 1,
    borderColor: C.primary,
  },
  segmentPressed: {
    opacity: 0.85,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textMuted,
  },
  segmentTextActive: {
    color: C.text,
  },
  formBlock: {
    gap: 0,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: C.textMuted,
    marginBottom: 28,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textLabel,
    marginBottom: 8,
  },
  input: {
    minHeight: INPUT_MIN,
    paddingHorizontal: 16,
    fontSize: 17,
    color: C.text,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  formError: {
    fontSize: 14,
    lineHeight: 20,
    color: '#F07A92',
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 52,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D4AE0',
  },
  primaryButtonBusy: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryPressed: {
    opacity: 0.92,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  secondaryHit: {
    minHeight: MIN_TAP,
    marginTop: 12,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryLink: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textMuted,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(139, 139, 157, 0.5)',
  },
  legalHint: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 18,
    color: C.textMuted,
    textAlign: 'center',
  },
});
