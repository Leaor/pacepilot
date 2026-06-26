import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { useAuth } from "@/auth/AuthContext";
import { colors, spacing } from "@/lib/theme";

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleReset() {
    setMessage((await resetPassword(email)) ?? "Password reset email requested.");
  }

  return (
    <Screen>
      <SectionHeader title="Reset Password" caption="Request a secure reset link through Supabase Auth." />
      <Card>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={email}
        />
        <ActionButton label="Send reset link" onPress={handleReset} />
        {message ? <Text muted>{message}</Text> : null}
        <Link href="/sign-in" style={styles.link}>
          Back to sign in
        </Link>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16
  },
  link: {
    color: colors.cyan,
    fontSize: 15
  }
});
