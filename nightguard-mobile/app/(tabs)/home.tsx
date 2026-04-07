import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ambulance, TriangleAlert } from 'lucide-react-native';

import { DashboardBottomNav } from '@/components/dashboard-bottom-nav';
import { NewReportModal } from '@/components/new-report/NewReportModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCapacity,
  getHeadcounts,
  getIncidents,
  getNotificationActivity,
  getVenues,
  type IncidentResponse,
  type NotificationActivity,
  type VenueCapacityResponse,
  type VenueHeadcountResponse,
} from '@/lib/api';

/**
 * Dashboard uses the **first venue** from `GET /venues` (same rule as Settings summary).
 * TODO: wire a selected-venue preference / picker when product supports multiple venues.
 */

type HomeDash = {
  incidents: IncidentResponse[];
  capacity: VenueCapacityResponse | null;
  headcounts: VenueHeadcountResponse[];
  activity: NotificationActivity[];
};

function formatRelativeTime(isoOrMs: string | number | undefined): string {
  if (isoOrMs === undefined) return '—';
  const t = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function latestIncidentIso(incidents: IncidentResponse[]): string | undefined {
  let best: number | null = null;
  let bestIso: string | undefined;
  for (const i of incidents) {
    if (!i.createdAt) continue;
    const ms = new Date(i.createdAt).getTime();
    if (Number.isNaN(ms)) continue;
    if (best === null || ms > best) {
      best = ms;
      bestIso = i.createdAt;
    }
  }
  return bestIso;
}

function latestHeadcountEntry(rows: VenueHeadcountResponse[]): {
  count: number;
  createdAt?: string;
} {
  if (!rows.length) return { count: 0 };
  const sorted = [...rows].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
  const last = sorted[sorted.length - 1]!;
  return { count: last.headcount ?? 0, createdAt: last.createdAt };
}

function latestActivityIso(activity: NotificationActivity[]): string | undefined {
  let best: number | null = null;
  let bestIso: string | undefined;
  for (const a of activity) {
    if (!a.createdAt) continue;
    const ms = new Date(a.createdAt).getTime();
    if (Number.isNaN(ms)) continue;
    if (best === null || ms > best) {
      best = ms;
      bestIso = a.createdAt;
    }
  }
  return bestIso;
}

function uniqueFromVenueCount(activity: NotificationActivity[]): number {
  const ids = new Set<string>();
  for (const a of activity) {
    if (a.fromVenueId != null && String(a.fromVenueId) !== '') {
      ids.add(String(a.fromVenueId));
    }
  }
  return ids.size;
}

type ActivityType = 'warning' | 'medical' | 'trespass';

type Activity = {
  type: ActivityType;
  title: string;
  description: string;
  time: string;
  borderColor: string;
  iconColor: string;
};

const activities: Activity[] = [
  {
    type: 'warning',
    title: 'Nearby Report',
    description: 'Two patrons removed for fighting on 12th Street',
    time: '2 min ago',
    borderColor: '#E84868',
    iconColor: '#F07A92',
  },
  {
    type: 'medical',
    title: 'Medical Emergency',
    description: 'Medical emergency reported, 911 called',
    time: '2 min ago',
    borderColor: '#2B36CD',
    iconColor: '#7B8AF8',
  },
  {
    type: 'trespass',
    title: 'Trespass Issued',
    description: 'John Doe issued trespass at NG Downtown',
    time: '2 min ago',
    borderColor: '#DBA940',
    iconColor: '#E8BC5C',
  },
  {
    type: 'trespass',
    title: 'Trespass Issued',
    description: 'John Doe issued trespass at NG Downtown',
    time: '2 min ago',
    borderColor: '#DBA940',
    iconColor: '#E8BC5C',
  },
  {
    type: 'medical',
    title: 'Medical Emergency',
    description: 'Medical emergency reported, 911 called',
    time: '2 min ago',
    borderColor: '#2B36CD',
    iconColor: '#7B8AF8',
  },
];

function ActivityIcon({ type, color }: { type: ActivityType; color: string }) {
  if (type === 'medical') {
    return <Ambulance size={28} color={color} strokeWidth={2} />;
  }
  return <TriangleAlert size={28} color={color} strokeWidth={2} />;
}

export default function HomeScreen() {
  const { firebaseUser } = useAuth();
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [dash, setDash] = useState<HomeDash | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!firebaseUser) {
      setDashLoading(false);
      setDash(null);
      setDashError(null);
      return;
    }
    setDashLoading(true);
    setDashError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const venues = await getVenues(token);
      const firstId = venues[0]?.id;
      if (firstId == null) {
        setDash({ incidents: [], capacity: null, headcounts: [], activity: [] });
        return;
      }
      const venueId = String(firstId);
      const [incidents, capacity, headcounts, activity] = await Promise.all([
        getIncidents(venueId, token),
        getCapacity(venueId, token),
        getHeadcounts(venueId, token),
        getNotificationActivity(venueId, token),
      ]);
      setDash({ incidents, capacity, headcounts, activity });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDashError(msg);
      setDash(null);
    } finally {
      setDashLoading(false);
    }
  }, [firebaseUser]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const activeIncidentsCount = useMemo(
    () =>
      dash ? dash.incidents.filter((i) => String(i.status).toUpperCase() === 'ACTIVE').length : null,
    [dash],
  );
  const totalIncidentsCount = useMemo(() => (dash ? dash.incidents.length : null), [dash]);
  const latestIncidentIsoVal = useMemo(
    () => (dash ? latestIncidentIso(dash.incidents) : undefined),
    [dash],
  );

  const headLatest = useMemo(
    () => (dash ? latestHeadcountEntry(dash.headcounts) : { count: 0 as number, createdAt: undefined as string | undefined }),
    [dash],
  );

  const uniqueVenueSources = useMemo(
    () => (dash ? uniqueFromVenueCount(dash.activity) : 0),
    [dash],
  );
  const latestActivityIsoVal = useMemo(
    () => (dash ? latestActivityIso(dash.activity) : undefined),
    [dash],
  );

  const formatVal = (n: number | null) => {
    if (dashLoading) return '—';
    if (dashError || n === null) return '—';
    return String(n);
  };

  const capacityMax = dash?.capacity?.capacity;
  const capacityFillPct = useMemo(() => {
    if (capacityMax == null || capacityMax <= 0) return null;
    return Math.min(100, Math.max(0, Math.round((headLatest.count / capacityMax) * 100)));
  }, [capacityMax, headLatest.count]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <NewReportModal visible={newReportOpen} onClose={() => setNewReportOpen(false)} />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar with NightGuard logo and "New Report" button */}
          <View style={styles.topRow}>
            <View style={styles.logoRow}>
              <Image
                source={require('@/assets/images/NigtGuardLogo.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Pressable
              onPress={() => setNewReportOpen(true)}
              style={({ pressed }) => [styles.newReportButton, pressed && styles.newReportPressed]}
              accessibilityRole="button"
              accessibilityLabel="New report">
              <Text style={styles.newReportPlus}>＋</Text>
              <Text style={styles.newReportText}>New Report</Text>
            </Pressable>
          </View>

          {/* Tonight's Operations header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Tonight’s Operations</Text>
              {dashLoading ? <ActivityIndicator size="small" color="#8B8B9D" style={styles.sectionSpinner} /> : null}
            </View>
            {dashError ? (
              <View style={styles.dashErrorBar}>
                <Text style={styles.dashErrorText}>{dashError}</Text>
                <Pressable
                  style={({ pressed }) => [styles.dashRetryBtn, pressed && styles.newReportPressed]}
                  onPress={() => void loadDashboard()}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading dashboard">
                  <Text style={styles.dashRetryLabel}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Top stats row */}
          <View style={styles.cardRow}>
            <View style={[styles.statCard, styles.cardActiveIncidents]}>
              <View style={[styles.cardTopBorder, styles.cardTopBorderRed]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>ACTIVE INCIDENTS</Text>
                <Text style={styles.cardSmallMeta}>
                  Last incident {formatRelativeTime(latestIncidentIsoVal)}
                </Text>
                <Text style={styles.cardValue}>{formatVal(activeIncidentsCount)}</Text>
                <Text style={styles.cardDeltaRed}>
                  {totalIncidentsCount !== null ? `${totalIncidentsCount} total tonight` : '—'}
                </Text>
              </View>
              <Image
                source={require('@/assets/images/active-incidents-glow.png')}
                style={styles.cardGlowImageRed}
                contentFit="cover"
              />
            </View>

            <View style={[styles.statCard, styles.cardTotalTonight]}>
              <View style={[styles.cardTopBorder, styles.cardTopBorderAmber]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>TOTAL TONIGHT</Text>
                <Text style={styles.cardSmallMeta}>
                  Last incident {formatRelativeTime(latestIncidentIsoVal)}
                </Text>
                <Text style={styles.cardValue}>{formatVal(totalIncidentsCount)}</Text>
                <Text style={styles.cardDeltaGreen}>
                  {activeIncidentsCount !== null ? `${activeIncidentsCount} active` : '—'}
                </Text>
              </View>
              <Image
                source={require('@/assets/images/total-tonight-glow.png')}
                style={styles.cardGlowImageAmber}
                contentFit="cover"
              />
            </View>
          </View>

          {/* Second stats row */}
          <View style={styles.cardRow}>
            <View style={[styles.statCard, styles.cardCapacity]}>
              <View style={[styles.cardTopBorder, styles.cardTopBorderGreen]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>CURRENT CAPACITY</Text>
                <Text style={styles.cardSmallMeta}>
                  Headcount {formatRelativeTime(headLatest.createdAt)}
                </Text>
                <Text style={styles.cardValue}>
                  {dashLoading ? '—' : dashError ? '—' : String(headLatest.count)}
                </Text>
                {capacityFillPct != null ? (
                  <View style={styles.capacityProgressTrack} accessibilityLabel="Capacity fill">
                    <View style={[styles.capacityProgressFill, { width: `${capacityFillPct}%` }]} />
                  </View>
                ) : null}
                <Text style={styles.cardBodyText}>
                  {dash && dash.capacity?.capacity != null
                    ? `of ${dash.capacity.capacity} Max Capacity`
                    : 'No max capacity set'}
                </Text>
              </View>
              <Image
                source={require('@/assets/images/current-capacity-glow.png')}
                style={styles.cardGlowImageGreen}
                contentFit="cover"
              />
            </View>

            <View style={[styles.statCard, styles.cardNetworkAlerts]}>
              <View style={[styles.cardTopBorder, styles.cardTopBorderBlue]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>NETWORK ALERTS</Text>
                <Text style={styles.cardSmallMeta}>
                  Latest {formatRelativeTime(latestActivityIsoVal)}
                </Text>
                <Text style={styles.cardValue}>
                  {formatVal(dash ? dash.activity.length : null)}
                </Text>
                <Text style={styles.cardBodyText}>
                  {dash && dash.activity.length === 0
                    ? 'No network activity'
                    : `From ${uniqueVenueSources} venues`}
                </Text>
              </View>
              <Image
                source={require('@/assets/images/network-alerts-glow.png')}
                style={styles.cardGlowImageBlue}
                contentFit="cover"
              />
            </View>
          </View>

          {/* Live Activity */}
          <View style={styles.liveActivityContainer}>
            <View style={styles.liveActivityHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Live Activity</Text>
              </View>
              <View style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Filter</Text>
              </View>
            </View>

            <View style={styles.activityList}>
              {activities.map((a, index) => (
                <View
                  key={index}
                  style={[
                    styles.activityItem,
                    { borderLeftColor: a.borderColor },
                  ]}
                >
                  <View style={styles.activityIconWrapperBox}>
                    <ActivityIcon type={a.type} color={a.iconColor} />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeaderRow}>
                      <Text style={styles.activityTitle}>{a.title}</Text>
                      <Text style={styles.activityTime}>{a.time}</Text>
                    </View>
                    <Text style={styles.activityDescription}>{a.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <DashboardBottomNav active="home" onNewReport={() => setNewReportOpen(true)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101018',
  },
  container: {
    flex: 1,
    backgroundColor: '#101018',
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 255,
    height: 51,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#E2E2E2',
  },
  newReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(43, 54, 205, 0.2)',
    borderWidth: 1,
    borderColor: '#2B36CD',
  },
  newReportPlus: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },
  newReportText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  newReportPressed: {
    opacity: 0.88,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionSpinner: {
    marginTop: 2,
  },
  dashErrorBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dashErrorText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#E84868',
  },
  dashRetryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A34',
    backgroundColor: 'rgba(38, 38, 47, 0.48)',
  },
  dashRetryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E2E2E2',
    lineHeight: 32,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#131319',
    borderWidth: 1,
    borderColor: '#2A2A34',
    overflow: 'hidden',
  },
  cardTopBorder: {
    height: 2,
    width: '100%',
  },
  cardTopBorderRed: {
    backgroundColor: '#E84868',
  },
  cardTopBorderAmber: {
    backgroundColor: '#DBA940',
  },
  cardTopBorderGreen: {
    backgroundColor: '#75FB94',
  },
  cardTopBorderBlue: {
    backgroundColor: '#2B36CD',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DDDBDB',
    marginBottom: 4,
  },
  cardSmallMeta: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8B8B9D',
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardDeltaRed: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E84868',
  },
  cardDeltaGreen: {
    fontSize: 12,
    fontWeight: '500',
    color: '#75FB94',
  },
  cardBodyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#838395',
  },
  capacityProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2A34',
    marginBottom: 8,
    overflow: 'hidden',
  },
  capacityProgressFill: {
    height: '100%',
    backgroundColor: '#75FB94',
    borderRadius: 2,
  },
  cardGlow: {
    position: 'absolute',
    width: 112,
    height: 112,
    right: -16,
    bottom: -32,
    borderRadius: 999,
    opacity: 0.55,
  },
  cardGlowRed: {
    backgroundColor: '#E84868',
  },
  cardGlowAmber: {
    backgroundColor: '#DBA940',
  },
  cardGlowGreen: {
    backgroundColor: '#75FB94',
  },
  cardGlowBlue: {
    backgroundColor: '#2B36CD',
  },
  cardGlowImageRed: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
  },
  cardGlowImageAmber: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
  },
  cardGlowImageGreen: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
  },
  cardGlowImageBlue: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
  },
  cardActiveIncidents: {},
  cardTotalTonight: {},
  cardCapacity: {},
  cardNetworkAlerts: {},
  sectionHeaderText: {},
  liveActivityContainer: {
    marginTop: 32,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#2A2A34',
    backgroundColor: '#11111B',
    padding: 16,
  },
  liveActivityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A34',
    backgroundColor: 'rgba(38, 38, 47, 0.48)',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#1B1B26',
    borderLeftWidth: 4,
  },
  activityIconWrapperBox: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1B26',
  },
  activityContent: {
    flex: 1,
    paddingVertical: 4,
    paddingRight: 8,
    justifyContent: 'center',
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activityTime: {
    fontSize: 8,
    fontWeight: '500',
    color: '#8B8B9D',
  },
  activityDescription: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8B8B9D',
  },
});
