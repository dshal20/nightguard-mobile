import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const C = {
  bg: '#101018',
  surface: '#1B1B26',
  border: '#2A2A34',
  text: '#FFFFFF',
  muted: '#8B8B9D',
  primary: '#2B36CD',
};

type Props = {
  visible: boolean;
  /** Persist names via API; throw on failure so the modal can show the error. */
  onSubmit: (firstName: string, lastName: string) => Promise<void>;
};

export function ProfileCompletionModal({ visible, onSubmit }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter both first and last name.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(firstName, lastName);
      setFirstName('');
      setLastName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={() => {}}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.sub}>Add your name to continue.</Text>

          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={C.muted}
            autoCapitalize="words"
            editable={!busy}
          />

          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={C.muted}
            autoCapitalize="words"
            editable={!busy}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            onPress={submit}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <Text style={styles.btnLabel}>Continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    marginTop: 8,
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
  error: {
    fontSize: 13,
    color: '#F07A92',
    marginTop: 8,
  },
  btn: {
    minHeight: 52,
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.92,
  },
  btnLabel: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
