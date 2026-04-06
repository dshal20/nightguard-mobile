import { Image } from 'expo-image';
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
import { Home, Info, Plus, Settings, User, X } from 'lucide-react-native';
import { useState } from 'react';

import { AddOffenderSheet } from '@/components/new-report/AddOffenderSheet';

const C = {
  bg: '#101018',
  surface: '#11111B',
  inputBg: '#1B1B26',
  border: '#525252',
  borderNav: '#2A2A34',
  text: '#FFFFFF',
  textTitle: '#E2E2E2',
  muted: '#8B8B9D',
  accent: '#2B36CD',
  accentMuted: 'rgba(43, 54, 205, 0.2)',
  highBg: 'rgba(232, 72, 104, 0.16)',
  highBorder: '#EB4869',
  highText: '#E84868',
  greenBg: 'rgba(117, 251, 148, 0.07)',
  greenBorder: '#75FB94',
  homeTint: '#9D9FCF',
};

const INCIDENT_TYPE_PLACEHOLDER = 'Select type...';

const INCIDENT_TYPES = [
  'Verbal Harassment',
  'Sexual Harassment',
  'Physical Assault',
  'Threat',
  'Stalking',
  'Theft',
  'Drug Related',
  'Trespassing',
  'Disorderly Conduct',
  'Vandalism',
  'Other',
] as const;

type IncidentType = (typeof INCIDENT_TYPES)[number];

type Severity = 'high' | 'medium' | 'low';

