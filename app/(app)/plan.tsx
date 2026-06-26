import { CalendarClock, Download, GitBranch, ShieldCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
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
        </View>
        <View style={styles.buttonRow}>
          <ActionButton label="Move" variant="secondary" />
          <ActionButton label="Mark done" variant="secondary" />
          <ActionButton label="Skip safely" variant="secondary" />
        </View>
        <ActionButton label="Start workout" />
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
  }
});
