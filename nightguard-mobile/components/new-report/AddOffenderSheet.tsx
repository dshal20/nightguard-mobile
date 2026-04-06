import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Upload } from 'lucide-react-native';
import { useState } from 'react';

const C = {
  bg: '#101018',
  inputBg: '#1B1B26',
  border: '#525252',
  text: '#FFFFFF',
  muted: '#8B8B9D',
  placeholder: '#9A9AAC',
  accent: '#2B36CD',
  accentMuted: 'rgba(43, 54, 205, 0.2)',
  greenBg: 'rgba(117, 251, 148, 0.07)',
  greenBorder: '#75FB94',
  link: '#737BF1',
  backdrop: 'rgba(0,0,0,0.55)',
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AddOffenderSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [physicalMarkers, setPhysicalMarkers] = useState('');
  const [notes, setNotes] = useState('');

  const resetAndClose = () => {
    setFirstName('');
    setLastName('');
    setPhysicalMarkers('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
      statusBarTranslucent>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={resetAndClose} accessibilityLabel="Dismiss" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetKeyboard}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerText}>
                  <Text style={styles.title}>Offender Details</Text>
                  <Text style={styles.hint}>Provide a description of the offender</Text>
                </View>
                <Pressable style={({ pressed }) => [styles.attachBtn, pressed && styles.pressed]}>
                  <Plus size={13} color={C.text} strokeWidth={2.5} />
                  <Text style={styles.attachBtnText}>Attach Profile</Text>
                </Pressable>
              </View>

              {/* First / Last name */}
              <View style={styles.nameRow}>
                <View style={styles.nameCol}>
                  <Text style={styles.fieldLabel}>FIRST NAME *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First"
                    placeholderTextColor={C.placeholder}
                  />
                </View>
                <View style={styles.nameCol}>
                  <Text style={styles.fieldLabel}>LAST NAME *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last"
                    placeholderTextColor={C.placeholder}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>PHYSICAL MARKERS</Text>
                <TextInput
                  style={styles.textInput}
                  value={physicalMarkers}
                  onChangeText={setPhysicalMarkers}
                  placeholder="e.g. tattoo on left arm, red jacket, 6ft tall"
                  placeholderTextColor={C.placeholder}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>NOTES</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional context or history..."
                  placeholderTextColor={C.placeholder}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Upload attachments */}
              <View style={styles.uploadSection}>
                <Text style={styles.uploadSectionLabel}>Upload Attachments</Text>
                <Pressable style={({ pressed }) => [styles.uploadBox, pressed && styles.pressed]}>
                  <Upload size={54} color={C.text} strokeWidth={1.5} />
                  <Text style={styles.uploadBoxLabel}>Upload Attachments</Text>
                </Pressable>
              </View>

              <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]} onPress={resetAndClose}>
                <Text style={styles.saveBtnText}>Save Offender</Text>
              </Pressable>

              <Pressable style={styles.linkHit} onPress={() => {}} accessibilityRole="button">
                <Text style={styles.linkText}>Generate profile from description</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.backdrop,
  },
  sheetKeyboard: {
    width: '100%',
    maxHeight: '92%',
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 52,
    borderTopRightRadius: 52,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#2A2A34',
    borderBottomWidth: 0,
  },
  sheetScroll: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  hint: {
    fontSize: 10,
    fontWeight: '500',
    color: C.muted,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  fieldBlock: {
    marginBottom: 22,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  nameCol: {
    flex: 1,
  },
  textInput: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 12,
    color: C.text,
  },
  notesInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: C.accentMuted,
    borderWidth: 1,
    borderColor: C.accent,
    gap: 6,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  uploadBox: {
    marginTop: 10,
    minHeight: 116,
    borderRadius: 10,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  uploadBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
  saveBtn: {
    height: 37,
    borderRadius: 10,
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: C.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
  linkHit: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.link,
  },
  pressed: {
    opacity: 0.88,
  },
});
