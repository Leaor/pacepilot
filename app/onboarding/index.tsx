import { useRouter } from "expo-router";
import { CalendarDays, CheckCircle2, Dumbbell, Flag, MapPin, SlidersHorizontal } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { getAppRouteMode } from "@/account/routeMode";
import { useAuth } from "@/auth/AuthContext";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";
import {
  defaultOnboardingSetupInput,
  saveAccountSetup,
  type OnboardingSetupInput
} from "@/onboarding/accountSetup";

const onboardingSections = [
  {
    title: "Your goal",
    icon: Flag,
    detail: "Marathon, Oct 12, 2026, goal 3:45:00."
  },
  {
    title: "Current running",
    icon: SlidersHorizontal,
    detail: "Intermediate runner, 32 km per week, Sunday long run."
  },
  {
    title: "Training week",
    icon: CalendarDays,
    detail: "Four run days, one strength day, no back-to-back hard workouts."
  },
  {
    title: "Location and units",
    icon: MapPin,
    detail: "America/Toronto, kilometers."
  },
  {
    title: "Strength setup",
    icon: Dumbbell,
    detail: "Dumbbells and mobility work folded into the plan."
  }
];

const goalOptions: Array<{ label: string; value: OnboardingSetupInput["goalDistance"] }> = [
  { label: "10K", value: "10k" },
  { label: "Half marathon", value: "half" },
  { label: "Marathon", value: "marathon" },
  { label: "Maintain", value: "maintain" }
];
const mileageOptions = [15, 25, 35, 50];
const dayOptions = [3, 4, 5, 6];
const experienceOptions: Array<{ label: string; value: OnboardingSetupInput["experienceLevel"] }> = [
  { label: "Casual", value: "casual" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" }
];
const longRunOptions = ["Saturday", "Sunday"];
const strengthOptions: Array<{ label: string; value: OnboardingSetupInput["strengthPreference"] }> = [
  { label: "None", value: "none" },
  { label: "Bodyweight", value: "bodyweight" },
  { label: "Gym", value: "gym" }
];

export default function OnboardingScreen() {
  const { configured, loading, session } = useAuth();
  const mode = getAppRouteMode({ configured, hasSession: Boolean(session) });

  if (configured && loading) {
    return (
      <Screen>
        <SectionHeader title="Plan setup" caption="Checking your account session." />
      </Screen>
    );
  }

  if (mode === "account" && !session) {
    return <SignInRequiredSetup />;
  }

  return mode === "sample" ? <SampleOnboardingScreen /> : <AccountOnboardingScreen />;
}

function SignInRequiredSetup() {
  const router = useRouter();

  return (
    <Screen>
      <SectionHeader title="Plan setup" caption="Sign in before saving a PacePilot plan." />
      <Card accent="orange">
        <Text muted>Account plan setup writes to your private profile, training plan, and workout tables.</Text>
        <ActionButton label="Sign in" onPress={() => router.replace("/sign-in")} />
      </Card>
    </Screen>
  );
}

function AccountOnboardingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [input, setInput] = useState<OnboardingSetupInput>(defaultOnboardingSetupInput);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function createPlan() {
    setIsSaving(true);
    setNotice(null);

    try {
      const result = await saveAccountSetup(session, input);
      setNotice(result.message);
      if (result.ok) {
        router.replace("/today");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen>
      <SectionHeader
        title="Create your starter plan"
        caption="Choose conservative defaults. You can refine the plan after it is saved."
      />
      <Card accent="cyan">
        <Text variant="subheading">Goal</Text>
        <OptionRow
          options={goalOptions}
          selected={input.goalDistance}
          onSelect={(goalDistance) => setInput((current) => ({ ...current, goalDistance }))}
        />
      </Card>

      <Card accent="green">
        <Text variant="subheading">Current running</Text>
        <Text muted>{`${input.currentWeeklyMileageKm} km per week · ${input.trainingDaysPerWeek} run days`}</Text>
        <NumberOptionRow
          options={mileageOptions}
          selected={input.currentWeeklyMileageKm}
          suffix="km"
          onSelect={(currentWeeklyMileageKm) => setInput((current) => ({ ...current, currentWeeklyMileageKm }))}
        />
        <NumberOptionRow
          options={dayOptions}
          selected={input.trainingDaysPerWeek}
          suffix="days"
          onSelect={(trainingDaysPerWeek) => setInput((current) => ({ ...current, trainingDaysPerWeek }))}
        />
      </Card>

      <Card accent="purple">
        <Text variant="subheading">Experience and long run</Text>
        <OptionRow
          options={experienceOptions}
          selected={input.experienceLevel}
          onSelect={(experienceLevel) => setInput((current) => ({ ...current, experienceLevel }))}
        />
        <StringOptionRow
          options={longRunOptions}
          selected={input.preferredLongRunDay}
          onSelect={(preferredLongRunDay) => setInput((current) => ({ ...current, preferredLongRunDay }))}
        />
      </Card>

      <Card accent="orange">
        <Text variant="subheading">Strength and caution</Text>
        <OptionRow
          options={strengthOptions}
          selected={input.strengthPreference}
          onSelect={(strengthPreference) => setInput((current) => ({ ...current, strengthPreference }))}
        />
        <View style={styles.row}>
          <CheckCircle2 color={colors.orange} size={18} />
          <Text muted>Training guidance is educational and not medical advice.</Text>
        </View>
      </Card>

      <ActionButton label={isSaving ? "Saving plan..." : "Create starter plan"} disabled={isSaving} onPress={() => void createPlan()} />
      {notice ? <Text muted>{notice}</Text> : null}
    </Screen>
  );
}

function SampleOnboardingScreen() {
  const router = useRouter();

  return (
    <Screen>
      <SectionHeader
        title="What are you training for?"
        caption="This preview shows the inputs PacePilot uses to build a conservative first plan."
      />
      <Card accent="cyan">
        <Pill label="Step 9 / 18" />
        <Text variant="subheading">Goal setup</Text>
        <Text muted>
          PacePilot collects age range, timezone, units, experience, mileage, recent race results, goal race, available
          days, equipment, caution flags, and coaching tone.
        </Text>
      </Card>
      <Card accent="green">
        {onboardingSections.map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.title} style={styles.row}>
              <Icon color={colors.green} size={18} />
              <View style={styles.copy}>
                <Text>{item.title}</Text>
                <Text muted>{item.detail}</Text>
              </View>
            </View>
          );
        })}
      </Card>
      <Card accent="orange">
        <View style={styles.row}>
          <CheckCircle2 color={colors.orange} size={18} />
          <Text muted>Training guidance is educational and not medical advice.</Text>
        </View>
      </Card>
      <ActionButton label="Continue" onPress={() => router.replace("/today")} />
    </Screen>
  );
}

function OptionRow<Value extends string>({
  options,
  selected,
  onSelect
}: {
  options: Array<{ label: string; value: Value }>;
  selected: Value;
  onSelect: (value: Value) => void;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((option) => (
        <OptionPill
          key={option.value}
          label={option.label}
          selected={selected === option.value}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </View>
  );
}

function StringOptionRow({
  options,
  selected,
  onSelect
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((option) => (
        <OptionPill key={option} label={option} selected={selected === option} onPress={() => onSelect(option)} />
      ))}
    </View>
  );
}

function NumberOptionRow({
  options,
  selected,
  suffix,
  onSelect
}: {
  options: number[];
  selected: number;
  suffix: string;
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((option) => (
        <OptionPill
          key={option}
          label={`${option} ${suffix}`}
          selected={selected === option}
          onPress={() => onSelect(option)}
        />
      ))}
    </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  copy: {
    flex: 1,
    gap: spacing.xs
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
