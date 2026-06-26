import { Download, ShieldCheck, Trash2 } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { defaultPrivacyPreferences } from "@/privacy/defaults";
import { colors, spacing } from "@/lib/theme";

const dataCategories = [
  "Profile",
  "Onboarding",
  "Training plans",
  "Workouts",
  "Activities",
  "Check-ins",
  "Race goals",
  "Shoes",
  "AI chats",
  "Connected services",
  "Subscription status",
  "Support requests"
];

const toggles = [
  ["AI Coach", defaultPrivacyPreferences.aiCoachEnabled],
  ["AI can use PacePilot activity history", defaultPrivacyPreferences.allowActivityDataForAi],
  ["AI can use check-ins", defaultPrivacyPreferences.allowCheckInsForAi],
  ["AI can use race goals", false],
  ["AI can use chat history", defaultPrivacyPreferences.saveAiChatHistory],
  ["AI can use Garmin data if permitted", false],
  ["Analytics", defaultPrivacyPreferences.analyticsOptIn],
  ["Leaderboard participation", false],
  ["Public profile", !defaultPrivacyPreferences.profilePrivate]
] as const;

const exportControls = ["Request full data export", "Export activities", "Export plans", "Export AI chats", "Export shoes"];
const deleteControls = ["Delete account", "Delete activities only", "Delete AI chat history only", "Delete connected-service cache only", "Delete plans only"];

export default function PrivacyScreen() {
  return (
    <Screen>
      <SectionHeader title="Privacy Center" caption="Private by default with explicit AI, analytics, export, and deletion controls." />
      <Card accent="cyan">
        <View style={styles.headerRow}>
          <Text variant="subheading">Data overview</Text>
          <ShieldCheck color={colors.cyan} size={22} />
        </View>
        <View style={styles.tags}>
          {dataCategories.map((category) => (
            <Pill key={category} label={category} tone="cyan" />
          ))}
        </View>
      </Card>

      <Card accent="green">
        <Text variant="subheading">AI data controls</Text>
        <Text muted>Connected Strava API data is excluded from AI coaching and advanced analytics.</Text>
        {toggles.map(([label, enabled]) => (
          <View key={label} style={styles.row}>
            <Text>{label}</Text>
            <Pill label={enabled ? "On" : "Off"} tone={enabled ? "green" : "orange"} />
          </View>
        ))}
      </Card>

      <Card accent="orange">
        <Text variant="subheading">Connected services data</Text>
        <Text muted>Disconnect services, delete cached connected-service data, and review last-sync/cache-expiry metadata.</Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Disconnect Strava" variant="secondary" />
          <ActionButton label="Delete Strava cache" variant="secondary" />
        </View>
      </Card>

      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Export my data</Text>
          <Download color={colors.purple} size={22} />
        </View>
        {exportControls.map((control) => (
          <ActionButton key={control} label={control} variant="secondary" />
        ))}
      </Card>

      <Card accent="red">
        <View style={styles.headerRow}>
          <Text variant="subheading">Delete my data</Text>
          <Trash2 color={colors.red} size={22} />
        </View>
        {deleteControls.map((control) => (
          <ActionButton key={control} label={control} variant="secondary" />
        ))}
        <Text muted>Production deletion rules require lawyer-reviewed Data Deletion Policy language.</Text>
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
  row: {
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
  }
});
