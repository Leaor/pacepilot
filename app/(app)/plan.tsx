import { Link } from "expo-router";
import { CalendarClock, Download, GitBranch, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  planAdherenceFromWorkouts,
  plannedDistanceThisWeek,
  type AccountPlan
} from "@/account/accountPlan";
import { getAppRouteMode } from "@/account/routeMode";
import { useAccountPlan } from "@/account/useAccountPlan";
import { useAuth } from "@/auth/AuthContext";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { demoCheckIn } from "@/data/demo";
import { exportTrainingPlanToIcs } from "@/lib/calendar/icsExport";
import { inspectTrainingCalendar } from "@/lib/calendar/trainingCalendarIntelligence";
import { createAudioCoachSession } from "@/lib/audio/audioCoach";
import { suggestAdaptivePlanChange } from "@/lib/training/adaptivePlan";
import { applyLifeMode } from "@/lib/training/lifeMode";
import { generateTrainingPlan } from "@/lib/training/planGenerator";
import { colors, spacing } from "@/lib/theme";

export default function PlanScreen() {
  const { configured, session } = useAuth();
  const mode = getAppRouteMode({ configured, hasSession: Boolean(session) });

  return mode === "sample" ? <PlanSampleScreen /> : <PlanAccountScreen session={session} />;
}

function PlanAccountScreen({ session }: { session: ReturnType<typeof useAuth>["session"] }) {
  const planState = useAccountPlan(session);

  if (planState.loading) {
    return (
      <Screen>
        <SectionHeader title="Plan" caption="Loading your active training plan." />
        <Card accent="cyan">
          <Text muted>Checking your saved PacePilot plan and workouts.</Text>
        </Card>
      </Screen>
    );
  }

  if (!planState.ok) {
    return (
      <Screen>
        <SectionHeader title="Plan" caption="Your account is signed in." />
        <Card accent="red">
          <Text variant="subheading">Plan unavailable</Text>
          <Text muted>{planState.message}</Text>
        </Card>
      </Screen>
    );
  }

  if (planState.plan) {
    return <AccountPlanDetail plan={planState.plan} />;
  }

  return (
    <Screen>
      <SectionHeader title="Plan" caption="No active training plan is stored for this account yet." />
      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Create your first plan</Text>
          <GitBranch color={colors.purple} size={22} />
        </View>
        <Text muted>
          Authenticated accounts do not borrow the sample half-marathon plan. Build a plan from your current mileage,
          race date, run days, and long-run preference.
        </Text>
        <Link href="/onboarding" style={styles.link}>
          Start plan setup
        </Link>
      </Card>

      <Card accent="green">
        <Text variant="subheading">Safe defaults</Text>
        <Text muted>
          Until a plan exists, PacePilot will not show synthetic workouts, export a fake calendar, or mark preview
          sessions as completed for this account.
        </Text>
      </Card>

      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Calendar export</Text>
          <Download color={colors.cyan} size={22} />
        </View>
        <Text muted>Create a plan before exporting workouts to a calendar file.</Text>
      </Card>
    </Screen>
  );
}

function AccountPlanDetail({ plan }: { plan: AccountPlan }) {
  const plannedKm = plannedDistanceThisWeek(plan.workouts);
  const adherence = planAdherenceFromWorkouts(plan.workouts);
  const visibleWorkouts = plan.workouts.slice(0, 14);

  return (
    <Screen>
      <SectionHeader title="Plan" caption={`${plan.name}${plan.raceDate ? ` · race date ${plan.raceDate}` : ""}`} />
      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Current plan overview</Text>
          <GitBranch color={colors.purple} size={22} />
        </View>
        <View style={styles.metricRow}>
          <Pill label={`${plan.workouts.length} workouts`} tone="purple" />
          <Pill label={`${plannedKm} km this week`} tone="cyan" />
          <Pill label={`${adherence}% adherence`} tone="green" />
        </View>
        <Text muted>Loaded from your signed-in PacePilot account.</Text>
      </Card>

      {visibleWorkouts.map((workout) => (
        <Card key={workout.id} accent={workout.workoutType === "long" ? "purple" : workout.intensity === "hard" ? "orange" : "green"}>
          <View style={styles.headerRow}>
            <View style={styles.copy}>
              <Text variant="subheading">{workout.title}</Text>
              <Text muted>{workout.scheduledDate}</Text>
            </View>
            <CalendarClock color={colors.textMuted} size={20} />
          </View>
          <Text muted>{workout.notes ?? workout.purpose ?? "Follow the saved plan guidance."}</Text>
          <View style={styles.metricRow}>
            {workout.distanceKm ? <Pill label={`${workout.distanceKm} km`} /> : null}
            {workout.durationMinutes ? <Pill label={`${workout.durationMinutes} min`} tone="cyan" /> : null}
            {workout.targetPace ? <Pill label={workout.targetPace} tone="cyan" /> : null}
            <Pill label={workout.status.replace("_", " ")} tone={workout.status === "completed" ? "green" : "purple"} />
          </View>
        </Card>
      ))}

      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Calendar export</Text>
          <Download color={colors.cyan} size={22} />
        </View>
        <Text muted>Calendar export for account plans will use these saved workouts once export persistence is connected.</Text>
      </Card>
    </Screen>
  );
}

