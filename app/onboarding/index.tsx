import { CalendarDays, CheckCircle2, Dumbbell, Flag, MapPin, SlidersHorizontal } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";

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

export default function OnboardingScreen() {
  return (
    <Screen>
      <SectionHeader
        title="What are you training for?"
        caption="PacePilot saves onboarding progress to Supabase and builds a conservative first plan from your answers."
      />
      <Card accent="cyan">
        <Pill label="Step 9 / 18" />
        <Text variant="subheading">Demo goal setup</Text>
        <Text muted>
          The production flow collects age range, timezone, units, experience, mileage, recent race results, goal race,
          available days, equipment, caution flags, and coaching tone.
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
      <ActionButton label="Continue" />
    </Screen>
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
  }
});