const SEVERITIES: { key: Severity; label: string }[] = [
  { key: 'low', label: 'LOW' },
  { key: 'medium', label: 'MEDIUM' },
  { key: 'high', label: 'HIGH' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function NewReportModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity>('high');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [addOffenderOpen, setAddOffenderOpen] = useState(false);

  const resetAndClose = () => {
    setIncidentType(null);
    setSeverity('high');
    setTitle('');
    setDescription('');
    setTypePickerOpen(false);
    setAddOffenderOpen(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={resetAndClose}>
      <AddOffenderSheet visible={addOffenderOpen} onClose={() => setAddOffenderOpen(false)} />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>
            {/* Top bar */}
            <View style={styles.topRow}>
              <Image
                source={require('@/assets/images/NigtGuardLogo.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <View style={styles.topActions}>
                <Pressable
                  onPress={resetAndClose}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Close new report">
                  <X size={20} color={C.text} />
                </Pressable>
                <View style={styles.newReportPill}>
                  <Plus size={13} color={C.text} strokeWidth={2.5} />
                  <Text style={styles.newReportPillText}>New Report</Text>
                </View>
              </View>
            </View>

            <Text style={styles.screenTitle}>Create New Incident Report</Text>

            {/* Incident type */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Incident Type</Text>
              <Text style={styles.hint}>Select the category of incident</Text>
              <Pressable
                onPress={() => setTypePickerOpen((o) => !o)}
                style={({ pressed }) => [
                  styles.inputBox,
                  styles.typeSelectBox,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[styles.inputText, incidentType === null && styles.inputTextPlaceholder]}>
                  {incidentType ?? INCIDENT_TYPE_PLACEHOLDER}
                </Text>
              </Pressable>
              {typePickerOpen ? (
                <View style={styles.pickerList}>
                  <Pressable
                    onPress={() => {
                      setIncidentType(null);
                      setTypePickerOpen(false);
                    }}
                    style={[styles.pickerItem, incidentType === null && styles.pickerItemRowSelected]}>
                    <Text
                      style={[
                        styles.pickerItemText,
                        incidentType === null && styles.pickerItemActive,
                      ]}>
                      {INCIDENT_TYPE_PLACEHOLDER}
                    </Text>
                  </Pressable>
                  {INCIDENT_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        setIncidentType(t);
                        setTypePickerOpen(false);
                      }}
                      style={[styles.pickerItem, incidentType === t && styles.pickerItemRowSelected]}>
                      <Text
                        style={[styles.pickerItemText, incidentType === t && styles.pickerItemActive]}>
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Severity */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Severity Level</Text>
              <View style={styles.severityRow}>
                {SEVERITIES.map((s) => {
                  const active = severity === s.key;
                  return (
                    <Pressable
                      key={s.key}
                      onPress={() => setSeverity(s.key)}
                      style={[
                        styles.severityChip,
                        s.key === 'high' && active && styles.severityHighActive,
                        s.key === 'medium' && active && styles.severityMedActive,
                        s.key === 'low' && active && styles.severityLowActive,
                        !active && styles.severityInactive,
                      ]}>
                      <Text
                        style={[
                          styles.severityChipText,
                          s.key === 'high' && active && styles.severityHighText,
                          active && s.key !== 'high' && styles.severityMedLowText,
                          !active && styles.severityInactiveText,
                        ]}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Title */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Report Title</Text>
              <Text style={styles.hint}>Enter brief title of report</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Patron reported Harassment"
                placeholderTextColor={C.muted}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Report Description</Text>
              <Text style={styles.hint}>Enter a description of the report</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what happened…"
                placeholderTextColor={C.muted}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Offender */}
            <View style={styles.fieldBlock}>
              <View style={styles.offenderHeader}>
                <View style={styles.offenderTitles}>
                  <Text style={styles.label}>Offender Details</Text>
                  <Text style={styles.hint}>Provide a description of the offender</Text>
                </View>
                <Pressable style={({ pressed }) => [styles.attachBtn, pressed && styles.pressed]}>
                  <Plus size={13} color={C.text} strokeWidth={2.5} />
                  <Text style={styles.attachBtnText}>Attach Profile</Text>
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addOffenderBtn, pressed && styles.pressed]}
                onPress={() => setAddOffenderOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Add new offender">
                <Plus size={22} color={C.text} strokeWidth={2.5} />
                <Text style={styles.addOffenderText}>Add New Offender</Text>
              </Pressable>
            </View>

            {/* Submit (design implied flow — primary action) */}
            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
              onPress={resetAndClose}
              accessibilityRole="button"
              accessibilityLabel="Submit report">
              <Text style={styles.submitBtnText}>Submit report</Text>
            </Pressable>
          </ScrollView>

          {/* Bottom nav (visual match to dashboard) */}
          <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Pressable
              style={styles.navIconWrap}
              onPress={resetAndClose}
              accessibilityRole="button"
              accessibilityLabel="Back to dashboard">
              <Home color={C.homeTint} size={24} />
            </Pressable>
            <View style={styles.navIconWrap}>
              <Info color={C.text} size={24} />
            </View>
            <View style={styles.navIconWrap}>
              <View style={styles.bottomCenterBtn}>
                <Plus size={25} color={C.text} strokeWidth={2.5} />
              </View>
            </View>
            <View style={styles.navIconWrap}>
              <User color={C.text} size={24} />
            </View>
            <View style={styles.navIconWrap}>
              <Settings color={C.text} size={24} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 255,
    height: 46,
    flexShrink: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.borderNav,
  },
  newReportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: C.accentMuted,
    borderWidth: 1,
    borderColor: C.accent,
    gap: 8,
  },
  newReportPillText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.textTitle,
    lineHeight: 32,
    marginBottom: 20,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  label: {
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
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  typeSelectBox: {
    borderColor: C.accent,
  },
  inputText: {
    fontSize: 12,
    color: C.text,
    fontWeight: '400',
  },
  inputTextPlaceholder: {
    color: C.muted,
  },
  textInput: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    color: C.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  pickerList: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderNav,
    backgroundColor: C.surface,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderNav,
  },
  pickerItemRowSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerItemText: {
    fontSize: 12,
    color: C.muted,
  },
  pickerItemActive: {
    color: C.text,
    fontWeight: '600',
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 0,
  },
  severityChip: {
    minWidth: 96,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  severityHighActive: {
    backgroundColor: C.highBg,
    borderColor: C.highBorder,
  },
  severityMedActive: {
    backgroundColor: 'rgba(219, 169, 64, 0.16)',
    borderColor: '#DBA940',
  },
  severityLowActive: {
    backgroundColor: C.accentMuted,
    borderColor: C.accent,
  },
  severityInactive: {
    backgroundColor: C.inputBg,
    borderColor: C.border,
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  severityHighText: {
    color: C.highText,
  },
  severityMedLowText: {
    color: C.text,
  },
  severityInactiveText: {
    color: C.muted,
    fontWeight: '500',
  },
  offenderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  offenderTitles: {
    flex: 1,
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
  addOffenderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    height: 37,
    borderRadius: 10,
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  addOffenderText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 24,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.accent,
    borderWidth: 1,
    borderColor: '#3D4AE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.borderNav,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    minHeight: 72,
  },
  navIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCenterBtn: {
    width: 36,
    height: 37,
    borderRadius: 10,
    backgroundColor: C.accentMuted,
    borderWidth: 1,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
