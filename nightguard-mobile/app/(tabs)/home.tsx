import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ambulance, Home, Settings, ShieldAlert, TriangleAlert, User } from 'lucide-react-native';

import { NewReportModal } from '@/components/new-report/NewReportModal';

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
  const router = useRouter();
  const [newReportOpen, setNewReportOpen] = useState(false);

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
            <Text style={styles.sectionTitle}>Tonight’s Operations</Text>
            <Text style={styles.sectionSubtitle}>Last updated 30s ago</Text>
          </View>

          {/* Top stats row */}
          <View style={styles.cardRow}>
            <View style={[styles.statCard, styles.cardActiveIncidents]}>
              <View style={[styles.cardTopBorder, styles.cardTopBorderRed]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>ACTIVE INCIDENTS</Text>
                <Text style={styles.cardSmallMeta}>Last report 2 mins ago</Text>
                <Text style={styles.cardValue}>2</Text>
                <Text style={styles.cardDeltaRed}>↑ 2 from Last Hour</Text>
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
                <Text style={styles.cardSmallMeta}>Last report 2 mins ago</Text>
                <Text style={styles.cardValue}>2</Text>
                <Text style={styles.cardDeltaGreen}>↑ 2% vs Last Friday</Text>
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
                <Text style={styles.cardSmallMeta}>Last reported 1 min ago</Text>
                <Text style={styles.cardValue}>247</Text>
                <Text style={styles.cardBodyText}>of 300 Max Capacity</Text>
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
                <Text style={styles.cardSmallMeta}>Last report 2 mins ago</Text>
                <Text style={styles.cardValue}>13</Text>
                <Text style={styles.cardBodyText}>From 4 Venues</Text>
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
                <Text style={styles.sectionSubtitle}>Last updated 30s ago</Text>
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

        {/* Bottom navigation */}
        <View style={styles.bottomNav}>
          <View style={styles.bottomNavIconWrapper}>
            <Home color="#9D9FCF" size={22} />
          </View>
          <View style={styles.bottomNavIconWrapper}>
            <ShieldAlert color="#FFFFFF" size={22} />
          </View>

          {/* Center "+" button */}
          <View style={styles.bottomNavIconWrapper}>
            <Pressable
              onPress={() => setNewReportOpen(true)}
              style={({ pressed }) => [styles.bottomCenterButton, pressed && styles.newReportPressed]}
              accessibilityRole="button"
              accessibilityLabel="New report">
              <Text style={styles.bottomCenterPlus}>＋</Text>
            </Pressable>
          </View>

          <View style={styles.bottomNavIconWrapper}>
            <User color="#FFFFFF" size={22} />
          </View>
          <View style={styles.bottomNavIconWrapper}>
            <Pressable
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [pressed && styles.bottomNavPressed]}
              accessibilityRole="button"
              accessibilityLabel="Settings">
              <Settings color="#FFFFFF" size={22} />
            </Pressable>
          </View>
        </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E2E2E2',
    lineHeight: 32,
  },
  sectionSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8B8B9D',
    lineHeight: 18,
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
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: '#11111B',
    borderTopWidth: 1,
    borderTopColor: '#2A2A34',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  bottomNavIconWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  bottomNavPressed: {
    opacity: 0.75,
  },
  bottomNavIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  bottomNavIconActive: {
    color: '#9D9FCF',
    fontSize: 20,
    fontWeight: '700',
  },
  bottomCenterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(43, 54, 205, 0.2)',
    borderWidth: 1,
    borderColor: '#2B36CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCenterPlus: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
});
