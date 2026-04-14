import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DashboardBottomNav } from '@/components/dashboard-bottom-nav';
import { AddOffenderSheet, type AddOffenderFormValues } from '@/components/new-report/AddOffenderSheet';
import { NewReportModal } from '@/components/new-report/NewReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { createOffender, getOffenders, getVenues, type OffenderResponse } from '@/lib/api';

/**
 * Same venue rule as `home.tsx`: `GET /venues` → **first venue** (`venues[0]`).
 * TODO: venue picker / saved selection when multi-venue is supported.
 */

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fullName(o: OffenderResponse): string {
  const n = [o.firstName, o.lastName].filter(Boolean).join(' ').trim();
  return n || 'Unknown';
}

function riskColor(score: number): { bg: string; border: string; text: string } {
  if (score >= 70) return { bg: 'rgba(232, 72, 104, 0.16)', border: '#E84868', text: '#F07A92' };
  if (score >= 40) return { bg: 'rgba(219, 169, 64, 0.2)', border: '#DBA940', text: '#E8BC5C' };
  return { bg: 'rgba(43, 54, 205, 0.22)', border: '#2B36CD', text: '#9D9FCF' };
}

function normalize(s: unknown): string {
  return String(s ?? '').toLowerCase();
}

function OffenderCard({ item }: { item: OffenderResponse }) {
  const status = item.currentStatus?.trim() || '—';
  const score = typeof item.riskScore === 'number' ? item.riskScore : null;
  const scoreLabel = score === null ? '—' : String(score);
  const scoreStyle = score === null ? null : riskColor(score);

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.name} numberOfLines={1}>
          {fullName(item)}
        </Text>
        <View style={styles.rightMeta}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText} numberOfLines={1}>
              {status}
            </Text>
          </View>
          <View
            style={[
              styles.riskPill,
              scoreStyle
                ? { backgroundColor: scoreStyle.bg, borderColor: scoreStyle.border }
                : styles.riskPillEmpty,
            ]}>
            <Text
              style={[
                styles.riskText,
                scoreStyle ? { color: scoreStyle.text } : styles.riskTextEmpty,
              ]}>
              {scoreLabel}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.markers} numberOfLines={1}>
        {item.physicalMarkers?.trim() ? item.physicalMarkers : 'No physical markers'}
      </Text>

      <View style={styles.cardBottomRow}>
        <Text style={styles.added}>Added {fmtDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

function ListSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonLineLong} />
          <View style={styles.skeletonLineMed} />
        </View>
      ))}
    </View>
  );
}

