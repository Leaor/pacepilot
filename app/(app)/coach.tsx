import { Link } from "expo-router";
import { Brain, DatabaseZap, MessagesSquare, RotateCcw, ShieldCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { filterAiContext, summarizeAiDataUse } from "@/ai/dataBoundaries";
import { evaluateAiCoachGate } from "@/ai/gating";
import { getMonthlyAiLimit } from "@/ai/usageLimits";
import { demoActivities, demoCheckIn, demoCoachMemory, demoTier } from "@/data/demo";
import { buildAiContextFromAllowedSources, logAiDataAccess } from "@/lib/ai/aiDataPolicy";
import { buildCoachPrompt } from "@/lib/ai/promptBuilders";
import { defaultPrivacyPreferences } from "@/privacy/defaults";
import { colors, spacing } from "@/lib/theme";

const suggestedPrompts = [
  "Adjust my week",
  "Explain today’s workout",
  "Analyze my last PacePilot run",
  "Am I race ready?",
  "Help me pace my 10K",
  "I missed two runs",
  "Make race checklist",
  "Which shoes am I using most?"
];

const aiEnabledPreferences = {
  ...defaultPrivacyPreferences,
  aiCoachEnabled: true,
  allowActivityDataForAi: true,
  allowCheckInsForAi: true,
  allowProfileForAi: true
};

export default function CoachScreen() {
  const gate = evaluateAiCoachGate(demoTier, aiEnabledPreferences);
  const legacyContext = filterAiContext(
    {
      activities: demoActivities,
      checkIns: [demoCheckIn],
      profile: { goal: "Half marathon", experience: "Intermediate" },
      raceResults: [{ outcome: "terrain_mismatch" }],
      planHistory: [{ version: 4, change: "Load capped" }],
      coachMemory: demoCoachMemory
    },
    aiEnabledPreferences
  );
  const policyContext = buildAiContextFromAllowedSources("demo-user", { activities: demoActivities }, aiEnabledPreferences);
  const prompt = buildCoachPrompt("coach_chat", "I missed two workouts this week. What should I do?", policyContext);
  const accessLog = logAiDataAccess("demo-user", "coach_chat", policyContext.sourcesUsed, policyContext.excludedSources);

  return (
    <Screen>
      <SectionHeader title="PacePilot Coach" caption="Server-side AI coaching through Supabase Edge Functions only." />
      <Card accent={gate.allowed ? "cyan" : "orange"}>
        <View style={styles.headerRow}>
          <Text variant="subheading">AI Coach Gate</Text>
          <Brain color={gate.allowed ? colors.cyan : colors.orange} size={22} />
        </View>
        <Text muted>{gate.allowed ? "Elite entitlement and AI consent are present." : gate.reason}</Text>
      </Card>

      <Card accent="orange">
        <View style={styles.chatBubbleUser}>
          <Text>I missed two workouts this week. What should I do?</Text>
        </View>
        <View style={styles.chatBubbleCoach}>
          <Text>Do not cram them in. I’ll adjust your week safely and protect your long run.</Text>
        </View>
        <View style={styles.buttonRow}>
          <ActionButton label="Regenerate" icon={<RotateCcw color={colors.text} size={16} />} variant="secondary" />
          <ActionButton label="Clear chat" variant="secondary" />
        </View>
      </Card>

      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Suggested prompts</Text>
          <MessagesSquare color={colors.purple} size={22} />
        </View>
        <View style={styles.tags}>
          {suggestedPrompts.map((promptText) => (
            <Pill key={promptText} label={promptText} tone="purple" />
          ))}
        </View>
      </Card>

      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">Data boundary</Text>
          <ShieldCheck color={colors.green} size={22} />
        </View>
        <Text muted>{summarizeAiDataUse(legacyContext)}</Text>
        <Text muted>
          PacePilot AI uses only your PacePilot data and anything you type into chat. Connected Strava API data is not
          used for AI coaching.
        </Text>
      </Card>

      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Audit trail</Text>
          <DatabaseZap color={colors.cyan} size={22} />
        </View>
        <Text muted>{`${prompt.feature} prompt built with ${policyContext.sourcesUsed.length} allowed source groups.`}</Text>
        <Text muted>{`Audit log excludes: ${accessLog.excludedSources.join(", ")}.`}</Text>
        <Text muted>{`Coach chat: ${getMonthlyAiLimit(demoTier, "coach_chat")} monthly requests in mock entitlement.`}</Text>
        <Link href="/privacy" style={styles.link}>
          Manage AI privacy controls
        </Link>
      </Card>
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
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  chatBubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.orange
  },
  chatBubbleCoach: {
    alignSelf: "flex-start",
    maxWidth: "90%",
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border
  },
  link: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
