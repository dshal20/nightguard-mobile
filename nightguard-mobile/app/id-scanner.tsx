import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type ScanningResult,
} from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  parse as parseAAMVA,
  isExpired,
  isUnder21,
  getAge,
  type ParsedLicense,
} from 'aamva-parser';

import { useAuth } from '@/contexts/AuthContext';
import { createPatronLog, getVenues } from '@/lib/api';

const C = {
  bg: '#101018',
  surface: '#11111B',
  border: '#2A2A34',
  text: '#FFFFFF',
  muted: '#8B8B9D',
  accent: '#2B36CD',
  green: '#22C55E',
  greenMuted: 'rgba(34,197,94,0.15)',
  red: '#EF4444',
  redMuted: 'rgba(239,68,68,0.15)',
  amber: '#F59E0B',
  amberMuted: 'rgba(245,158,11,0.12)',
  ok: '#75FB94',
  error: '#F07A92',
};

function fmtDate(d: Date | null | undefined): string {
  if (!d || isNaN(d.getTime())) return '—';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function isoDate(d: Date | null | undefined): string | null {
  if (!d || isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type Step = 'idle' | 'scanning' | 'result' | 'done';
type Decision = 'ADMITTED' | 'DENIED';

const useModernScanner = CameraView.isModernBarcodeScannerAvailable;

export default function IdScannerScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('idle');
  const [scanError, setScanError] = useState<string | null>(null);
  const [license, setLicense] = useState<ParsedLicense | null>(null);
  const [rawBarcode, setRawBarcode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [doneDecision, setDoneDecision] = useState<Decision | null>(null);

  const scannedRef = useRef(false);

  const processBarcode = useCallback((raw: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setRawBarcode(raw);

    try {
      const parsed = parseAAMVA(raw);
      if (!parsed.firstName && !parsed.lastName && !parsed.driversLicenseId) {
        setScanError(
          'No ID data found in barcode. Make sure the back of the license is visible.',
        );
        scannedRef.current = false;
        return;
      }
      setLicense(parsed);
      setScanError(null);
      setStep('result');
    } catch {
      setScanError('Could not parse barcode data. Try again.');
      scannedRef.current = false;
    }
  }, []);

  // Modern scanner listener
  useEffect(() => {
    if (!useModernScanner) return;
    const sub = CameraView.onModernBarcodeScanned((event: ScanningResult) => {
      processBarcode(event.data);
      void CameraView.dismissScanner();
    });
    return () => sub.remove();
  }, [processBarcode]);

  const startScan = async () => {
    setScanError(null);
    scannedRef.current = false;
    setStep('scanning');

    if (useModernScanner) {
      try {
        await CameraView.launchScanner({
          barcodeTypes: ['pdf417'],
          isPinchToZoomEnabled: true,
          isGuidanceEnabled: true,
          isHighlightingEnabled: true,
        });
        // Scanner was dismissed (cancelled or barcode found)
        // If no barcode was found (user cancelled), go back to idle
        if (!scannedRef.current) {
          setStep('idle');
        }
      } catch {
        setScanError('Scanner could not start. Using camera fallback.');
        // Fall through to CameraView fallback
      }
    }
  };

  const handleFallbackBarCode = useCallback(
    (result: BarcodeScanningResult) => {
      processBarcode(result.data);
    },
    [processBarcode],
  );

  const handleDecision = async (decision: Decision) => {
    if (!firebaseUser || !license || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const venues = await getVenues(token);
      const venueId = venues[0]?.id ? String(venues[0].id).trim() : null;
      if (!venueId) throw new Error('No venue found.');

      await createPatronLog(token, venueId, {
        firstName: license.firstName ?? null,
        lastName: license.lastName ?? null,
        middleName: license.middleName ?? null,
        driversLicenseId: license.driversLicenseId ?? null,
        dateOfBirth: isoDate(license.dateOfBirth),
        expirationDate: isoDate(license.expirationDate),
        state: license.state ?? null,
        streetAddress: license.streetAddress ?? null,
        city: license.city ?? null,
        postalCode: license.postalCode ?? null,
        gender: license.gender ?? null,
        eyeColor: license.eyeColor ?? null,
        decision,
      });

      setDoneDecision(decision);
      setStep('done');
      setTimeout(() => resetScanner(), 1500);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const resetScanner = () => {
    scannedRef.current = false;
    setLicense(null);
    setRawBarcode('');
    setScanError(null);
    setSubmitError(null);
    setDoneDecision(null);
    setStep('idle');
  };

  const expired = rawBarcode ? isExpired(rawBarcode) : false;
  const under21 = rawBarcode ? isUnder21(rawBarcode) : false;
  const age = rawBarcode ? getAge(rawBarcode) : null;

  // ── permission loading ──────────────────────────────────────────────
  if (!permission) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.center}>
          <ActivityIndicator color={C.text} />
        </View>
      </SafeAreaView>
    );
  }

  // ── permission denied ───────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <SafeAreaView style={st.safe}>
        <Header onBack={() => router.back()} title="ID Scanner" />
        <View style={st.center}>
          <Text style={st.permTitle}>Camera Access Needed</Text>
          <Text style={st.permText}>
            Camera permission is required to scan IDs.{' '}
            {permission.canAskAgain
              ? 'Tap below to grant access.'
              : 'Please enable it in your device Settings.'}
          </Text>
          {permission.canAskAgain ? (
            <Pressable style={st.btnPrimary} onPress={requestPermission}>
              <Text style={st.btnPrimaryLabel}>Grant Permission</Text>
            </Pressable>
          ) : (
            <Pressable style={st.btnPrimary} onPress={() => void Linking.openSettings()}>
              <Text style={st.btnPrimaryLabel}>Open Settings</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── idle: ready to scan ─────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <SafeAreaView style={st.safe}>
        <Header onBack={() => router.back()} title="ID Scanner" />
        <View style={st.center}>
          <Text style={st.idleTitle}>Ready to Scan</Text>
          <Text style={st.idleText}>
            Hold the back of a government-issued ID up to the camera.
            The entire card should be visible.
          </Text>
          <Pressable style={st.btnPrimary} onPress={() => void startScan()}>
            <Text style={st.btnPrimaryLabel}>Start Scanning</Text>
          </Pressable>
          {scanError ? <Text style={st.errorInline}>{scanError}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  // ── scanning (CameraView fallback, only when modern scanner unavailable) ──
  if (step === 'scanning' && !useModernScanner) {
    return (
      <SafeAreaView style={st.safe}>
        <Header onBack={resetScanner} title="Scan ID" />
        <View style={st.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['pdf417', 'qr', 'aztec', 'datamatrix', 'code128', 'code39'],
            }}
            onBarcodeScanned={handleFallbackBarCode}
          />
          <View style={st.overlay}>
            <View style={st.scanFrame} />
            <Text style={st.scanHint}>
              Hold the back of the ID in the frame
            </Text>
          </View>
        </View>
        {scanError ? (
          <View style={st.errorBar}>
            <Text style={st.errorBarText}>{scanError}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  // ── done (brief confirmation) ───────────────────────────────────────
  if (step === 'done') {
    const isAdmit = doneDecision === 'ADMITTED';
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.center}>
          <View
            style={[st.doneBadge, { backgroundColor: isAdmit ? C.greenMuted : C.redMuted }]}>
            <Text style={[st.doneText, { color: isAdmit ? C.green : C.red }]}>
              {isAdmit ? 'Admitted' : 'Denied'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── result ──────────────────────────────────────────────────────────
  const fullName = [license?.firstName, license?.middleName, license?.lastName]
    .filter(Boolean)
    .join(' ');
  const addressLine = [
    license?.streetAddress,
    license?.city,
    license?.state,
    license?.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <Header onBack={resetScanner} title="ID Results" backLabel="‹ Scan Again" />

        {under21 ? (
          <View style={st.warningBanner}>
            <Text style={st.warningText}>
              Under 21 {age !== null ? `(Age ${age})` : ''}
            </Text>
          </View>
        ) : null}

        {expired ? (
          <View style={st.expiredBanner}>
            <Text style={st.expiredText}>License Expired</Text>
          </View>
        ) : null}

        <View style={st.card}>
          <Text style={st.cardTitle}>Scanned License</Text>
          <Row label="Name" value={fullName || '—'} />
          <Row label="License #" value={license?.driversLicenseId ?? '—'} />
          <Row label="Date of Birth" value={fmtDate(license?.dateOfBirth)} />
          <Row label="Expiration" value={fmtDate(license?.expirationDate)} />
          <Row label="State" value={license?.state ?? '—'} />
          <Row label="Address" value={addressLine || '—'} />
          <Row label="Gender" value={license?.gender ?? '—'} />
          <Row label="Eye Color" value={license?.eyeColor ?? '—'} />
        </View>

        <View style={st.decisionRow}>
          <Pressable
            style={({ pressed }) => [
              st.admitBtn,
              pressed && st.pressed,
              submitting && st.disabled,
            ]}
            onPress={() => void handleDecision('ADMITTED')}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Admit patron">
            {submitting ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <Text style={st.admitLabel}>Admit</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              st.denyBtn,
              pressed && st.pressed,
              submitting && st.disabled,
            ]}
            onPress={() => void handleDecision('DENIED')}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Deny patron">
            {submitting ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <Text style={st.denyLabel}>Deny</Text>
            )}
          </Pressable>
        </View>

        {submitError ? <Text style={st.submitError}>{submitError}</Text> : null}

        <Pressable style={st.scanAgainBtn} onPress={resetScanner}>
          <Text style={st.scanAgainLabel}>Scan Again</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── sub-components ──────────────────────────────────────────────────────

function Header({
  onBack,
  title,
  backLabel = '‹ Back',
}: {
  onBack: () => void;
  title: string;
  backLabel?: string;
}) {
  return (
    <View style={st.headerRow}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back">
        <Text style={st.backText}>{backLabel}</Text>
      </Pressable>
      <Text style={st.title}>{title}</Text>
      <View style={st.headerSpacer} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.row}>
      <Text style={st.rowLabel}>{label}</Text>
      <Text style={st.rowValue}>{value}</Text>
    </View>
  );
}

// ── styles ──────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backText: { color: '#9D9FCF', fontSize: 16, fontWeight: '600', minWidth: 100 },
  title: { color: C.text, fontSize: 18, fontWeight: '800' },
  headerSpacer: { minWidth: 100 },

  permTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  permText: {
    color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20,
    marginBottom: 20, maxWidth: 280,
  },

  idleTitle: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  idleText: {
    color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22,
    marginBottom: 24, maxWidth: 300,
  },
  errorInline: { color: C.error, fontSize: 12, marginTop: 16, textAlign: 'center' },

  cameraWrap: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: '85%',
    aspectRatio: 1.586,
    borderWidth: 2,
    borderColor: C.ok,
    borderRadius: 12,
  },
  scanHint: {
    marginTop: 16, color: C.text, fontSize: 14, fontWeight: '700', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    paddingHorizontal: 24,
  },

  errorBar: { padding: 12, backgroundColor: 'rgba(240,122,146,0.15)' },
  errorBarText: { color: C.error, fontSize: 12, textAlign: 'center' },

  warningBanner: {
    marginHorizontal: 16, marginTop: 12, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, backgroundColor: C.amberMuted, borderWidth: 1, borderColor: C.amber,
  },
  warningText: { color: C.amber, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  expiredBanner: {
    marginHorizontal: 16, marginTop: 8, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, backgroundColor: C.redMuted, borderWidth: 1, borderColor: C.red,
  },
  expiredText: { color: C.red, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  card: {
    marginHorizontal: 16, marginTop: 14, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: 16,
  },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E1E2A' },
  rowLabel: {
    color: C.muted, fontSize: 10, textTransform: 'uppercase',
    marginBottom: 2, letterSpacing: 0.4,
  },
  rowValue: { color: C.text, fontSize: 14, fontWeight: '600' },

  decisionRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16 },
  admitBtn: {
    flex: 1, minHeight: 50, borderRadius: 12, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  admitLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  denyBtn: {
    flex: 1, minHeight: 50, borderRadius: 12, backgroundColor: C.red,
    alignItems: 'center', justifyContent: 'center',
  },
  denyLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  submitError: { color: C.error, fontSize: 12, marginHorizontal: 16, marginTop: 8 },

  scanAgainBtn: {
    marginHorizontal: 16, marginTop: 14, minHeight: 44, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  scanAgainLabel: { color: C.text, fontSize: 13, fontWeight: '600' },

  doneBadge: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  doneText: { fontSize: 22, fontWeight: '800' },

  btnPrimary: {
    minHeight: 46, minWidth: 180, borderRadius: 10, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  btnPrimaryLabel: { color: C.text, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.85 },
});
