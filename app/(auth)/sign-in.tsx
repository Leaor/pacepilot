import { Link } from "expo-router";
import { LogIn, Mail } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { ActionButton } from "@/components/ActionButton";
import { Card } from "@/components/Card";
import { LogoMark } from "@/components/LogoMark";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Text } from "@/components/Text";
import { useAuth } from "@/auth/AuthContext";
import { colors, spacing } from "@/lib/theme";

export default function SignInScreen() {
  const { configured, signInWithPassword, signUpWithPassword, sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignIn() {
    setMessage(await signInWithPassword(email, password));
  }

  async function handleSignUp() {
    setMessage(await signUpWithPassword(email, password));
  }

  async function handleMagicLink() {
    setMessage((await sendMagicLink(email)) ?? "Magic link requested.");
  }

  return (
    <Screen>
      <View style={styles.logoRow}>
        <LogoMark size={56} />
      </View>
      <SectionHeader
        title="Welcome back"
        caption="Sign in to keep your streak, saved plans, privacy controls, and coaching history."
      />
      {!configured ? (
        <Card accent="orange">
          <Text variant="subheading">Demo mode</Text>
          <Text muted>
            Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to enable Supabase Auth.
          </Text>
          <Link href="/today" style={styles.link}>
            Continue to demo Today
          </Link>
        </Card>
      ) : null}
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
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <View style={styles.actions}>
          <ActionButton label="Sign in" icon={<LogIn color={colors.background} size={18} />} onPress={handleSignIn} />
          <ActionButton label="Create account" variant="secondary" onPress={handleSignUp} />
          <ActionButton label="Magic link" icon={<Mail color={colors.text} size={18} />} variant="secondary" onPress={handleMagicLink} />
        </View>
        {message ? <Text muted>{message}</Text> : null}
        <Link href="/reset-password" style={styles.link}>
          Reset password
        </Link>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    alignItems: "center"
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16
  },
  actions: {
    gap: spacing.sm
  },
  link: {
    color: colors.cyan,
    fontSize: 15
  }
});
