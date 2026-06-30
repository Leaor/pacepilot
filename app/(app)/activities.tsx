import { Plus, RadioTower, ShieldAlert, Trophy } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { manualActivityPresets, type ManualActivityInput } from "@/account/accountActivities";
import { getAppRouteMode } from "@/account/routeMode";
import { useAccountActivities } from "@/account/useAccountActivities";
import { useAuth } from "@/auth/AuthContext";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { demoActivities } from "@/data/demo";
import type { Activity } from "@/lib/types";
import { formatKm, formatPace } from "@/lib/format";
import { calculatePersonalBests } from "@/lib/progress/personalBests";
import { canAnalyzeActivityWithAi } from "@/lib/strava/stravaPolicy";
import { createMockGpsActivity } from "@/lib/location/gpsRecorder";
import { colors, spacing } from "@/lib/theme";

export default function ActivitiesScreen() {
  const { configured, session } = useAuth();
  const mode = getAppRouteMode({ configured, hasSession: Boolean(session) });

  return mode === "sample" ? <ActivitiesSampleScreen /> : <ActivitiesAccountScreen session={session} />;
}

function ActivitiesAccountScreen({ session }: { session: ReturnType<typeof useAuth>["session"] }) {
  const accountActivities = useAccountActivities(session);
  const [selectedManualActivity, setSelectedManualActivity] = useState<ManualActivityInput>(manualActivityPresets[0].input);
  const personalBests = calculatePersonalBests(accountActivities.activities);

  return (
    <Screen>
      <SectionHeader
        title="Activities"
        caption={accountActivities.activities.length ? "Your saved PacePilot activities." : "No PacePilot-native or connected-service activities are stored for this account yet."}
      />
      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Manual activity</Text>
          <Plus color={colors.cyan} size={22} />
        </View>
        <Text muted>
          Save a basic run to your private account. Manual PacePilot activities can feed insights only when you opt in.
        </Text>
        <View style={styles.optionRow}>
          {manualActivityPresets.map((preset) => (
            <OptionPill
              key={preset.label}
              label={preset.label}
              selected={selectedManualActivity === preset.input}
              onPress={() => setSelectedManualActivity(preset.input)}
            />
          ))}
        </View>
        <ActionButton
          label={accountActivities.saving ? "Saving run..." : "Save manual run"}
          variant="secondary"
          disabled={accountActivities.saving || accountActivities.loading}
          onPress={() => void accountActivities.save(selectedManualActivity)}
        />
        <Text muted>{accountActivities.loading ? "Loading activities." : accountActivities.message}</Text>
      </Card>

      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">Personal bests</Text>
          <Trophy color={colors.green} size={22} />
        </View>
        {personalBests.length ? (
          personalBests.map((best) => (
            <View key={best.label} style={styles.headerRow}>
              <Text muted>{best.label}</Text>
              <Pill label={best.value} tone="green" />
            </View>
          ))
        ) : (
          <Text muted>Personal bests will appear after you record PacePilot-native activities.</Text>
        )}
      </Card>

      <Card accent="orange">
        <View style={styles.headerRow}>
          <Text variant="subheading">Connected activities</Text>
          <ShieldAlert color={colors.orange} size={22} />
        </View>
        <Text muted>
          Strava cache data remains display-only and excluded from AI analysis. Connect services from Profile when you
          are ready.
        </Text>
      </Card>
      {accountActivities.activities.map((activity) => {
        const aiPolicy = canAnalyzeActivityWithAi(activity);
        return (
          <ActivityCard key={activity.id} activity={activity} aiPolicy={aiPolicy} />
        );
      })}
    </Screen>
  );
}

function ActivitiesSampleScreen() {
  const [activities, setActivities] = useState<Activity[]>(demoActivities);
  const [manualRunNotice, setManualRunNotice] = useState<string | null>(null);
  const personalBests = calculatePersonalBests(activities);
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
        <ActionButton
          label="Save sample manual run"
          variant="secondary"
          onPress={() => {
            const savedRun: Activity = {
              id: `manual-preview-${Date.now()}`,
              source: "pacepilot_manual",
              title: "Preview manual run",
              startedAt: new Date().toISOString(),
              distanceKm: 6.4,
              durationSeconds: 2220,
              averagePaceSecondsPerKm: 347,
              perceivedEffort: 4,
              fatigueAfter: 2,
              notes: "Saved from the Expo preview."
            };
            setActivities((current) => [savedRun, ...current]);
            setManualRunNotice("Saved a 6.4 km manual run to this preview list.");
          }}
        />
        {manualRunNotice ? <Text muted>{manualRunNotice}</Text> : null}
      </Card>
      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">GPS recording</Text>
          <RadioTower color={colors.green} size={22} />
        </View>
        <Text muted>{`Sample recording stores ${mockGps.distanceKm} km with route points, effort, fatigue, notes, and shoe assignment.`}</Text>
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
      {activities.map((activity) => {
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

function ActivityCard({
  activity,
  aiPolicy
}: {
  activity: Activity;
  aiPolicy: ReturnType<typeof canAnalyzeActivityWithAi>;
}) {
  return (
    <Card accent={activity.source === "strava_cache" ? "orange" : "green"}>
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
        <Text muted>Allowed for PacePilot insights if you opt in from Privacy Center.</Text>
      )}
    </Card>
  );
}

function OptionPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.optionPill, selected ? styles.optionPillSelected : null]}
    >
      <Text variant="small">{label}</Text>
    </Pressable>
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
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  optionPill: {
    minHeight: 38,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  optionPillSelected: {
    borderColor: colors.cyan,
    backgroundColor: colors.surfaceSoft
  }
});
