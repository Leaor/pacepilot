import { Link } from "expo-router";
import { useRouter } from "expo-router";
import { CalendarPlus, Flame, Gauge, Plus, Route, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  planAdherenceFromWorkouts,
  plannedDistanceThisWeek,
  workoutForToday,
  type AccountPlan
} from "@/account/accountPlan";
import { displayNameFromEmail, getAppRouteMode } from "@/account/routeMode";
import { useAccountPlan } from "@/account/useAccountPlan";
import { useAuth } from "@/auth/AuthContext";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { demoActivities, demoCheckIn, demoWorkouts } from "@/data/demo";
import { buildProgressMetrics } from "@/lib/progress/progressMetrics";
import { calculateRaceReadiness } from "@/lib/race/raceReadiness";
import { applyLifeMode } from "@/lib/training/lifeMode";
import { generateTrainingPlan } from "@/lib/training/planGenerator";
import { colors, spacing } from "@/lib/theme";
import {
  calculatePlanConfidence,
  enforceTrainingSafety,
  explainWorkout,
  recommendWorkoutReadiness
} from "@/training/planEngine";

const quickAdds = ["Easy Run", "Tempo", "Intervals", "Hills", "Long Run", "Race", "Recovery", "Strength"];
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

export default function TodayScreen() {
  const { configured, session } = useAuth();
  const mode = getAppRouteMode({ configured, hasSession: Boolean(session) });

  return mode === "sample" ? <TodaySampleScreen /> : <TodayAccountScreen session={session} />;
}

