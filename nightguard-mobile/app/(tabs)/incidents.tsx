import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DashboardBottomNav } from '@/components/dashboard-bottom-nav';
import { NewReportModal } from '@/components/new-report/NewReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { getIncidents, getVenues, type IncidentResponse } from '@/lib/api';

/**
 * Same venue rule as `home.tsx`: `GET /venues` → **first venue** (`venues[0]`).
 * TODO: venue picker / saved selection when multi-venue is supported.
 */

function formatIncidentType(type: string | undefined): string {
  if (!type?.trim()) return 'Incident';
  return type
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatIncidentWhen(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${time} · ${date}`;
}

function sortIncidentsNewestFirst(rows: IncidentResponse[]): IncidentResponse[] {
  return [...rows].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

function severityBadgeStyle(sev: string | undefined): {
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  const u = String(sev ?? '').toUpperCase();
  if (u === 'HIGH') {
    return {
      backgroundColor: 'rgba(232, 72, 104, 0.18)',
      borderColor: '#E84868',
      color: '#F07A92',
    };
  }
  if (u === 'MEDIUM') {
    return {
      backgroundColor: 'rgba(219, 169, 64, 0.2)',
      borderColor: '#DBA940',
      color: '#E8BC5C',
    };
  }
  return {
    backgroundColor: 'rgba(43, 54, 205, 0.22)',
    borderColor: '#2B36CD',
    color: '#9D9FCF',
  };
}

function StatusPill({ status }: { status: string | undefined }) {
  const u = String(status ?? '').toUpperCase();
  const active = u === 'ACTIVE';
  return (
    <View style={[styles.statusPill, active ? styles.statusPillActive : styles.statusPillDone]}>
      <Text style={[styles.statusPillText, active ? styles.statusPillTextActive : styles.statusPillTextDone]}>
        {u === 'COMPLETED' ? 'Completed' : active ? 'Active' : u || '—'}
      </Text>
    </View>
  );
}

function IncidentCard({ item }: { item: IncidentResponse }) {
  const sev = severityBadgeStyle(item.severity);
  const kw = item.keywords?.filter(Boolean) ?? [];
  const shown = kw.slice(0, 3);
  const more = kw.length > 3 ? kw.length - 3 : 0;
  const reporter = item.reporter;
  const reporterLine =
    reporter?.firstName || reporter?.lastName || reporter?.email
      ? [reporter.firstName, reporter.lastName].filter(Boolean).join(' ') || reporter.email
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardType} numberOfLines={2}>
          {formatIncidentType(item.type)}
        </Text>
        <View style={[styles.severityBadge, { backgroundColor: sev.backgroundColor, borderColor: sev.borderColor }]}>
          <Text style={[styles.severityBadgeText, { color: sev.color }]}>
            {String(item.severity ?? 'LOW').toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.cardMetaRow}>
        <StatusPill status={item.status} />
        <Text style={styles.cardTime}>{formatIncidentWhen(item.createdAt)}</Text>
      </View>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.description?.trim() ? item.description : 'No description'}
      </Text>
      {shown.length > 0 ? (
        <View style={styles.chipsRow}>
          {shown.map((k) => (
            <View key={k} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {k}
              </Text>
            </View>
          ))}
          {more > 0 ? (
            <View style={styles.chipMore}>
              <Text style={styles.chipMoreText}>+{more}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {reporterLine ? <Text style={styles.reporterHint}>Reported by {reporterLine}</Text> : null}
    </View>
  );
}

function ListSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonLineLong} />
          <View style={styles.skeletonLineMed} />
        </View>
      ))}
    </View>
  );
}

export default function IncidentsScreen() {
  const { firebaseUser } = useAuth();
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [rows, setRows] = useState<IncidentResponse[]>([]);
  const [venueName, setVenueName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const token = await firebaseUser.getIdToken();
        const venues = await getVenues(token);
        const first = venues[0];
        setVenueName(first?.name);

        const firstId = first?.id;
        if (firstId == null) {
          setRows([]);
          return;
        }
        const venueId = String(firstId);
        const list = await getIncidents(venueId, token);
        setRows(sortIncidentsNewestFirst(list));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        if (mode === 'initial') {
          setRows([]);
        }
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

  const onRefresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  const renderItem: ListRenderItem<IncidentResponse> = useCallback(({ item }) => <IncidentCard item={item} />, []);

  const listEmpty = !loading && !error && rows.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <NewReportModal visible={newReportOpen} onClose={() => setNewReportOpen(false)} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title}>Incidents</Text>
          {venueName ? <Text style={styles.subtitle}>{venueName}</Text> : null}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}
              onPress={() => void load('initial')}
              accessibilityRole="button"
              accessibilityLabel="Retry loading incidents">
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && rows.length === 0 && !error ? (
          <ListSkeleton />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item, index) => (item.id != null ? String(item.id) : `inc-${index}`)}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              listEmpty && styles.listContentEmpty,
            ]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9D9FCF" />}
            ListEmptyComponent={
              listEmpty ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No incidents yet</Text>
                  <Text style={styles.emptyHint}>Pull down to refresh.</Text>
                </View>
              ) : null
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <DashboardBottomNav active="incidents" onNewReport={() => setNewReportOpen(true)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#101018',
  },
  body: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E2E2E2',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#8B8B9D',
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
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#F07A92',
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(43, 54, 205, 0.25)',
    borderWidth: 1,
    borderColor: '#2B36CD',
  },
  retryPressed: {
    opacity: 0.88,
  },
  retryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skeletonWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12,
  },
  skeletonCard: {
    borderRadius: 12,
    backgroundColor: '#131319',
    borderWidth: 1,
    borderColor: '#2A2A34',
    padding: 16,
    gap: 10,
  },
  skeletonLineShort: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#2A2A34',
  },
  skeletonLineLong: {
    width: '100%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#1B1B26',
  },
  skeletonLineMed: {
    width: '72%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#1B1B26',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DDDBDB',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#8B8B9D',
  },
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
    gap: 10,
    marginBottom: 10,
  },
  cardType: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: 'rgba(117, 251, 148, 0.12)',
    borderColor: 'rgba(117, 251, 148, 0.35)',
  },
  statusPillDone: {
    backgroundColor: 'rgba(139, 139, 157, 0.12)',
    borderColor: '#3A3A46',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextActive: {
    color: '#75FB94',
  },
  statusPillTextDone: {
    color: '#8B8B9D',
  },
  cardTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B8B9D',
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#B8B8C8',
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(38, 38, 47, 0.85)',
    borderWidth: 1,
    borderColor: '#2A2A34',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9D9FCF',
  },
  chipMore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(43, 54, 205, 0.15)',
    borderWidth: 1,
    borderColor: '#2B36CD',
  },
  chipMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9D9FCF',
  },
  reporterHint: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '500',
    color: '#6B6B7A',
  },
});
