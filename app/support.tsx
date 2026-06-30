import { Mail, MessageCircleQuestion } from "lucide-react-native";
import { useState } from "react";
import { Linking, StyleSheet, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";
import {
  submitSupportRequest,
  supportRequestUnavailableMessage,
  supportTopics,
  type SupportRequestResult,
  type SupportTopic
} from "@/support/supportRequests";

type Notice = {
  message: string;
  tone: "green" | "orange" | "red";
};

export default function SupportScreen() {
  const { configured, loading, session } = useAuth();
  const [topic, setTopic] = useState<SupportTopic>("Training plan questions");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const supportState = {
    configured,
    loading,
    hasSession: Boolean(session),
    userId: session?.user.id
  };
  const unavailableMessage = supportRequestUnavailableMessage(supportState);

  async function runSupportRequest() {
    if (submitting) return;
    setSubmitting(true);
    setNotice(null);

    try {
      const result: SupportRequestResult = await submitSupportRequest(supportState, { topic, message });
      setNotice({
        message: result.message,
        tone: result.ok ? "green" : "red"
      });
      if (result.ok) {
        setMessage("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function openEmailFallback() {
    const subject = encodeURIComponent(`PacePilot support: ${topic}`);
    const body = encodeURIComponent(message.trim());
    void Linking.openURL(`mailto:support@pacepilot.app?subject=${subject}&body=${body}`);
  }

  return (
    <Screen>
      <SectionHeader title="Support" caption="Help with subscriptions, training, privacy, AI Coach, and race data." />
      <Card accent={unavailableMessage ? "orange" : "cyan"}>
        <View style={styles.headerRow}>
          <Text variant="subheading">{unavailableMessage ? "Account support paused" : "Account support"}</Text>
          <MessageCircleQuestion color={colors.cyan} size={22} />
        </View>
        <Text muted>
          {unavailableMessage ??
            `Requests are saved to your PacePilot account${session?.user.email ? ` (${session.user.email})` : ""}.`}
        </Text>
        {configured && !loading && !session ? (
          <Link href="/sign-in" style={styles.link}>
            Sign in
          </Link>
        ) : null}
      </Card>

      <Card accent="green">
        <View style={styles.headerRow}>
          <Text variant="subheading">New request</Text>
          <Mail color={colors.green} size={22} />
        </View>
        <View style={styles.topicGrid}>
          {supportTopics.map((item) => (
            <ActionButton
              key={item}
              label={item}
              variant={item === topic ? "primary" : "secondary"}
              style={styles.topicButton}
              onPress={() => setTopic(item)}
            />
          ))}
        </View>
        <TextInput
          multiline
          onChangeText={setMessage}
          placeholder="Describe what happened, what you expected, and any device or account detail that helps."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlignVertical="top"
          value={message}
        />
        <View style={styles.buttonRow}>
          <ActionButton
            label={submitting ? "Submitting..." : "Submit request"}
            disabled={Boolean(unavailableMessage) || submitting}
            style={styles.buttonInRow}
            onPress={() => void runSupportRequest()}
          />
          <ActionButton
            label="Email support"
            variant="secondary"
            style={styles.buttonInRow}
            onPress={openEmailFallback}
          />
        </View>
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
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  topicButton: {
    flexGrow: 1,
    flexBasis: 180
  },
  input: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    lineHeight: 22
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  buttonInRow: {
    flexBasis: 180,
    flexGrow: 1
  },
  link: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: "700"
  }
});
