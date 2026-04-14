import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '@/contexts/AuthContext';
import {
  createIncident,
  getOffenders,
  getVenues,
  uploadMediaFile,
  type IncidentAttachmentMimeType,
  type OffenderResponse,
} from '@/lib/api';

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

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_MIME_TYPES: IncidentAttachmentMimeType[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

type LocalAttachmentStatus = 'pending' | 'uploading' | 'success' | 'error';
type LocalAttachmentType = 'image' | 'video';

type LocalAttachment = {
  id: string;
  uri: string;
  type: LocalAttachmentType;
  mimeType: string;
  fileName: string;
  fileSize?: number;
  status: LocalAttachmentStatus;
  error?: string;
  uploadedUrl?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

function offenderDisplayName(offender: OffenderResponse): string {
  const name = [offender.firstName, offender.lastName].filter(Boolean).join(' ').trim();
  return name || 'Unknown offender';
}

function inferMimeType(uri: string, pickerMimeType?: string | null): string {
  if (pickerMimeType) return pickerMimeType.toLowerCase();
  const lower = uri.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

export function NewReportModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { firebaseUser } = useAuth();
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addOffenderOpen, setAddOffenderOpen] = useState(false);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [offenderPickerOpen, setOffenderPickerOpen] = useState(false);
  const [offenderPickerLoading, setOffenderPickerLoading] = useState(false);
  const [offenderPickerError, setOffenderPickerError] = useState<string | null>(null);
  const [offenderSearch, setOffenderSearch] = useState('');
  const [offenders, setOffenders] = useState<OffenderResponse[]>([]);
  const [selectedOffenderIds, setSelectedOffenderIds] = useState<string[]>([]);
  const [draftSelectedOffenderIds, setDraftSelectedOffenderIds] = useState<string[]>([]);

  const resetAndClose = () => {
    setIncidentType(null);
    setSeverity(null);
    setDescription('');
    setKeywordInput('');
    setKeywords([]);
    setKeywordError(null);
    setSubmitError(null);
    setAttachmentError(null);
    setAttachments([]);
    setTypePickerOpen(false);
    setAddOffenderOpen(false);
    setVenueId(null);
    setOffenderPickerOpen(false);
    setOffenderPickerLoading(false);
    setOffenderPickerError(null);
    setOffenderSearch('');
    setOffenders([]);
    setSelectedOffenderIds([]);
    setDraftSelectedOffenderIds([]);
    onClose();
  };

  const addKeyword = () => {
    const normalized = keywordInput.trim().toLowerCase();
    if (!normalized) {
      setKeywordError('Enter a keyword before adding.');
      return;
    }
    if (keywords.some((k) => k.toLowerCase() === normalized)) {
      setKeywordError('That keyword is already added.');
      return;
    }
    if (keywords.length >= 10) {
      setKeywordError('You can add up to 10 keywords.');
      return;
    }
    setKeywords((prev) => [...prev, normalized]);
    setKeywordInput('');
    setKeywordError(null);
  };

  const removeKeyword = (target: string) => {
    setKeywords((prev) => prev.filter((k) => k !== target));
  };

  const resolveVenueId = async (token: string): Promise<string> => {
    if (venueId) return venueId;
    const venues = await getVenues(token);
    const firstId = venues[0]?.id;
    if (firstId == null) {
      throw new Error('No venue available for this account.');
    }
    const resolved = String(firstId);
    setVenueId(resolved);
    return resolved;
  };

  const loadOffendersForPicker = async () => {
    if (!firebaseUser) {
      setOffenderPickerError('Not signed in.');
      return;
    }
    setOffenderPickerLoading(true);
    setOffenderPickerError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const resolvedVenueId = await resolveVenueId(token);
      const rows = await getOffenders(resolvedVenueId, token);
      setOffenders(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOffenderPickerError(msg);
      setOffenders([]);
    } finally {
      setOffenderPickerLoading(false);
    }
  };

  const openOffenderPicker = async () => {
    setDraftSelectedOffenderIds(selectedOffenderIds);
    setOffenderSearch('');
    setOffenderPickerOpen(true);
    await loadOffendersForPicker();
  };

  const closeOffenderPicker = () => {
    setOffenderPickerOpen(false);
    setOffenderSearch('');
    setDraftSelectedOffenderIds(selectedOffenderIds);
  };

  const toggleDraftOffender = (id: string) => {
    setDraftSelectedOffenderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const filteredOffenders = offenders.filter((o) => {
    const q = offenderSearch.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      offenderDisplayName(o),
      o.physicalMarkers ?? '',
      o.currentStatus ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  const selectedOffenderObjects = selectedOffenderIds
    .map((id) => offenders.find((o) => String(o.id ?? '') === id))
    .filter((o): o is OffenderResponse => Boolean(o));

  const upsertAttachment = (attachmentId: string, patch: Partial<LocalAttachment>) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === attachmentId ? { ...a, ...patch } : a)),
    );
  };

  const addCapturedAsset = (asset: ImagePicker.ImagePickerAsset) => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      setAttachmentError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    const mimeType = inferMimeType(asset.uri, asset.mimeType);
    if (!ACCEPTED_MIME_TYPES.includes(mimeType as IncidentAttachmentMimeType)) {
      setAttachmentError('Only common image/video formats are supported.');
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
      setAttachmentError('File is too large (max 25MB).');
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setAttachmentError(null);
    setAttachments((prev) => [
      ...prev,
      {
        id,
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        mimeType,
        fileName: asset.fileName || `capture-${id}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
        fileSize: asset.fileSize ?? undefined,
        status: 'pending',
      },
    ]);
  };

  const handleAddPhotoVideo = async () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      setAttachmentError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    try {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.granted) {
        const cameraResult = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 0.8,
        });
        if (!cameraResult.canceled && cameraResult.assets[0]) {
          addCapturedAsset(cameraResult.assets[0]);
          return;
        }
      }
      const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libraryPerm.granted) {
        setAttachmentError('Camera and media library permissions are required.');
        return;
      }
      const pickResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });
      if (!pickResult.canceled && pickResult.assets[0]) {
        addCapturedAsset(pickResult.assets[0]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setAttachmentError(msg);
    }
  };

  const uploadAttachmentsForIncident = async (
    token: string,
    onlyFailed: boolean,
  ): Promise<{ failed: number; mediaUrls: string[] }> => {
    const existingUrls = attachments
      .filter((a) => a.status === 'success' && Boolean(a.uploadedUrl))
      .map((a) => a.uploadedUrl!)
      .filter(Boolean);
    const targetStatuses: LocalAttachmentStatus[] = onlyFailed ? ['error'] : ['pending', 'error'];
    const targets = attachments.filter((a) => targetStatuses.includes(a.status));
    let failed = 0;
    const newUrls: string[] = [];
    for (const attachment of targets) {
      try {
        upsertAttachment(attachment.id, { status: 'uploading', error: undefined });
        const mediaUrl = await uploadMediaFile(token, {
          uri: attachment.uri,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
        });
        newUrls.push(mediaUrl);
        upsertAttachment(attachment.id, { status: 'success', uploadedUrl: mediaUrl });
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        upsertAttachment(attachment.id, { status: 'error', error: msg });
      }
    }
    return { failed, mediaUrls: [...existingUrls, ...newUrls] };
  };

  const handleSubmitReport = async () => {
    if (submitting) return;
    setSubmitError(null);
    setKeywordError(null);
    setAttachmentError(null);
    try {
      if (!firebaseUser) {
        throw new Error('Not signed in.');
      }
      const token = await firebaseUser.getIdToken();
      const resolvedVenueId = await resolveVenueId(token);
      setSubmitting(true);
      const uploadResult = await uploadAttachmentsForIncident(token, false);
      const incident = await createIncident(token, {
        venueId: resolvedVenueId,
        type: incidentType ? incidentType.toUpperCase().replace(/\s+/g, '_') : undefined,
        severity: severity ? severity.toUpperCase() : undefined,
        description: description.trim() || undefined,
        keywords,
        offenderIds: selectedOffenderIds,
        mediaUrls: uploadResult.mediaUrls,
      });
      if (uploadResult.failed > 0) {
        Alert.alert(
          'Incident created',
          `${uploadResult.failed} attachment(s) failed to upload and were not attached.`,
        );
        resetAndClose();
      } else {
        resetAndClose();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={resetAndClose}>
      <AddOffenderSheet
        visible={addOffenderOpen}
        onClose={() => setAddOffenderOpen(false)}
        onSubmit={async () => {
          setAddOffenderOpen(false);
        }}
      />
      <Modal
        visible={offenderPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={closeOffenderPicker}>
        <View style={styles.pickerWrap}>
          <Pressable style={styles.pickerBackdrop} onPress={closeOffenderPicker} />
          <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.pickerHeaderRow}>
              <Text style={styles.pickerTitle}>Attach Offender</Text>
              <Pressable onPress={closeOffenderPicker} hitSlop={8} accessibilityLabel="Close offender picker">
                <X size={18} color={C.text} />
              </Pressable>
            </View>
            <TextInput
              style={styles.pickerSearch}
              value={offenderSearch}
              onChangeText={setOffenderSearch}
              placeholder="Search offenders"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {offenderPickerError ? (
              <View style={styles.pickerErrorRow}>
                <Text style={styles.errorText}>{offenderPickerError}</Text>
                <Pressable onPress={() => void loadOffendersForPicker()} style={styles.pickerRetryBtn}>
                  <Text style={styles.pickerRetryLabel}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
            <ScrollView style={styles.pickerOffenderList} keyboardShouldPersistTaps="handled">
              {offenderPickerLoading ? (
                <View style={styles.pickerLoadingWrap}>
                  <ActivityIndicator size="small" color={C.text} />
                </View>
              ) : filteredOffenders.length === 0 ? (
                <Text style={styles.pickerEmpty}>No offenders found.</Text>
              ) : (
                filteredOffenders.map((offender) => {
                  const id = String(offender.id ?? '');
                  const selected = draftSelectedOffenderIds.includes(id);
                  return (
                    <Pressable
                      key={id}
                      onPress={() => toggleDraftOffender(id)}
                      style={({ pressed }) => [
                        styles.pickerItemRow,
                        selected && styles.pickerItemRowSelected,
                        pressed && styles.pressed,
                      ]}>
                      <View style={styles.pickerItemTextWrap}>
                        <Text style={styles.pickerItemName}>{offenderDisplayName(offender)}</Text>
                        <Text style={styles.pickerItemSub} numberOfLines={1}>
                          {[offender.physicalMarkers, offender.currentStatus].filter(Boolean).join(' • ') || '—'}
                        </Text>
                      </View>
                      <View style={[styles.pickerCheck, selected && styles.pickerCheckSelected]}>
                        {selected ? <Text style={styles.pickerCheckLabel}>✓</Text> : null}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.pickerActions}>
              <Pressable style={styles.pickerCancelBtn} onPress={closeOffenderPicker}>
                <Text style={styles.pickerCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.pickerAttachBtn,
                  pressed && styles.pressed,
                  offenderPickerLoading && styles.disabledBtn,
                ]}
                onPress={() => {
                  setSelectedOffenderIds(draftSelectedOffenderIds);
                  setOffenderPickerOpen(false);
                }}
                disabled={offenderPickerLoading}>
                <Text style={styles.pickerAttachLabel}>Attach</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
                  disabled={submitting}
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

            {/* Keywords */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Keywords</Text>
              <Text style={styles.hint}>Add up to 10 keywords for quick filtering</Text>
              <View style={styles.keywordRow}>
                <TextInput
                  style={[styles.textInput, styles.keywordInput]}
                  value={keywordInput}
                  onChangeText={(v) => {
                    setKeywordInput(v);
                    if (keywordError) setKeywordError(null);
                  }}
                  placeholder="Add keyword (e.g. harassment, intoxicated)"
                  placeholderTextColor={C.muted}
                  editable={!submitting}
                  returnKeyType="done"
                  onSubmitEditing={addKeyword}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.keywordAddBtn,
                    pressed && styles.pressed,
                    submitting && styles.disabledBtn,
                  ]}
                  onPress={addKeyword}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Add keyword">
                  <Text style={styles.keywordAddBtnText}>Add</Text>
                </Pressable>
              </View>
              {keywords.length > 0 ? (
                <View style={styles.keywordChipsRow}>
                  {keywords.map((k) => (
                    <View key={k} style={styles.keywordChip}>
                      <Text style={styles.keywordChipText}>{k}</Text>
                      <Pressable
                        onPress={() => removeKeyword(k)}
                        hitSlop={6}
                        disabled={submitting}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove keyword ${k}`}>
                        <X size={12} color={C.text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              {keywordError ? <Text style={styles.errorText}>{keywordError}</Text> : null}
            </View>

            {/* Attachments */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Attachments</Text>
              <Text style={styles.hint}>Add photo/video evidence (max 5 files)</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.attachMediaBtn,
                  pressed && styles.pressed,
                  submitting && styles.disabledBtn,
                ]}
                onPress={() => void handleAddPhotoVideo()}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Add photo or video">
                <Plus size={18} color={C.text} strokeWidth={2.5} />
                <Text style={styles.attachMediaText}>Add Photo/Video</Text>
              </Pressable>
              {attachmentError ? <Text style={styles.errorText}>{attachmentError}</Text> : null}
              {attachments.length > 0 ? (
                <View style={styles.attachmentList}>
                  {attachments.map((attachment) => (
                    <View key={attachment.id} style={styles.attachmentCard}>
                      {attachment.type === 'image' ? (
                        <Image source={{ uri: attachment.uri }} style={styles.attachmentThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.attachmentThumb, styles.attachmentVideoThumb]}>
                          <Text style={styles.attachmentVideoLabel}>VIDEO</Text>
                        </View>
                      )}
                      <View style={styles.attachmentMeta}>
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {attachment.fileName}
                        </Text>
                        <Text style={styles.attachmentStatus}>
                          {attachment.status.toUpperCase()}
                        </Text>
                        {attachment.error ? (
                          <Text style={styles.attachmentErrorText} numberOfLines={2}>
                            {attachment.error}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() =>
                          setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
                        }
                        disabled={submitting || attachment.status === 'uploading'}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${attachment.fileName}`}>
                        <X size={14} color={C.text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Offender */}
            <View style={styles.fieldBlock}>
              <View style={styles.offenderHeader}>
                <View style={styles.offenderTitles}>
                  <Text style={styles.label}>Offender Details</Text>
                  <Text style={styles.hint}>Provide a description of the offender</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.attachBtn, pressed && styles.pressed]}
                  onPress={() => void openOffenderPicker()}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Attach offender">
                  <Plus size={13} color={C.text} strokeWidth={2.5} />
                  <Text style={styles.attachBtnText}>Attach Offender</Text>
                </Pressable>
              </View>
              {selectedOffenderObjects.length > 0 ? (
                <View style={styles.selectedOffenderChipsRow}>
                  {selectedOffenderObjects.map((offender) => {
                    const offenderId = String(offender.id ?? '');
                    return (
                      <View key={offenderId} style={styles.selectedOffenderChip}>
                        <Text style={styles.selectedOffenderChipText} numberOfLines={1}>
                          {offenderDisplayName(offender)}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setSelectedOffenderIds((prev) =>
                              prev.filter((id) => id !== offenderId),
                            )
                          }
                          hitSlop={6}
                          disabled={submitting}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove offender ${offenderDisplayName(offender)}`}>
                          <X size={12} color={C.text} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : null}
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
            {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.pressed,
                submitting && styles.disabledBtn,
              ]}
              onPress={() => void handleSubmitReport()}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Submit report">
              {submitting ? (
                <ActivityIndicator size="small" color={C.text} />
              ) : (
                <Text style={styles.submitBtnText}>Submit report</Text>
              )}
            </Pressable>
          </ScrollView>

          {/* Bottom nav (visual match to dashboard) */}
          <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Pressable
              style={styles.navIconWrap}
              onPress={resetAndClose}
              disabled={submitting}
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
  keywordRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  keywordInput: {
    flex: 1,
  },
  keywordAddBtn: {
    minWidth: 68,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.accentMuted,
    borderWidth: 1,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  keywordAddBtnText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  keywordChipsRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.borderNav,
  },
  keywordChipText: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
  },
  attachMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.accentMuted,
    borderWidth: 1,
    borderColor: C.accent,
  },
  attachMediaText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  attachmentList: {
    marginTop: 10,
    gap: 8,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderNav,
    backgroundColor: C.surface,
    padding: 8,
  },
  attachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: C.inputBg,
  },
  attachmentVideoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  attachmentVideoLabel: {
    color: C.text,
    fontSize: 10,
    fontWeight: '700',
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  attachmentStatus: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  attachmentErrorText: {
    color: '#F07A92',
    fontSize: 10,
    marginTop: 2,
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
  selectedOffenderChipsRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedOffenderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.borderNav,
    maxWidth: '100%',
  },
  selectedOffenderChipText: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 220,
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
  errorText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#F07A92',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  pickerWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pickerSheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: C.borderNav,
    borderBottomWidth: 0,
    maxHeight: '88%',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pickerTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  pickerSearch: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    color: C.text,
    fontSize: 13,
    marginBottom: 10,
  },
  pickerErrorRow: {
    marginBottom: 10,
    gap: 8,
  },
  pickerRetryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: C.accentMuted,
  },
  pickerRetryLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  pickerOffenderList: {
    minHeight: 160,
    maxHeight: 360,
  },
  pickerLoadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  pickerEmpty: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderNav,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  pickerItemTextWrap: {
    flex: 1,
  },
  pickerItemName: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },
  pickerItemSub: {
    color: C.muted,
    fontSize: 11,
    marginTop: 2,
  },
  pickerCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCheckSelected: {
    borderColor: C.accent,
    backgroundColor: C.accentMuted,
  },
  pickerCheckLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  pickerCancelBtn: {
    minWidth: 92,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCancelLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  pickerAttachBtn: {
    minWidth: 92,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: C.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerAttachLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
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
