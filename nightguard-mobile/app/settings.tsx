import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { getMe, getVenues, updateMeProfilePhoto, uploadMediaFile, type UserProfile, type Venue } from '@/lib/api';

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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);

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

  const avatarUri = photoPreviewUri || profile?.profileUrl || null;
  const initials = [profile?.firstName?.[0], profile?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'NG';

  const pickAndUploadPhoto = async (source: 'camera' | 'library') => {
    if (!firebaseUser || photoUploading) return;
    setPhotoError(null);
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setPhotoError('Camera permission is required.');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setPhotoError('Photo library permission is required.');
          return;
        }
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            });

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const mimeType = (asset.mimeType || 'image/jpeg').toLowerCase();
      const supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];
      if (!supported.includes(mimeType)) {
        setPhotoError('Unsupported image type. Use JPG, PNG, HEIC, or WEBP.');
        return;
      }
      const maxBytes = 10 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > maxBytes) {
        setPhotoError('Image is too large (max 10MB).');
        return;
      }

      setPhotoPreviewUri(asset.uri);
      setPhotoUploading(true);
      const token = await firebaseUser.getIdToken();
      const uploadedUrl = await uploadMediaFile(token, {
        uri: asset.uri,
        fileName: asset.fileName || `profile-${Date.now()}.jpg`,
        mimeType,
      });
      const updated = await updateMeProfilePhoto(token, uploadedUrl);
      setProfile((prev) => ({ ...(prev ?? {}), ...updated, profileUrl: updated.profileUrl || uploadedUrl }));
      setPhotoPreviewUri(updated.profileUrl || uploadedUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPhotoError(msg);
    } finally {
      setPhotoUploading(false);
    }
  };

  const onChangePhoto = () => {
    Alert.alert('Change profile photo', 'Choose a source', [
      { text: 'Camera', onPress: () => void pickAndUploadPhoto('camera') },
      { text: 'Photo Library', onPress: () => void pickAndUploadPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>Account Settings</Text>
          <Text style={styles.pageSubtitle}>Manage your profile and venue access.</Text>
        </View>

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
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profile Photo</Text>
              <Text style={styles.cardHint}>Used across incident reports and account screens.</Text>
              <View style={styles.avatarRow}>
                <View style={styles.avatarWrap}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                </View>
                <View style={styles.avatarActions}>
                  <Pressable
                    style={({ pressed }) => [styles.changePhotoBtn, pressed && styles.pressed, photoUploading && styles.btnDisabled]}
                    onPress={onChangePhoto}
                    disabled={photoUploading}
                    accessibilityRole="button"
                    accessibilityLabel="Change profile photo">
                    {photoUploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.changePhotoLabel}>Change Photo</Text>
                    )}
                  </Pressable>
                  {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account Details</Text>
              <Text style={styles.cardHint}>Read-only fields from your current profile.</Text>
              <View style={styles.info}>
                <Text style={[styles.label, styles.labelFirst]}>Name</Text>
                <Text style={styles.value}>{displayName(profile)}</Text>

                <Text style={styles.label}>Role</Text>
                <Text style={styles.value}>{displayRole(profile?.role)}</Text>

                <Text style={styles.label}>Venue</Text>
                <Text style={styles.value}>{displayVenues(venues)}</Text>
              </View>
            </View>
          </>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed, photoUploading && styles.btnDisabled]}
          onPress={() => void onSignOut()}
          disabled={photoUploading}
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
  pageHeading: {
    marginBottom: 16,
  },
  pageTitle: {
    color: '#E2E2E2',
    fontSize: 22,
    fontWeight: '900',
  },
  pageSubtitle: {
    marginTop: 4,
    color: '#8B8B9D',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
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
    marginBottom: 0,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A34',
    backgroundColor: '#11111B',
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cardHint: {
    marginTop: 2,
    marginBottom: 12,
    color: '#8B8B9D',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#1B1B26',
    borderWidth: 1,
    borderColor: '#2A2A34',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: '#9D9FCF',
    fontSize: 24,
    fontWeight: '800',
  },
  avatarActions: {
    flex: 1,
  },
  changePhotoBtn: {
    minHeight: 40,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(43, 54, 205, 0.2)',
    borderWidth: 1,
    borderColor: '#2B36CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  photoError: {
    marginTop: 8,
    color: '#F07A92',
    fontSize: 12,
    lineHeight: 16,
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
  btnDisabled: {
    opacity: 0.65,
  },
  signOutLabel: {
    color: '#E84868',
    fontSize: 16,
    fontWeight: '700',
  },
});
