import { useRouter } from "expo-router";
import { KeyRound } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { colors, spacing } from "@/lib/theme";

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const { loading, session, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleUpdatePassword() {
    if (isSubmitting) {
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords must match.");
      return;
    }

    setIsSubmitting(true);
    const nextMessage = await updatePassword(password);
    setIsSubmitting(false);

    if (nextMessage) {
      setMessage(nextMessage);
      return;
    }

    setMessage("Password updated.");
    router.replace("/today");
  }

  const canSubmit = Boolean(session) && !loading && !isSubmitting;

  return (
    <Screen>
      <SectionHeader title="Set New Password" caption="Create a new password for your PacePilot account." />
      <Card accent={session ? "green" : "orange"}>
        <View style={styles.headerRow}>
          <Text variant="subheading">{session ? "Reset link verified" : "Reset link required"}</Text>
          <KeyRound color={session ? colors.green : colors.orange} size={22} />
        </View>
        {!session && !loading ? (
          <Text muted>Open the latest password reset link before setting a new password.</Text>
        ) : null}
        <TextInput
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          editable={canSubmit}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          textContentType="newPassword"
          value={password}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          editable={canSubmit}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          textContentType="newPassword"
          value={confirmPassword}
        />
        <ActionButton
          label={isSubmitting ? "Updating..." : "Update password"}
          onPress={handleUpdatePassword}
          disabled={!canSubmit}
        />
        {message ? <Text muted>{message}</Text> : null}
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
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16
  }
});
