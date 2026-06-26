import { Link } from "expo-router";
import { Cable, Footprints, LogOut, Shield, UserCog } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { LogoMark } from "@/components/LogoMark";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { useAuth } from "@/auth/AuthContext";
import { demoCoachMemory, demoTier } from "@/data/demo";
import { summarizeShoeMileage } from "@/lib/gear/shoeMileage";
import { getMockGarminStatus } from "@/lib/garmin/garminMock";
import { colors, spacing } from "@/lib/theme";

export default function ProfileScreen() {
  const { configured, session, signOut } = useAuth();
  const shoeSummary = summarizeShoeMileage(
    {
      id: "shoe-demo",
      brand: "PacePilot",
      model: "Daily Trainer",
      nickname: "Orange pair",
      startingDistanceKm: 180,
      retirementDistanceKm: 650,
      retired: false
    },
    [14, 8, 5]
  );
  const garmin = getMockGarminStatus();

  return (
    <Screen>
      <View style={styles.profileHero}>
        <LogoMark size={56} />
        <View style={styles.copy}>
          <Text variant="heading">Michael</Text>
          <Text muted>{configured ? session?.user.email ?? "Not signed in" : "Demo mode without Supabase env vars"}</Text>
        </View>
        <Pill label={demoTier.toUpperCase()} tone="purple" />
      </View>

      <SectionHeader title="Profile" caption="Account, subscription, gear, connected services, privacy, support, and legal controls." />
      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Training settings</Text>
          <UserCog color={colors.cyan} size={22} />
        </View>
        <View style={styles.tags}>
          <Pill label="km" />
          <Pill label="America/Toronto" />
          <Pill label="4 run days" />
          <Pill label="Sunday long run" tone="green" />
        </View>
      </Card>

      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">Gear / Shoes</Text>
          <Footprints color={colors.green} size={22} />
        </View>
        <Text>{`${shoeSummary.currentDistanceKm} km on Orange pair`}</Text>
        <Text muted>{`${shoeSummary.percentUsed}% used · ${shoeSummary.remainingKm} km remaining before retirement target.`}</Text>
        <ActionButton label="Add shoe" variant="secondary" />
      </Card>

      <Card accent="orange">
        <View style={styles.headerRow}>
          <Text variant="subheading">Connected services</Text>
          <Cable color={colors.orange} size={22} />
        </View>
        <Text muted>Strava connection is optional. PacePilot displays connected Strava activities only to you.</Text>
        <Text muted>{`Garmin: ${garmin.mockMode ? "mock mode, future integration" : "connected"}.`}</Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Connect Strava" variant="secondary" />
          <ActionButton label="Connect Garmin" variant="secondary" />
        </View>
      </Card>

      <Card accent="purple">
        <Text variant="subheading">Coach Memory</Text>
        {demoCoachMemory.map((item) => (
          <View key={item.id} style={styles.memoryItem}>
            <Pill label={item.label} tone="purple" />
            <Text muted>{item.value}</Text>
          </View>
        ))}
      </Card>

      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Controls</Text>
          <Shield color={colors.cyan} size={22} />
        </View>
        <Link href="/privacy" style={styles.link}>
          Privacy Center
        </Link>
        <Link href="/paywall" style={styles.link}>
          Manage subscription
        </Link>
        <Link href="/support" style={styles.link}>
          Support
        </Link>
        <Link href="/legal/privacy-policy" style={styles.link}>
          Legal placeholders
        </Link>
      </Card>
      <ActionButton label="Log out" icon={<LogOut color={colors.text} size={18} />} onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  memoryItem: {
    gap: spacing.xs
  },
  link: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
