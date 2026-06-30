import { Link } from "expo-router";
import { Download, ShieldCheck, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { defaultPrivacyPreferences } from "@/privacy/defaults";
import {
  accountDataControlUnavailableMessage,
  disconnectStrava,
  requestAccountDeletion,
  requestFullDataExport,
  type PrivacyActionResult
} from "@/privacy/dataControls";
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

type BusyAction = "export" | "strava-disconnect" | "strava-clear-cache" | "account-deletion";
type ConfirmableAction = Exclude<BusyAction, "export">;
type Notice = {
  message: string;
  tone: "cyan" | "green" | "orange" | "red";
};

export default function PrivacyScreen() {
  const { configured, loading, session } = useAuth();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmableAction | null>(null);
  const accountControlState = { configured, loading, hasSession: Boolean(session) };
  const unavailableMessage = accountDataControlUnavailableMessage(accountControlState);
  const controlsDisabled = Boolean(unavailableMessage) || Boolean(busyAction);

  async function runPrivacyAction(action: BusyAction, runner: () => Promise<PrivacyActionResult>) {
    setBusyAction(action);
    setNotice(null);

    try {
      const result = await runner();
      setNotice({
        message: result.message,
        tone: result.ok ? "green" : "red"
      });
    } finally {
      setBusyAction(null);
    }
  }

  function runConfirmedAction(
    action: ConfirmableAction,
    confirmationMessage: string,
    runner: () => Promise<PrivacyActionResult>
  ) {
    if (pendingConfirmation !== action) {
      setPendingConfirmation(action);
      setNotice({
        message: confirmationMessage,
        tone: "orange"
      });
      return;
    }

    setPendingConfirmation(null);
    void runPrivacyAction(action, runner);
  }

  return (
    <Screen>
      <SectionHeader title="Privacy Center" caption="Private by default with explicit AI, analytics, export, and deletion controls." />
      <Card accent={unavailableMessage ? "orange" : "green"}>
        <Text variant="subheading">{unavailableMessage ? "Account controls paused" : "Signed-in account controls"}</Text>
        <Text muted>
          {unavailableMessage ??
            `Requests run through authenticated Supabase Edge Functions for ${session?.user.email ?? "your account"}.`}
        </Text>
        {configured && !loading && !session ? (
          <Link href="/sign-in" style={styles.link}>
            Sign in
          </Link>
        ) : null}
      </Card>

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
        <Text muted>Disconnect Strava access from your account. Cached Strava display data can be cleared during disconnect.</Text>
        <View style={styles.buttonRow}>
          <ActionButton
            label={
              busyAction === "strava-disconnect"
                ? "Disconnecting..."
                : pendingConfirmation === "strava-disconnect"
                  ? "Confirm disconnect"
                  : "Disconnect Strava"
            }
            variant="secondary"
            disabled={controlsDisabled}
            style={styles.buttonInRow}
            onPress={() =>
              runConfirmedAction(
                "strava-disconnect",
                "Press Confirm disconnect to revoke Strava access. Cached Strava display data will be left in place.",
                () => disconnectStrava(accountControlState, false)
              )
            }
          />
          <ActionButton
            label={
              busyAction === "strava-clear-cache"
                ? "Clearing..."
                : pendingConfirmation === "strava-clear-cache"
                  ? "Confirm clear cache"
                  : "Disconnect and clear cache"
            }
            variant="secondary"
            disabled={controlsDisabled}
            style={styles.buttonInRow}
            onPress={() =>
              runConfirmedAction(
                "strava-clear-cache",
                "Press Confirm clear cache to revoke Strava access and remove cached Strava activities stored by PacePilot.",
                () => disconnectStrava(accountControlState, true)
              )
            }
          />
        </View>
      </Card>

      <Card accent="purple">
        <View style={styles.headerRow}>
          <Text variant="subheading">Export my data</Text>
          <Download color={colors.purple} size={22} />
        </View>
        <Text muted>Generate the full account export available to PacePilot. Connected-service tokens are redacted.</Text>
        <ActionButton
          label={busyAction === "export" ? "Generating export..." : "Generate full data export"}
          variant="secondary"
          disabled={controlsDisabled}
          onPress={() => void runPrivacyAction("export", () => requestFullDataExport(accountControlState))}
        />
      </Card>

      <Card accent="red">
        <View style={styles.headerRow}>
          <Text variant="subheading">Delete my data</Text>
          <Trash2 color={colors.red} size={22} />
        </View>
        <Text muted>Record an account deletion request for PacePilot-owned data. External services must be managed with that provider.</Text>
        <ActionButton
          label={
            busyAction === "account-deletion"
              ? "Recording request..."
              : pendingConfirmation === "account-deletion"
                ? "Confirm deletion request"
                : "Request account deletion"
          }
          variant="secondary"
          disabled={controlsDisabled}
          onPress={() =>
            runConfirmedAction(
              "account-deletion",
              "Press Confirm deletion request to record a deletion request for your signed-in PacePilot account.",
              () => requestAccountDeletion(accountControlState)
            )
          }
        />
        <Text muted>Requests are recorded for auditability before account data is processed.</Text>
      </Card>
      {notice ? (
        <Card accent={notice.tone}>
          <Text muted>{notice.message}</Text>
        </Card>
      ) : null}
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
    flexWrap: "wrap",
    gap: spacing.sm
  },
  buttonInRow: {
    flexBasis: 210,
    flexGrow: 1
  },
  link: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