function TodayAccountScreen({ session }: { session: ReturnType<typeof useAuth>["session"] }) {
  const router = useRouter();
  const planState = useAccountPlan(session);
  const email = session?.user.email;
  const displayName = displayNameFromEmail(email);

  if (planState.loading) {
    return (
      <Screen>
        <SectionHeader title={`Good morning, ${displayName}`} caption="Loading your active training plan." />
        <Card accent="cyan">
          <Text muted>Checking your saved PacePilot plan and workouts.</Text>
        </Card>
      </Screen>
    );
  }

  if (!planState.ok) {
    return (
      <Screen>
        <SectionHeader title={`Good morning, ${displayName}`} caption="Your account is signed in." />
        <Card accent="red">
          <Text variant="subheading">Plan unavailable</Text>
          <Text muted>{planState.message}</Text>
        </Card>
      </Screen>
    );
  }

  if (planState.plan) {
    return <TodayAccountPlanScreen displayName={displayName} plan={planState.plan} />;
  }

  return (
    <Screen>
      <SectionHeader title={`Good morning, ${displayName}`} caption="Your account is ready. Create a plan or record a run to populate Today." />
      <Card accent="orange">
        <View style={styles.headerRow}>
          <Text variant="subheading">No workout scheduled</Text>
          <CalendarPlus color={colors.orange} size={22} />
        </View>
        <Text muted>
          PacePilot is not using sample mileage for this signed-in account. Generate a plan from your current training
          context before starting a workout.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="Create plan" icon={<Route color={colors.text} size={18} />} onPress={() => router.push("/onboarding")} />
          <ActionButton label="Record run" icon={<Plus color={colors.text} size={18} />} variant="secondary" onPress={() => router.push("/activities")} />
        </View>
      </Card>

      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">This week</Text>
          <Gauge color={colors.green} size={22} />
        </View>
        <View style={styles.metricGrid}>
          <View style={styles.metricBox}>
            <Text variant="heading">0</Text>
            <Text muted>km logged</Text>
          </View>
          <View style={styles.metricBox}>
            <Text variant="heading">0%</Text>
            <Text muted>Plan adherence</Text>
          </View>
          <View style={styles.metricBox}>
            <Text variant="heading">--</Text>
            <Text muted>Readiness</Text>
          </View>
        </View>
      </Card>

      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Data boundary</Text>
          <ShieldCheck color={colors.cyan} size={22} />
        </View>
        <Text muted>
          Signed-in accounts start empty and private. Connected-service data and AI context stay off until you opt in
          from Privacy Center.
        </Text>
        <Link href="/privacy" style={styles.inlineLink}>
          Review privacy controls
        </Link>
      </Card>

      <Card accent="purple">
        <Text variant="subheading">Quick Add</Text>
        <Text muted>Quick logging will become available after account activity persistence is connected.</Text>
        <View style={styles.quickGrid}>
          {quickAdds.slice(0, 4).map((item) => (
            <Pill key={item} label={item} tone="purple" />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

function TodayAccountPlanScreen({ displayName, plan }: { displayName: string; plan: AccountPlan }) {
  const router = useRouter();
  const workout = workoutForToday(plan.workouts);
  const plannedKm = plannedDistanceThisWeek(plan.workouts);
  const adherence = planAdherenceFromWorkouts(plan.workouts);

  return (
    <Screen>
      <SectionHeader title={`Good morning, ${displayName}`} caption={plan.name} />
      <Card accent={workout?.intensity === "hard" ? "orange" : "green"}>
        <View style={styles.headerRow}>
          <Pill label={workout ? workout.title : "No workout scheduled"} tone={workout?.intensity === "hard" ? "orange" : "green"} />
          <Text muted>{workout?.scheduledDate ?? "Today"}</Text>
        </View>
        <Text variant="title">{workout?.distanceKm ? `${workout.distanceKm} km` : workout?.durationMinutes ? `${workout.durationMinutes} min` : "--"}</Text>
        <Text muted>{workout?.notes ?? "Your active plan has no workout scheduled yet."}</Text>
        <View style={styles.metricRow}>
          {workout?.targetPace ? <Pill label={workout.targetPace} tone="cyan" /> : null}
          {workout ? <Pill label={workout.status.replace("_", " ")} tone="purple" /> : null}
          {workout ? <Pill label={workout.intensity} tone={workout.intensity === "hard" ? "orange" : "green"} /> : null}
        </View>
        <View style={styles.actionRow}>
          <ActionButton label="View plan" icon={<Route color={colors.text} size={18} />} onPress={() => router.push("/plan")} />
          <ActionButton label="Record run" icon={<Plus color={colors.text} size={18} />} variant="secondary" onPress={() => router.push("/activities")} />
        </View>
      </Card>

      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">This week</Text>
          <Gauge color={colors.green} size={22} />
        </View>
        <View style={styles.metricGrid}>
          <View style={styles.metricBox}>
            <Text variant="heading">{plannedKm}</Text>
            <Text muted>km planned</Text>
          </View>
          <View style={styles.metricBox}>
            <Text variant="heading">{adherence}%</Text>
            <Text muted>Plan adherence</Text>
          </View>
          <View style={styles.metricBox}>
            <Text variant="heading">{plan.workouts.length}</Text>
            <Text muted>Workouts</Text>
          </View>
        </View>
      </Card>

      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Data boundary</Text>
          <ShieldCheck color={colors.cyan} size={22} />
        </View>
        <Text muted>Today is based on your saved PacePilot plan. Connected-service data and AI context remain opt-in.</Text>
        <Link href="/privacy" style={styles.inlineLink}>
          Review privacy controls
        </Link>
      </Card>
    </Screen>
  );
}

function TodaySampleScreen() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const generatedPlan = generateTrainingPlan({
    goalDistance: "half",
    raceDate: "2026-10-18",
    currentWeeklyMileageKm: 31,
    trainingDaysPerWeek: 4,
    experienceLevel: "intermediate",
    preferredLongRunDay: "Sunday",
    strengthPreference: "bodyweight",
    startDate: "2026-06-23"
  });
  const todaysWorkout = demoWorkouts[0];
  const confidence = calculatePlanConfidence({
    currentWeeklyMileageKm: 34,
    previousWeeklyMileageKm: 31,
    missedWorkoutsLast14Days: 1,
    completedWorkoutsLast14Days: 7,
    longRunKm: 16,
    targetRaceDistanceKm: 21.1,
    hardWorkoutsThisWeek: 1,
    easyWorkoutsThisWeek: 3,
    latestCheckIn: demoCheckIn
  });
  const readiness = recommendWorkoutReadiness(demoCheckIn, todaysWorkout);
  const safety = enforceTrainingSafety({
    previousWeeklyMileageKm: 31,
    proposedWeeklyMileageKm: 34,
    hardWorkoutsPrevious48Hours: 0,
    latestCheckIn: demoCheckIn,
    weeksUntilRace: 10
  });
  const progress = buildProgressMetrics(demoActivities, demoWorkouts, [demoCheckIn]);
  const raceReadiness = calculateRaceReadiness({
    planAdherencePercent: 94,
    recentLongRunRatio: 0.76,
    weeklyMileageConsistencyPercent: 82,
    fatigue: demoCheckIn.fatigue,
    soreness: demoCheckIn.soreness,
    sleepQuality: 4,
    missedWorkouts: 1,
    paceProgressPercent: 5,
    taperStatus: "not_started",
    daysUntilRace: 117
  });
  const lifeMode = applyLifeMode("tired");

  return (
    <Screen>
      <SectionHeader title="Good morning, Michael" caption="Tuesday, June 23, 2026" />
      <View style={styles.weekSelector}>
        {weekDays.map((day, index) => (
          <View key={`${day}-${index}`} style={[styles.dayDot, index === 2 ? styles.activeDay : null]}>
            <Text variant="small">{day}</Text>
          </View>
        ))}
      </View>

      <Card accent="orange">
        <View style={styles.headerRow}>
          <Pill label="Tempo Run" tone="orange" />
          <Text muted>Today</Text>
        </View>
        <Text variant="title">8.0 km</Text>
        <Text muted>{explainWorkout(todaysWorkout)}</Text>
        <View style={styles.metricRow}>
          <Pill label="4:52-5:04/km" tone="orange" />
          <Pill label="40 min" tone="cyan" />
          <Pill label={readiness.action.replace("_", " ")} tone="green" />
        </View>
        <View style={styles.actionRow}>
          <ActionButton label="Start workout" icon={<Flame color={colors.text} size={18} />} onPress={() => router.push("/activities")} />
          <ActionButton
            label="Quick add"
            icon={<Plus color={colors.text} size={18} />}
            variant="secondary"
            onPress={() => setNotice("Manual run entry is ready from the Activities screen.")}
          />
        </View>
        {notice ? <Text muted>{notice}</Text> : null}
        <Text muted>{readiness.reason}</Text>
      </Card>

      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">This week</Text>
          <Gauge color={colors.green} size={22} />
        </View>
        <View style={styles.metricGrid}>
          <View style={styles.metricBox}>
            <Text variant="heading">{progress.weeklyMileageKm}</Text>
            <Text muted>km logged</Text>
          </View>
          <View style={styles.metricBox}>
            <Text variant="heading">{progress.planAdherencePercent}%</Text>
            <Text muted>Plan adherence</Text>
          </View>
          <View style={styles.metricBox}>
            <Text variant="heading">{raceReadiness.score}</Text>
            <Text muted>Readiness</Text>
          </View>
        </View>
      </Card>

      <Card accent={safety.allowed ? "cyan" : "red"}>
        <View style={styles.headerRow}>
          <Text variant="subheading">Pilot Tip</Text>
          <ShieldCheck color={safety.allowed ? colors.cyan : colors.red} size={22} />
        </View>
        <Text muted>{confidence.summary}</Text>
        <Text muted>{generatedPlan.weeks[0].phase === "base" ? "This is a base week. Keep easy days truly easy." : generatedPlan.disclaimer}</Text>
      </Card>

      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Life Mode</Text>
          <CalendarPlus color={colors.purple} size={22} />
        </View>
        <Text>{lifeMode.title}</Text>
        <Text muted>{lifeMode.explanation}</Text>
      </Card>

      <Card accent="cyan">
        <Text variant="subheading">Quick Add</Text>
        <View style={styles.quickGrid}>
          {quickAdds.map((item) => (
            <Pill key={item} label={item} tone={item === "Tempo" ? "orange" : "cyan"} />
          ))}
        </View>
      </Card>

      <Link href="/coach" style={styles.askCoach}>
        Ask Coach
      </Link>
      <Link href="/activities" style={styles.inlineLink}>
        Record workout
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekSelector: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  activeDay: {
    backgroundColor: colors.orange
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metricGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  askCoach: {
    alignSelf: "flex-end",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cyan,
    fontWeight: "800"
  },
  inlineLink: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
