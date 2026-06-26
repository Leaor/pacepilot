import { Link } from "expo-router";
import { CalendarPlus, Flame, Gauge, Plus, Route, ShieldCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
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
          <ActionButton label="Start workout" icon={<Flame color={colors.text} size={18} />} />
          <ActionButton label="" icon={<Plus color={colors.text} size={18} />} variant="secondary" />
        </View>
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