function PlanSampleScreen() {
  const [workoutStatus, setWorkoutStatus] = useState("planned");
  const [notice, setNotice] = useState<string | null>(null);
  const plan = generateTrainingPlan({
    goalDistance: "half",
    raceDate: "2026-10-18",
    currentWeeklyMileageKm: 31,
    trainingDaysPerWeek: 4,
    experienceLevel: "intermediate",
    preferredLongRunDay: "Sunday",
    strengthPreference: "bodyweight",
    startDate: "2026-06-23"
  });
  const thisWeek = plan.weeks[0];
  const calendarIssues = inspectTrainingCalendar(thisWeek.workouts, 31);
  const keyWorkout = thisWeek.workouts.find((workout) => workout.intensity === "hard") ?? thisWeek.workouts[0];
  const adaptation = suggestAdaptivePlanChange({
    workout: keyWorkout,
    nextWorkout: thisWeek.workouts[1],
    latestCheckIn: { ...demoCheckIn, fatigue: 4 }
  });
  const lifeMode = applyLifeMode("move_long_run");
  const ics = exportTrainingPlanToIcs(thisWeek.workouts);
  const audioCues = createAudioCoachSession(keyWorkout, {
    enabled: true,
    voiceStyle: "calm",
    cueFrequency: "normal",
    paceAlerts: true,
    distanceAlerts: true,
    intervalCountdowns: true,
    racePaceAlerts: true
  });

  return (
    <Screen>
      <SectionHeader title="Plan" caption={`${plan.title} · ${plan.startDate} to ${plan.endDate}`} />
      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Current plan overview</Text>
          <GitBranch color={colors.purple} size={22} />
        </View>
        <View style={styles.metricRow}>
          <Pill label={`${plan.weeks.length} weeks`} tone="purple" />
          <Pill label={`${thisWeek.mileageKm} km this week`} tone="cyan" />
          <Pill label={thisWeek.phase} tone="orange" />
        </View>
        <Text muted>{plan.disclaimer}</Text>
      </Card>

      {thisWeek.workouts.map((workout) => (
        <Card key={workout.id} accent={workout.type === "long" ? "purple" : workout.intensity === "hard" ? "orange" : "green"}>
          <View style={styles.headerRow}>
            <View style={styles.copy}>
              <Text variant="subheading">{workout.title}</Text>
              <Text muted>{`${workout.day} · ${workout.date}`}</Text>
            </View>
            <CalendarClock color={colors.textMuted} size={20} />
          </View>
          <Text muted>{workout.notes}</Text>
          <View style={styles.metricRow}>
            {workout.distanceKm ? <Pill label={`${workout.distanceKm} km`} /> : null}
            {workout.targetPace ? <Pill label={workout.targetPace} tone="cyan" /> : null}
            <Pill label={workout.intensity} tone={workout.intensity === "hard" ? "orange" : "green"} />
          </View>
        </Card>
      ))}

      <Card accent="orange">
        <View style={styles.headerRow}>
          <Text variant="subheading">Workout detail</Text>
          <ShieldCheck color={colors.orange} size={22} />
        </View>
        <Text>{keyWorkout.title}</Text>
        <Text muted>{keyWorkout.notes}</Text>
        <View style={styles.metricRow}>
          <Pill label="Audio Coach on" tone="orange" />
          <Pill label={`${audioCues.length} cues`} tone="cyan" />
          <Pill label={workoutStatus.replace("_", " ")} tone={workoutStatus === "completed" ? "green" : workoutStatus === "skipped" ? "orange" : "cyan"} />
        </View>
        <View style={styles.buttonRow}>
          <ActionButton label="Move" variant="secondary" onPress={() => setNotice(lifeMode.explanation)} />
          <ActionButton
            label="Mark done"
            variant="secondary"
            onPress={() => {
              setWorkoutStatus("completed");
              setNotice("Workout marked complete in this preview.");
            }}
          />
          <ActionButton
            label="Skip safely"
            variant="secondary"
            onPress={() => {
              setWorkoutStatus("skipped");
              setNotice(adaptation.explanation);
            }}
          />
        </View>
        <ActionButton label="Start workout" onPress={() => setNotice(`${audioCues.length} audio cues are ready for this workout preview.`)} />
        {notice ? <Text muted>{notice}</Text> : null}
      </Card>

      <Card accent="green">
        <Text variant="subheading">Smart adjustment</Text>
        <Text>{adaptation.title}</Text>
        <Text muted>{adaptation.explanation}</Text>
        <Text>{lifeMode.title}</Text>
        <Text muted>{lifeMode.explanation}</Text>
      </Card>

      <Card accent={calendarIssues.length ? "yellow" : "cyan"}>
        <View style={styles.headerRow}>
          <Text variant="subheading">Calendar export</Text>
          <Download color={calendarIssues.length ? colors.yellow : colors.cyan} size={22} />
        </View>
        <Text muted>
          {calendarIssues.length ? calendarIssues[0].message : "No overloaded-week or back-to-back hard-day issues detected."}
        </Text>
        <Text muted>{`${ics.length} characters ready for .ics export in America/Toronto.`}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  link: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
