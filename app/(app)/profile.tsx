import { Link } from "expo-router";
import { Cable, Footprints, LogOut, Shield, UserCog } from "lucide-react-native";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { displayNameFromEmail, getAppRouteMode } from "@/account/routeMode";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { LogoMark } from "@/components/LogoMark";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { useAuth } from "@/auth/AuthContext";
import { demoCoachMemory, demoTier } from "@/data/demo";
import { summarizeShoeMileage, type Shoe } from "@/lib/gear/shoeMileage";
import { getMockGarminStatus } from "@/lib/garmin/garminMock";
import { startStravaConnection } from "@/lib/strava/stravaConnection";
import type { AccountDataControlState } from "@/privacy/dataControls";
import { colors, spacing } from "@/lib/theme";

export default function ProfileScreen() {
  const { configured, loading, session, signOut } = useAuth();
  const mode = getAppRouteMode({ configured, hasSession: Boolean(session) });
  const accountControlState = { configured, loading, hasSession: Boolean(session) };

  return mode === "sample" ? (
    <ProfileSampleScreen />
  ) : (
    <ProfileAccountScreen email={session?.user.email} signOut={signOut} accountControlState={accountControlState} />
  );
}

function ProfileAccountScreen({
  email,
  signOut,
  accountControlState
}: {
  email: string | null | undefined;
  signOut: () => Promise<void>;
  accountControlState: AccountDataControlState;
}) {
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const [busyConnection, setBusyConnection] = useState<"strava" | null>(null);
  const displayName = displayNameFromEmail(email);
  const garmin = getMockGarminStatus();

  async function connectStrava() {
    setBusyConnection("strava");
    setConnectionNotice(null);

    try {
      const result = await startStravaConnection(accountControlState, Linking.openURL);
      setConnectionNotice(result.message);
    } finally {
      setBusyConnection(null);
    }
  }

  return (
    <Screen>
      <View style={styles.profileHero}>
        <LogoMark size={56} />
        <View style={styles.copy}>
          <Text variant="heading">{displayName}</Text>
          <Text muted>{email ?? "Signed-in account"}</Text>
        </View>
        <Pill label="FREE" tone="cyan" />
      </View>

      <SectionHeader title="Profile" caption="Account, subscription, gear, connected services, privacy, support, and legal controls." />
      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Training settings</Text>
          <UserCog color={colors.cyan} size={22} />
        </View>
        <Text muted>
          Complete onboarding to store units, timezone, run days, long-run preference, and race goals for this account.
        </Text>
        <Link href="/onboarding" style={styles.link}>
          Finish setup
        </Link>
      </Card>

      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">Gear / Shoes</Text>
          <Footprints color={colors.green} size={22} />
        </View>
        <Text muted>No shoes are saved for this account yet.</Text>
      </Card>

      <Card accent="orange">
        <View style={styles.headerRow}>
          <Text variant="subheading">Connected services</Text>
          <Cable color={colors.orange} size={22} />
        </View>
        <Text muted>Strava connection is optional. PacePilot displays connected Strava activities only to you.</Text>
        <Text muted>{`Garmin: ${garmin.mockMode ? "available after partner approval" : "connected"}.`}</Text>
        <View style={styles.buttonRow}>
          <ActionButton
            label={busyConnection === "strava" ? "Opening Strava..." : "Connect Strava"}
            variant="secondary"
            disabled={busyConnection === "strava"}
            onPress={() => void connectStrava()}
          />
          <ActionButton
            label="Connect Garmin"
            variant="secondary"
            onPress={() => setConnectionNotice("Garmin connection is available after partner approval.")}
          />
        </View>
        {connectionNotice ? <Text muted>{connectionNotice}</Text> : null}
      </Card>

      <Card accent="purple">
        <Text variant="subheading">Coach Memory</Text>
        <Text muted>No coach memory is saved for this account yet.</Text>
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
          Legal and policies
        </Link>
      </Card>
      <ActionButton label="Log out" icon={<LogOut color={colors.text} size={18} />} onPress={signOut} />
    </Screen>
  );
}

function ProfileSampleScreen() {
  const { configured, session, signOut } = useAuth();
  const [shoes, setShoes] = useState<Shoe[]>([
    {
      id: "shoe-demo",
      brand: "PacePilot",
      model: "Daily Trainer",
      nickname: "Orange pair",
      startingDistanceKm: 180,
      retirementDistanceKm: 650,
      retired: false
    }
  ]);
  const [shoeNotice, setShoeNotice] = useState<string | null>(null);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const shoeSummaries = shoes.map((shoe) => ({
    shoe,
    summary: summarizeShoeMileage(shoe, shoe.id === "shoe-demo" ? [14, 8, 5] : [])
  }));
  const garmin = getMockGarminStatus();

  return (
    <Screen>
      <View style={styles.profileHero}>
        <LogoMark size={56} />
        <View style={styles.copy}>
          <Text variant="heading">Michael</Text>
          <Text muted>{configured ? session?.user.email ?? "Not signed in" : "Sample runner profile"}</Text>
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
        {shoeSummaries.map(({ shoe, summary }) => (
          <View key={shoe.id} style={styles.memoryItem}>
            <Text>{`${summary.currentDistanceKm} km on ${shoe.nickname ?? shoe.model}`}</Text>
            <Text muted>{`${summary.percentUsed}% used · ${summary.remainingKm} km remaining before retirement target.`}</Text>
          </View>
        ))}
        <ActionButton
          label="Add sample shoe"
          variant="secondary"
          onPress={() => {
            if (shoes.some((shoe) => shoe.id === "shoe-preview")) {
              setShoeNotice("Sample tempo shoe is already in this preview.");
              return;
            }

            setShoes((current) => [
              ...current,
              {
                id: "shoe-preview",
                brand: "PacePilot",
                model: "Tempo Trainer",
                nickname: "Race-day pair",
                startingDistanceKm: 42,
                retirementDistanceKm: 500,
                retired: false
              }
            ]);
            setShoeNotice("Added Race-day pair to this preview gear list.");
          }}
        />
        {shoeNotice ? <Text muted>{shoeNotice}</Text> : null}
      </Card>

      <Card accent="orange">
        <View style={styles.headerRow}>
          <Text variant="subheading">Connected services</Text>
          <Cable color={colors.orange} size={22} />
        </View>
        <Text muted>Strava connection is optional. PacePilot displays connected Strava activities only to you.</Text>
        <Text muted>{`Garmin: ${garmin.mockMode ? "available after partner approval" : "connected"}.`}</Text>
        <View style={styles.buttonRow}>
          <ActionButton
            label="Connect Strava"
            variant="secondary"
            onPress={() =>
              setConnectionNotice(
                configured
                  ? "Strava OAuth starts from authenticated Supabase Edge Functions after sign-in."
                  : "Strava OAuth needs Supabase account configuration and a signed-in session."
              )
            }
          />
          <ActionButton
            label="Connect Garmin"
            variant="secondary"
            onPress={() => setConnectionNotice("Garmin connection is available after partner approval.")}
          />
        </View>
        {connectionNotice ? <Text muted>{connectionNotice}</Text> : null}
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
          Legal and policies
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