export default function OffendersScreen() {
  const { firebaseUser } = useAuth();
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [newOffenderOpen, setNewOffenderOpen] = useState(false);
  const [creatingOffender, setCreatingOffender] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [rows, setRows] = useState<OffenderResponse[]>([]);
  const [venueName, setVenueName] = useState<string | undefined>();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!firebaseUser) {
        setLoading(false);
        setRefreshing(false);
        setRows([]);
        setVenueName(undefined);
        setError(null);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const token = await firebaseUser.getIdToken();
        const venues = await getVenues(token);
        const first = venues[0];
        setVenueName(first?.name);
        const firstId = first?.id;
        if (firstId == null) {
          setVenueId(null);
          setRows([]);
          return;
        }
        const selectedVenueId = String(firstId);
        setVenueId(selectedVenueId);
        const list = await getOffenders(selectedVenueId, token);
        setRows(list);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        if (mode === 'initial') setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [firebaseUser],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  const onRefresh = useCallback(() => void load('refresh'), [load]);

  const handleCreateOffender = useCallback(
    async (values: AddOffenderFormValues) => {
      const firstName = values.firstName.trim();
      const lastName = values.lastName.trim();
      if (!firstName || !lastName) {
        setCreateError('First name and last name are required.');
        return;
      }
      if (!venueId) {
        setCreateError('No venue selected. Please refresh and try again.');
        return;
      }
      if (!firebaseUser) {
        setCreateError('You are signed out. Please sign in again.');
        return;
      }

      setCreatingOffender(true);
      setCreateError(null);
      try {
        const token = await firebaseUser.getIdToken();
        await createOffender(token, {
          venueId,
          firstName,
          lastName,
          physicalMarkers: values.physicalMarkers?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          riskScore: undefined,
          currentStatus: undefined,
        });
        setNewOffenderOpen(false);
        await load('initial');
        Alert.alert('Success', 'Offender created.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setCreateError(msg);
        Alert.alert('Could not create offender', msg);
      } finally {
        setCreatingOffender(false);
      }
    },
    [firebaseUser, load, venueId],
  );

  const filtered = useMemo(() => {
    const q = normalize(debouncedQuery).trim();
    if (!q) return rows;
    return rows.filter((o) => {
      const hay = [
        fullName(o),
        o.physicalMarkers,
        o.currentStatus,
      ]
        .map(normalize)
        .join(' ');
      return hay.includes(q);
    });
  }, [rows, debouncedQuery]);

  const listEmpty = !loading && !error && filtered.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <NewReportModal visible={newReportOpen} onClose={() => setNewReportOpen(false)} />
      <AddOffenderSheet
        visible={newOffenderOpen}
        onClose={() => {
          if (!creatingOffender) {
            setCreateError(null);
            setNewOffenderOpen(false);
          }
        }}
        onSubmit={handleCreateOffender}
        submitting={creatingOffender}
        submitError={createError}
      />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Offenders</Text>
            {venueName ? <Text style={styles.subtitle}>{venueName}</Text> : null}
          </View>
          <Pressable
            onPress={() => {
              setCreateError(null);
              setNewOffenderOpen(true);
            }}
            style={({ pressed }) => [styles.newOffenderBtn, pressed && styles.retryPressed]}
            accessibilityRole="button"
            accessibilityLabel="New offender">
            <Text style={styles.newOffenderBtnText}>New Offender</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search offenders..."
            placeholderTextColor="#6B6B7A"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search offenders"
          />
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}
              onPress={() => void load('initial')}
              accessibilityRole="button"
              accessibilityLabel="Retry loading offenders">
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && rows.length === 0 && !error ? (
          <ListSkeleton />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => (item.id != null ? String(item.id) : `off-${index}`)}
            renderItem={({ item }) => <OffenderCard item={item} />}
            contentContainerStyle={[
              styles.listContent,
              listEmpty && styles.listContentEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#9D9FCF"
              />
            }
            ListEmptyComponent={
              listEmpty ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No offenders yet</Text>
                  <Text style={styles.emptyHint}>Try a different search or pull to refresh.</Text>
                </View>
              ) : null
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <DashboardBottomNav active="offenders" onNewReport={() => setNewReportOpen(true)} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101018' },
  body: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: '900', color: '#E2E2E2' },
  subtitle: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#8B8B9D' },
  newOffenderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(43, 54, 205, 0.2)',
    borderWidth: 1,
    borderColor: '#2B36CD',
  },
  newOffenderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  searchWrap: { paddingHorizontal: 24, paddingBottom: 12 },
  searchInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1B1B26',
    borderWidth: 1,
    borderColor: '#2A2A34',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  errorBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 72, 104, 0.12)',
    borderWidth: 1,
    borderColor: '#3A2A34',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#F07A92' },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(43, 54, 205, 0.25)',
    borderWidth: 1,
    borderColor: '#2B36CD',
  },
  retryPressed: { opacity: 0.88 },
  retryLabel: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  listContent: { paddingHorizontal: 24, paddingBottom: 120 },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  separator: { height: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#DDDBDB' },
  emptyHint: { marginTop: 8, fontSize: 12, color: '#8B8B9D', textAlign: 'center' },

  card: {
    borderRadius: 12,
    backgroundColor: '#131319',
    borderWidth: 1,
    borderColor: '#2A2A34',
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  rightMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A3A46',
    backgroundColor: 'rgba(139, 139, 157, 0.12)',
    maxWidth: 120,
  },
  statusText: { fontSize: 10, fontWeight: '800', color: '#8B8B9D' },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  riskPillEmpty: { backgroundColor: 'rgba(38, 38, 47, 0.6)', borderColor: '#2A2A34' },
  riskText: { fontSize: 10, fontWeight: '900' },
  riskTextEmpty: { color: '#8B8B9D' },

  markers: { fontSize: 13, fontWeight: '500', color: '#8B8B9D' },
  cardBottomRow: { marginTop: 10 },
  added: { fontSize: 11, fontWeight: '600', color: '#6B6B7A' },

  skeletonWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 12 },
  skeletonCard: {
    borderRadius: 12,
    backgroundColor: '#131319',
    borderWidth: 1,
    borderColor: '#2A2A34',
    padding: 16,
    gap: 10,
  },
  skeletonLineShort: { width: '40%', height: 12, borderRadius: 4, backgroundColor: '#2A2A34' },
  skeletonLineLong: { width: '100%', height: 10, borderRadius: 4, backgroundColor: '#1B1B26' },
  skeletonLineMed: { width: '72%', height: 10, borderRadius: 4, backgroundColor: '#1B1B26' },
});

