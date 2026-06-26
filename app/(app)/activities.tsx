import { Plus, RadioTower, ShieldAlert, Trophy } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { demoActivities } from "@/data/demo";
import { formatKm, formatPace } from "@/lib/format";
import { calculatePersonalBests } from "@/lib/progress/personalBests";
import { canAnalyzeActivityWithAi } from "@/lib/strava/stravaPolicy";
import { createMockGpsActivity } from "@/lib/location/gpsRecorder";
import { colors, spacing } from "@/lib/theme";

export default function ActivitiesScreen() {
  const personalBests = calculatePersonalBests(demoActivities);
  const mockGps = createMockGpsActivity(
    [
      { latitude: 43.6532, longitude: -79.3832, timestamp: "2026-06-23T10:00:00Z" },
      { latitude: 43.654, longitude: -79.382, timestamp: "2026-06-23T10:04:00Z" }
    ],
    480
  );

  return (
    <Screen>
      <SectionHeader title="Activities" caption="PacePilot-native runs can feed insights when you consent. Strava Sync stays isolated." />
      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Manual activity</Text>
          <Plus color={colors.cyan} size={22} />
        </View>
        <Text muted>Save distance, duration, perceived effort, fatigue, notes, and assigned shoes after every run.</Text>
        <ActionButton label="Add manual run" variant="secondary" />
      </Card>
      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">GPS recording MVP</Text>
          <RadioTower color={colors.green} size={22} />
        </View>
        <Text muted>{`Mock mode can save ${mockGps.distanceKm} km with start, pause, resume, finish, route points, effort, fatigue, notes, and shoe assignment.`}</Text>
      </Card>
      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Personal bests</Text>
          <Trophy color={colors.purple} size={22} />
        </View>
        {personalBests.map((best) => (
          <View key={best.label} style={styles.headerRow}>
            <Text muted>{best.label}</Text>
            <Pill label={best.value} tone="purple" />
          </View>
        ))}
      </Card>
      {demoActivities.map((activity) => {
        const aiPolicy = canAnalyzeActivityWithAi(activity);
        return (
          <Card key={activity.id} accent={activity.source === "strava_cache" ? "orange" : "green"}>
            <View style={styles.headerRow}>
              <View style={styles.copy}>
                <Text variant="subheading">{activity.title ?? formatKm(activity.distanceKm)}</Text>
                <Text muted>{`${formatKm(activity.distanceKm)} · ${formatPace(activity.averagePaceSecondsPerKm)}`}</Text>
              </View>
              <Pill label={activity.source.replaceAll("_", " ")} tone={activity.source === "strava_cache" ? "orange" : "green"} />
            </View>
            {!aiPolicy.allowed ? (
              <View style={styles.warning}>
                <ShieldAlert color={colors.orange} size={18} />
                <Text muted>{aiPolicy.reason}</Text>
              </View>
            ) : (
              <Text muted>Allowed for PacePilot insights if the user has opted in.</Text>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  }
});
