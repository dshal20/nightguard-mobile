import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Home, Settings, ShieldAlert, User } from 'lucide-react-native';

const ACTIVE = '#9D9FCF';
const INACTIVE = '#FFFFFF';

export type DashboardBottomNavActive = 'home' | 'incidents' | 'offenders';

type Props = {
  active: DashboardBottomNavActive;
  onNewReport: () => void;
};

/**
 * Primary app chrome: five taps, no system tab bar behind them.
 * Left icon = dashboard (`/home`).
 */
export function DashboardBottomNav({ active, onNewReport }: Props) {
  const router = useRouter();
  /** Parent screens use `SafeAreaView`, so the bar is already above the home indicator — do not add inset again or icons sit too high. */
  return (
    <View style={styles.wrap}>
      <View style={styles.iconRow}>
        <View style={styles.slot}>
          <Pressable
            onPress={() => router.push('/home')}
            style={({ pressed }) => [styles.slotHit, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Dashboard home">
            <Home color={active === 'home' ? ACTIVE : INACTIVE} size={22} />
          </Pressable>
        </View>
        <View style={styles.slot}>
          <Pressable
            onPress={() => router.push('/incidents')}
            style={({ pressed }) => [styles.slotHit, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Incidents">
            <ShieldAlert color={active === 'incidents' ? ACTIVE : INACTIVE} size={22} />
          </Pressable>
        </View>
        <View style={styles.slot}>
          <Pressable
            onPress={onNewReport}
            style={({ pressed }) => [styles.centerButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="New report">
            <Text style={styles.centerPlus}>＋</Text>
          </Pressable>
        </View>
        <View style={styles.slot}>
          <Pressable
            onPress={() => router.push('/offenders')}
            style={({ pressed }) => [styles.slotHit, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Offenders">
            <User color={active === 'offenders' ? ACTIVE : INACTIVE} size={22} />
          </Pressable>
        </View>
        <View style={styles.slot}>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.slotHit, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Settings">
            <Settings color={INACTIVE} size={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 80,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 10,
    backgroundColor: '#11111B',
    borderTopWidth: 1,
    borderTopColor: '#2A2A34',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /** Equal fifths so spacing between icons is even; center each control in its column. */
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  slotHit: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.75,
  },
  centerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(43, 54, 205, 0.2)',
    borderWidth: 1,
    borderColor: '#2B36CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlus: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
});
