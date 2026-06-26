import { Link } from "expo-router";
import { Cable, Play } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { LogoMark } from "@/components/LogoMark";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <LogoMark size={72} />
        <View style={styles.heroCopy}>
          <Text variant="title">Your smarter running co-pilot</Text>
          <Text muted>
            AI-powered training plans, race strategy, progress tracking, and adaptive coaching built for runners who
            want to improve with confidence.
          </Text>
        </View>
        <Link href="/onboarding" style={[styles.cta, styles.primaryCta]}>
          Create Plan
        </Link>
        <View style={styles.ctaRow}>
          <Link href="/sign-in" style={[styles.cta, styles.secondaryCta]}>
            Sign In
          </Link>
          <Link href="/today" style={[styles.cta, styles.secondaryCta]}>
            Try Demo
          </Link>
        </View>
      </View>

      <Card accent="orange">
        <View style={styles.featureHeader}>
          <Cable color={colors.orange} size={22} />
          <Text variant="subheading">Optional Strava connection</Text>
        </View>
        <Text muted>
          PacePilot can display your connected Strava activities only to you. AI coaching does not use Strava API data.
        </Text>
      </Card>

      <Card accent="cyan">
        <View style={styles.featureHeader}>
          <Play color={colors.cyan} size={22} />
          <Text variant="subheading">Demo training week</Text>
        </View>
        <Text muted>Preview Today, Plan, Activities, Events, Coach, and Profile with safe mock data.</Text>
        <Link href="/today" style={styles.inlineLink}>
          Open demo
        </Link>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 430,
    borderRadius: 10,
    padding: spacing.lg,
    gap: spacing.lg,
    justifyContent: "center",
    backgroundColor: colors.backgroundDeep,
    borderWidth: 1,
    borderColor: colors.border
  },
  heroCopy: {
    gap: spacing.sm
  },
  ctaRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  cta: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlign: "center",
    overflow: "hidden",
    fontSize: 15,
    fontWeight: "800"
  },
  primaryCta: {
    color: colors.text,
    backgroundColor: colors.orange
  },
  secondaryCta: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border
  },
  featureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  inlineLink: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
